const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Vocabulary database
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

// User sessions for quiz
const userSessions = new Map();

// Commands
bot.command('start', (ctx) => {
  ctx.reply(
    '👋 Привет! Я бот для изучения английского языка.\n\n' +
    'Доступные команды:\n' +
    '/word - Получить случайное слово дня\n' +
    '/quiz - Пройти мини-квиз (5 вопросов)\n' +
    '/help - Показать помощь'
  );
});

bot.command('help', (ctx) => {
  ctx.reply(
    '📚 Как пользоваться ботом:\n\n' +
    '/word - Узнай новое английское слово с переводом и примером\n' +
    '/quiz - Проверь свои знания в коротком квизе\n\n' +
    'Учи английский каждый день! 🚀'
  );
});

bot.command('word', (ctx) => {
  const randomWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
  ctx.reply(
    `📖 Слово дня:\n\n` +
    `🇬🇧 *${randomWord.word}*\n` +
    `🇷🇺 ${randomWord.translation}\n\n` +
    `Пример: _"${randomWord.example}"_`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('quiz', (ctx) => {
  const userId = ctx.from.id;
  const quizWords = vocabulary.sort(() => 0.5 - Math.random()).slice(0, 5);

  userSessions.set(userId, {
    words: quizWords,
    currentQuestion: 0,
    score: 0
  });

  sendQuizQuestion(ctx, userId);
});

function sendQuizQuestion(ctx, userId) {
  const session = userSessions.get(userId);

  if (!session || session.currentQuestion >= session.words.length) {
    const finalScore = session ? session.score : 0;
    ctx.reply(
      `✅ Квиз завершен!\n\n` +
      `Ваш результат: ${finalScore}/5\n\n` +
      `${finalScore === 5 ? '🏆 Отлично!' : finalScore >= 3 ? '👍 Хорошо!' : '💪 Продолжай учиться!'}`
    );
    userSessions.delete(userId);
    return;
  }

  const currentWord = session.words[session.currentQuestion];
  const correctAnswer = currentWord.translation;

  // Generate wrong answers
  const wrongAnswers = vocabulary
    .filter(w => w.word !== currentWord.word)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(w => w.translation);

  const allAnswers = [correctAnswer, ...wrongAnswers].sort(() => 0.5 - Math.random());

  const keyboard = {
    inline_keyboard: allAnswers.map((answer, index) => [{
      text: answer,
      callback_data: `quiz_${userId}_${answer === correctAnswer ? 'correct' : 'wrong'}_${index}`
    }])
  };

  ctx.reply(
    `❓ Вопрос ${session.currentQuestion + 1}/5\n\n` +
    `Как переводится слово:\n*${currentWord.word}*`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

bot.on('callback_query', (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('quiz_')) {
    const [, userId, result] = data.split('_');
    const session = userSessions.get(parseInt(userId));

    if (!session) {
      ctx.answerCbQuery('Сессия истекла. Начните новый квиз с /quiz');
      return;
    }

    if (result === 'correct') {
      session.score++;
      ctx.answerCbQuery('✅ Правильно!');
    } else {
      ctx.answerCbQuery('❌ Неправильно');
    }

    session.currentQuestion++;
    userSessions.set(parseInt(userId), session);

    setTimeout(() => {
      sendQuizQuestion(ctx, parseInt(userId));
    }, 500);
  }
});

// Vercel serverless function handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } else {
      res.status(200).json({ status: 'Bot is running' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
