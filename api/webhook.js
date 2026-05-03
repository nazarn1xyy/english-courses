const { Telegraf } = require('telegraf');

// Vocabulary database - константа вне функции для переиспользования
const vocabulary = [
  { word: 'serendipity', translation: 'счастливая случайность', example: 'Finding this job was pure serendipity.' },
  { word: 'ephemeral', translation: 'эфемерный, мимолетный', example: 'The beauty of cherry blossoms is ephemeral.' },
  { word: 'resilient', translation: 'устойчивый, выносливый', example: 'She is resilient in the face of adversity.' },
  { word: 'ambiguous', translation: 'двусмысленный', example: 'His answer was ambiguous and confusing.' },
  { word: 'eloquent', translation: 'красноречивый', example: 'She gave an eloquent speech at the conference.' },
  { word: 'pragmatic', translation: 'прагматичный', example: 'We need a pragmatic solution to this problem.' },
  { word: 'meticulous', translation: 'дотошный, скрупулезный', example: 'He is meticulous about his work.' },
  { word: 'ubiquitous', translation: 'вездесущий', example: 'Smartphones are ubiquitous in modern society.' },
  { word: 'benevolent', translation: 'доброжелательный', example: 'She has a benevolent attitude toward everyone.' },
  { word: 'candid', translation: 'откровенный, прямой', example: 'I appreciate your candid feedback.' }
];

// User sessions - глобальная переменная для сохранения между вызовами
const userSessions = new Map();

// Переиспользуемые сообщения
const MESSAGES = {
  start: '👋 Привет! Я бот для изучения английского языка.\n\nДоступные команды:\n/word - Получить случайное слово дня\n/quiz - Пройти мини-квиз (5 вопросов)\n/help - Показать помощь',
  help: '📚 Как пользоваться ботом:\n\n/word - Узнай новое английское слово с переводом и примером\n/quiz - Проверь свои знания в коротком квизе\n\nУчи английский каждый день! 🚀'
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
  bot.command('start', (ctx) => ctx.reply(MESSAGES.start));
  bot.command('help', (ctx) => ctx.reply(MESSAGES.help));

  bot.command('word', (ctx) => {
    const word = getRandomItem(vocabulary);
    return ctx.reply(
      `📖 Слово дня:\n\n🇬🇧 *${word.word}*\n🇷🇺 ${word.translation}\n\nПример: _"${word.example}"_`,
      { parse_mode: 'Markdown' }
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

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

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
    return ctx.reply(`✅ Квиз завершен!\n\nВаш результат: ${finalScore}/5\n\n${emoji}`);
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

    // Отправляем ответ Telegram сразу, не дожидаясь обработки
    res.status(200).json({ ok: true });

    // Обрабатываем update асинхронно после ответа
    await bot.handleUpdate(req.body);
  } catch (error) {
    console.error('Error:', error);
    // Если ответ еще не отправлен
    if (!res.headersSent) {
      res.status(200).json({ ok: true });
    }
  }
};
