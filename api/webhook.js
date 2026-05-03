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
  start: `👋 Привет! Я бот для изучения английского языка.\n\n📚 База: ${vocabulary.length} слов\n\nВыбери действие из меню ниже:`,
  help: '📚 Как пользоваться ботом:\n\n📖 Случайное слово - Узнай новое английское слово с переводом\n🎯 Квиз - Проверь свои знания в коротком квизе (5 вопросов)\n\nУчи английский каждый день! 🚀'
};

// Постоянная клавиатура (reply keyboard)
const MAIN_KEYBOARD = {
  keyboard: [
    [
      { text: '📖 Случайное слово' },
      { text: '🎯 Квиз' }
    ],
    [
      { text: 'ℹ️ Помощь' }
    ]
  ],
  resize_keyboard: true,
  persistent: true
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

function setupHandlers(bot) {

  // Commands - используем прямые ответы без лишних конкатенаций
  bot.command('start', (ctx) => ctx.reply(MESSAGES.start, { reply_markup: MAIN_KEYBOARD }));
  bot.command('help', (ctx) => ctx.reply(MESSAGES.help, { reply_markup: MAIN_KEYBOARD }));

  bot.command('word', (ctx) => {
    const word = getRandomItem(vocabulary);
    return ctx.reply(
      `📖 Слово:\n\n🇬🇧 *${word.word}*\n🇷🇺 ${word.translation}`,
      { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
    );
  });

  bot.command('quiz', (ctx) => {
    const userId = ctx.from.id;
    const quizWords = shuffleArray(vocabulary).slice(0, 5);

    userSessions.set(userId, {
      words: quizWords,
      currentQuestion: 0,
      score: 0
    });

    return sendQuizQuestion(ctx, userId);
  });

  // Обработка текстовых сообщений с кнопок клавиатуры
  bot.on('text', (ctx) => {
    const text = ctx.message.text;

    if (text === '📖 Случайное слово') {
      const word = getRandomItem(vocabulary);
      return ctx.reply(
        `📖 Слово:\n\n🇬🇧 *${word.word}*\n🇷🇺 ${word.translation}`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
      );
    }

    if (text === '🎯 Квиз') {
      const userId = ctx.from.id;
      const quizWords = shuffleArray(vocabulary).slice(0, 5);

      userSessions.set(userId, {
        words: quizWords,
        currentQuestion: 0,
        score: 0
      });

      return sendQuizQuestion(ctx, userId);
    }

    if (text === 'ℹ️ Помощь') {
      return ctx.reply(MESSAGES.help, { reply_markup: MAIN_KEYBOARD });
    }
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Обработка ответов в квизе
    if (data.startsWith('quiz_')) {
      const [, userId, result] = data.split('_');
      const session = userSessions.get(parseInt(userId));

      if (!session) {
        return ctx.answerCbQuery('Сессия истекла. Начните новый квиз с /quiz');
      }

      if (result === 'correct') {
        session.score++;
        await ctx.answerCbQuery('✅ Правильно!');
      } else {
        await ctx.answerCbQuery('❌ Неправильно');
      }

      session.currentQuestion++;
      userSessions.set(parseInt(userId), session);

      // Убираем setTimeout - отправляем сразу
      return sendQuizQuestion(ctx, parseInt(userId));
    }
  });
}

function sendQuizQuestion(ctx, userId) {
  const session = userSessions.get(userId);

  if (!session || session.currentQuestion >= session.words.length) {
    const finalScore = session ? session.score : 0;
    userSessions.delete(userId);

    const emoji = finalScore === 5 ? '🏆 Отлично!' : finalScore >= 3 ? '👍 Хорошо!' : '💪 Продолжай учиться!';
    return ctx.reply(
      `✅ Квиз завершен!\n\nВаш результат: ${finalScore}/5\n\n${emoji}`,
      { reply_markup: MAIN_KEYBOARD }
    );
  }

  const currentWord = session.words[session.currentQuestion];
  const correctAnswer = currentWord.translation;

  // Оптимизированная генерация неправильных ответов
  const wrongAnswers = vocabulary
    .filter(w => w.word !== currentWord.word)
    .slice(0, 3)
    .map(w => w.translation);

  const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

  const keyboard = {
    inline_keyboard: allAnswers.map((answer, index) => [{
      text: answer,
      callback_data: `quiz_${userId}_${answer === correctAnswer ? 'correct' : 'wrong'}_${index}`
    }])
  };

  return ctx.reply(
    `❓ Вопрос ${session.currentQuestion + 1}/5\n\nКак переводится слово:\n*${currentWord.word}*`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

// Vercel serverless function handler - оптимизированный
module.exports = async (req, res) => {
  // Быстрый ответ для GET запросов
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const bot = getBot();

    // Обрабатываем update сначала
    await bot.handleUpdate(req.body);

    // Отправляем ответ после обработки
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(200).json({ ok: true });
  }
};
