const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Загружаем словарь из JSON файла
let vocabulary = [];
try {
  const vocabPath = path.join(__dirname, 'vocabulary.json');
  vocabulary = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));
  console.log(`Loaded ${vocabulary.length} words`);
} catch (error) {
  console.error('Error loading vocabulary:', error);
  // Fallback на минимальный словарь
  vocabulary = [
    { word: 'hello', translation: 'привет' },
    { word: 'world', translation: 'мир' }
  ];
}

// User sessions - глобальная переменная для сохранения между вызовами
const userSessions = new Map();

// Переиспользуемые сообщения
const MESSAGES = {
  start: `👋 Привіт! Я бот для вивчення англійської мови.\n\n📚 База: ${vocabulary.length} слів\n\nОбери дію з меню нижче:`,
  help: '📚 Як користуватися ботом:\n\n📖 Випадкове слово - Дізнайся нове англійське слово з перекладом\n🎯 Квіз - Перевір свої знання в короткому квізі (5 питань)\n\nВивчай англійську щодня! 🚀'
};

// Постоянная клавиатура (reply keyboard)
const MAIN_KEYBOARD = {
  keyboard: [
    [
      { text: '📖 Випадкове слово' },
      { text: '🎯 Квіз' }
    ],
    [
      { text: '📊 Статистика' },
      { text: 'ℹ️ Допомога' }
    ]
  ],
  resize_keyboard: true,
  persistent: true
};

// Клавиатура выбора направления квиза
const QUIZ_DIRECTION_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '🇬🇧 → 🇺🇦 Англійська → Українська', callback_data: 'quiz_dir_en_ua' }
    ],
    [
      { text: '🇺🇦 → 🇬🇧 Українська → Англійська', callback_data: 'quiz_dir_ua_en' }
    ]
  ]
};

// Клавиатура выбора количества вопросов в квизе
const QUIZ_SIZE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '5 питань', callback_data: 'quiz_size_5' },
      { text: '10 питань', callback_data: 'quiz_size_10' }
    ],
    [
      { text: '20 питань', callback_data: 'quiz_size_20' }
    ]
  ]
};

// Инлайн клавиатура для слов (переиспользуется)
const WORD_KEYBOARD = {
  inline_keyboard: [[
    { text: 'Ще слово 🔄', callback_data: 'next_word' }
  ]]
};

// Инициализация бота один раз (переиспользуется между вызовами)
let bot;
function getBot() {
  if (!bot) {
    bot = new Telegraf(process.env.BOT_TOKEN);
    setupHandlers(bot);
  }
  return bot;
}

// Быстрая функция для случайного элемента
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Быстрая функция для перемешивания массива (Fisher-Yates)
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Быстрая функция для получения случайных неправильных ответов
function getWrongAnswers(correctWord, count = 3) {
  const wrongAnswers = [];
  const vocabLength = vocabulary.length;
  const used = new Set([correctWord]);

  while (wrongAnswers.length < count && wrongAnswers.length < vocabLength - 1) {
    const randomIndex = Math.floor(Math.random() * vocabLength);
    const word = vocabulary[randomIndex].word;

    if (!used.has(word)) {
      used.add(word);
      wrongAnswers.push(vocabulary[randomIndex].translation);
    }
  }

  return wrongAnswers;
}

// Быстрая функция для получения случайных неправильных английских ответов (для обратного квиза)
function getWrongAnswersReverse(correctWord, count = 3) {
  const wrongAnswers = [];
  const vocabLength = vocabulary.length;
  const used = new Set([correctWord]);

  while (wrongAnswers.length < count && wrongAnswers.length < vocabLength - 1) {
    const randomIndex = Math.floor(Math.random() * vocabLength);
    const word = vocabulary[randomIndex].word;

    if (!used.has(word)) {
      used.add(word);
      wrongAnswers.push(vocabulary[randomIndex].word);  // Возвращаем английское слово
    }
  }

  return wrongAnswers;
}

// Функция для форматирования сообщения со словом
function formatWordMessage(word, userId) {
  const stats = getUserStats(userId);
  const progress = `📚 Вивчено: ${stats.wordsLearned.size}/1021`;
  const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';
  return `📖 Слово:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`;
}

// Функция для получения/инициализации статистики пользователя
function getUserStats(userId) {
  let session = userSessions.get(userId);

  if (!session) {
    session = {
      stats: {
        wordsLearned: new Set(),
        quizzesTaken: 0,
        quizScores: [],
        lastActiveDate: null,
        streak: 0
      }
    };
    userSessions.set(userId, session);
  }

  if (!session.stats) {
    session.stats = {
      wordsLearned: new Set(),
      quizzesTaken: 0,
      quizScores: [],
      lastActiveDate: null,
      streak: 0
    };
  }

  return session.stats;
}

// Функция для обновления streak (серии дней)
function updateStreak(userId) {
  const stats = getUserStats(userId);
  const today = new Date().toISOString().split('T')[0];

  if (stats.lastActiveDate === today) {
    return; // Уже активен сегодня
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (stats.lastActiveDate === yesterdayStr) {
    stats.streak++; // Продолжаем серию
  } else if (stats.lastActiveDate !== today) {
    stats.streak = 1; // Начинаем новую серию
  }

  stats.lastActiveDate = today;
}

function setupHandlers(bot) {

  // Commands - используем прямые ответы без лишних конкатенаций
  bot.command('start', (ctx) => ctx.reply(MESSAGES.start, { reply_markup: MAIN_KEYBOARD }));
  bot.command('help', (ctx) => ctx.reply(MESSAGES.help, { reply_markup: MAIN_KEYBOARD }));

  bot.command('word', (ctx) => {
    const userId = ctx.from.id;
    const word = getRandomItem(vocabulary);

    // Обновляем статистику
    const stats = getUserStats(userId);
    stats.wordsLearned.add(word.word);
    updateStreak(userId);

    return ctx.reply(formatWordMessage(word, userId), {
      parse_mode: 'Markdown',
      reply_markup: WORD_KEYBOARD
    });
  });

  bot.command('quiz', (ctx) => {
    return ctx.reply(
      '🎯 Оберіть напрямок квізу:',
      { reply_markup: QUIZ_DIRECTION_KEYBOARD }
    );
  });

  bot.command('stats', (ctx) => {
    const userId = ctx.from.id;
    const stats = getUserStats(userId);

    const avgScore = stats.quizScores.length > 0
      ? (stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length).toFixed(1)
      : 0;

    return ctx.reply(
      `📊 Твоя статистика:\n\n` +
      `📚 Вивчено слів: ${stats.wordsLearned.size}/1021\n` +
      `🎯 Пройдено квізів: ${stats.quizzesTaken}\n` +
      `⭐ Середній результат: ${avgScore}/5\n` +
      `🔥 Серія днів: ${stats.streak}`,
      { reply_markup: MAIN_KEYBOARD }
    );
  });

  // Обработка текстовых сообщений с кнопок клавиатуры
  bot.on('text', (ctx) => {
    const text = ctx.message.text;

    if (text === '📖 Випадкове слово') {
      const userId = ctx.from.id;
      const word = getRandomItem(vocabulary);

      // Обновляем статистику
      const stats = getUserStats(userId);
      stats.wordsLearned.add(word.word);
      updateStreak(userId);

      return ctx.reply(formatWordMessage(word, userId), {
        parse_mode: 'Markdown',
        reply_markup: WORD_KEYBOARD
      });
    }

    if (text === '🎯 Квіз') {
      return ctx.reply(
        '🎯 Оберіть напрямок квізу:',
        { reply_markup: QUIZ_DIRECTION_KEYBOARD }
      );
    }

    if (text === '📊 Статистика') {
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      const avgScore = stats.quizScores.length > 0
        ? (stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length).toFixed(1)
        : 0;

      return ctx.reply(
        `📊 Твоя статистика:\n\n` +
        `📚 Вивчено слів: ${stats.wordsLearned.size}/1021\n` +
        `🎯 Пройдено квізів: ${stats.quizzesTaken}\n` +
        `⭐ Середній результат: ${avgScore}/5\n` +
        `🔥 Серія днів: ${stats.streak}`,
        { reply_markup: MAIN_KEYBOARD }
      );
    }

    if (text === 'ℹ️ Допомога') {
      return ctx.reply(MESSAGES.help, { reply_markup: MAIN_KEYBOARD });
    }
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Обработка выбора направления квиза
    if (data.startsWith('quiz_dir_')) {
      const direction = data.replace('quiz_dir_', '');
      const userId = ctx.from.id;

      // Сохраняем направление в сессии
      let session = userSessions.get(userId) || {};
      session.quizDirection = direction;
      userSessions.set(userId, session);

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '🎯 Оберіть кількість питань для квізу:',
        { reply_markup: QUIZ_SIZE_KEYBOARD }
      );
      return;
    }

    // Обработка выбора размера квиза
    if (data.startsWith('quiz_size_')) {
      const size = parseInt(data.replace('quiz_size_', ''));
      const userId = ctx.from.id;
      const quizWords = shuffleArray(vocabulary).slice(0, size);

      // Получаем направление квиза из сессии
      const session = userSessions.get(userId) || {};
      const direction = session.quizDirection || 'en_ua';

      // Preload всех вопросов с ответами
      const questions = quizWords.map(word => {
        if (direction === 'ua_en') {
          // Обратный квиз: показываем украинский, ищем английский
          const correctAnswer = word.word;
          const wrongAnswers = getWrongAnswersReverse(word.word, 3);
          const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

          return {
            word: word.translation,  // Показываем украинский
            correctAnswer: correctAnswer,  // Правильный - английский
            answers: allAnswers
          };
        } else {
          // Обычный квиз: показываем английский, ищем украинский
          const correctAnswer = word.translation;
          const wrongAnswers = getWrongAnswers(word.word, 3);
          const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

          return {
            word: word.word,
            correctAnswer: correctAnswer,
            answers: allAnswers
          };
        }
      });

      // Обновляем streak
      updateStreak(userId);

      // Сохраняем сессию квиза
      session.questions = questions;
      session.currentQuestion = 0;
      session.score = 0;
      session.quizSize = size;
      userSessions.set(userId, session);

      await ctx.answerCbQuery();
      await ctx.deleteMessage();
      return sendQuizQuestion(ctx, userId);
    }

    // Обработка кнопки "Ще слово"
    if (data === 'next_word') {
      const userId = ctx.from.id;
      const word = getRandomItem(vocabulary);

      // Обновляем статистику
      const stats = getUserStats(userId);
      stats.wordsLearned.add(word.word);
      updateStreak(userId);

      await ctx.answerCbQuery();
      return ctx.editMessageText(formatWordMessage(word, userId), {
        parse_mode: 'Markdown',
        reply_markup: WORD_KEYBOARD
      });
    }

    // Обработка ответов в квизе
    if (data.startsWith('quiz_')) {
      const [, userId, result] = data.split('_');
      const session = userSessions.get(parseInt(userId));

      if (!session) {
        return ctx.answerCbQuery('Сесія закінчилася. Почніть новий квіз');
      }

      const currentQuestion = session.questions[session.currentQuestion];

      if (result === 'correct') {
        session.score++;
        await ctx.answerCbQuery('✅ Правильно!');
      } else {
        await ctx.answerCbQuery(`❌ Неправильно! Правильна відповідь: ${currentQuestion.correctAnswer}`);
      }

      session.currentQuestion++;
      userSessions.set(parseInt(userId), session);

      // Редактируем сообщение вместо отправки нового
      return editQuizQuestion(ctx, parseInt(userId));
    }
  });
}

function sendQuizQuestion(ctx, userId) {
  const session = userSessions.get(userId);

  if (!session || session.currentQuestion >= session.questions.length) {
    const finalScore = session ? session.score : 0;
    const quizSize = session ? session.quizSize || 5 : 5;

    // Обновляем статистику после завершения квиза
    const stats = getUserStats(userId);
    stats.quizzesTaken++;
    stats.quizScores.push(finalScore);

    // Добавляем все слова из квиза в изученные
    if (session && session.questions) {
      session.questions.forEach(q => stats.wordsLearned.add(q.word));
    }

    userSessions.delete(userId);

    const emoji = finalScore === quizSize ? '🏆 Відмінно!' : finalScore >= quizSize * 0.6 ? '👍 Добре!' : '💪 Продовжуй вчитися!';
    return ctx.reply(
      `✅ Квіз завершено!\n\n` +
      `Ваш результат: ${finalScore}/${quizSize}\n\n${emoji}\n\n` +
      `📊 Всього квізів: ${stats.quizzesTaken}\n` +
      `🔥 Серія: ${stats.streak} днів`,
      { reply_markup: MAIN_KEYBOARD }
    );
  }

  const question = session.questions[session.currentQuestion];
  const quizSize = session.quizSize || 5;

  const keyboard = {
    inline_keyboard: question.answers.map((answer, index) => [{
      text: answer,
      callback_data: `quiz_${userId}_${answer === question.correctAnswer ? 'correct' : 'wrong'}_${index}`
    }])
  };

  return ctx.reply(
    `❓ Питання ${session.currentQuestion + 1}/${quizSize}\n\nЯк перекладається слово:\n*${question.word}*`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

function editQuizQuestion(ctx, userId) {
  const session = userSessions.get(userId);

  if (!session || session.currentQuestion >= session.questions.length) {
    const finalScore = session ? session.score : 0;
    const quizSize = session ? session.quizSize || 5 : 5;

    // Обновляем статистику после завершения квиза
    const stats = getUserStats(userId);
    stats.quizzesTaken++;
    stats.quizScores.push(finalScore);

    // Добавляем все слова из квиза в изученные
    if (session && session.questions) {
      session.questions.forEach(q => stats.wordsLearned.add(q.word));
    }

    userSessions.delete(userId);

    const emoji = finalScore === quizSize ? '🏆 Відмінно!' : finalScore >= quizSize * 0.6 ? '👍 Добре!' : '💪 Продовжуй вчитися!';
    return ctx.editMessageText(
      `✅ Квіз завершено!\n\n` +
      `Ваш результат: ${finalScore}/${quizSize}\n\n${emoji}\n\n` +
      `📊 Всього квізів: ${stats.quizzesTaken}\n` +
      `🔥 Серія: ${stats.streak} днів`,
      { parse_mode: 'Markdown' }
    );
  }

  const question = session.questions[session.currentQuestion];
  const quizSize = session.quizSize || 5;

  const keyboard = {
    inline_keyboard: question.answers.map((answer, index) => [{
      text: answer,
      callback_data: `quiz_${userId}_${answer === question.correctAnswer ? 'correct' : 'wrong'}_${index}`
    }])
  };

  return ctx.editMessageText(
    `❓ Питання ${session.currentQuestion + 1}/${quizSize}\n\nЯк перекладається слово:\n*${question.word}*`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Быстрый ответ для GET запросов
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const bot = getBot();

    // Обрабатываем update и ждем завершения
    await bot.handleUpdate(req.body);

    // Отправляем ответ после обработки
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ ok: true });
  }
};
