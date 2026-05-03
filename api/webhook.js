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
  help: `📚 Як користуватися ботом:\n\n` +
    `📖 *Випадкове слово* - отримай випадкове слово з перекладом та прикладом\n\n` +
    `📅 *Слово дня* - щоденне слово, однакове для всіх користувачів\n\n` +
    `📂 *Категорії* - вивчай слова по темах:\n` +
    `   • Їжа, Сім'я, Дім, Тіло, Одяг\n` +
    `   • Природа, Місто, Транспорт\n` +
    `   • Робота, Освіта, Час\n` +
    `   • Емоції, Здоров'я, Спілкування\n` +
    `   • Дії, Числа, Кольори та інше\n\n` +
    `🎯 *Квіз* - перевір свої знання:\n` +
    `   • Обери напрямок (англ→укр або укр→англ)\n` +
    `   • Обери кількість питань (5, 10 або 20)\n` +
    `   • Отримай результат та статистику\n\n` +
    `📊 *Статистика* - переглядай свій прогрес:\n` +
    `   • Кількість вивчених слів\n` +
    `   • Пройдені квізи та середній результат\n` +
    `   • Серія днів активності\n\n` +
    `💡 Вивчай англійську щодня для кращих результатів! 🚀`
};

// Категории слов
const CATEGORIES = {
  all: { name: 'Всі слова', emoji: '📚' },
  food: { name: 'Їжа', emoji: '🍎' },
  family: { name: 'Сім\'я', emoji: '👨‍👩‍👧‍👦' },
  home: { name: 'Дім', emoji: '🏠' },
  body: { name: 'Тіло', emoji: '👤' },
  clothes: { name: 'Одяг', emoji: '👕' },
  nature: { name: 'Природа', emoji: '🌳' },
  city: { name: 'Місто', emoji: '🏙️' },
  transport: { name: 'Транспорт', emoji: '🚗' },
  work: { name: 'Робота', emoji: '💼' },
  education: { name: 'Освіта', emoji: '📖' },
  time: { name: 'Час', emoji: '⏰' },
  emotions: { name: 'Емоції', emoji: '😊' },
  health: { name: 'Здоров\'я', emoji: '🏥' },
  communication: { name: 'Спілкування', emoji: '💬' },
  actions: { name: 'Дії', emoji: '🏃' },
  numbers: { name: 'Числа', emoji: '🔢' },
  colors: { name: 'Кольори', emoji: '🎨' },
  size: { name: 'Розмір', emoji: '📏' },
  quality: { name: 'Якість', emoji: '⭐' },
  other: { name: 'Інше', emoji: '📦' }
};

// Достижения
const ACHIEVEMENTS = {
  first_word: { name: 'Перше слово', emoji: '🌱', description: 'Вивчив перше слово', requirement: 1, type: 'words' },
  word_explorer: { name: 'Дослідник слів', emoji: '🔍', description: 'Вивчив 10 слів', requirement: 10, type: 'words' },
  word_collector: { name: 'Колекціонер слів', emoji: '📚', description: 'Вивчив 50 слів', requirement: 50, type: 'words' },
  word_master: { name: 'Майстер слів', emoji: '🎓', description: 'Вивчив 100 слів', requirement: 100, type: 'words' },
  word_guru: { name: 'Гуру слів', emoji: '👑', description: 'Вивчив 500 слів', requirement: 500, type: 'words' },
  word_legend: { name: 'Легенда слів', emoji: '🏆', description: 'Вивчив всі 1021 слово', requirement: 1021, type: 'words' },

  first_quiz: { name: 'Перший квіз', emoji: '🎯', description: 'Пройшов перший квіз', requirement: 1, type: 'quizzes' },
  quiz_fan: { name: 'Фанат квізів', emoji: '🎮', description: 'Пройшов 10 квізів', requirement: 10, type: 'quizzes' },
  quiz_expert: { name: 'Експерт квізів', emoji: '🏅', description: 'Пройшов 50 квізів', requirement: 50, type: 'quizzes' },

  perfect_quiz: { name: 'Ідеальний квіз', emoji: '💯', description: 'Відповів правильно на всі питання в квізі', requirement: 1, type: 'perfect' },
  streak_3: { name: 'Тижневий марафон', emoji: '🔥', description: '7 днів підряд', requirement: 7, type: 'streak' },
  streak_30: { name: 'Місячний марафон', emoji: '🌟', description: '30 днів підряд', requirement: 30, type: 'streak' },

  favorite_10: { name: 'Колекціонер обраного', emoji: '⭐', description: '10 слів в обраному', requirement: 10, type: 'favorites' },
  no_mistakes: { name: 'Без помилок', emoji: '✨', description: 'Повторив всі помилки', requirement: 1, type: 'no_mistakes' }
};

// Постоянная клавиатура (reply keyboard)
const MAIN_KEYBOARD = {
  keyboard: [
    [
      { text: '📖 Випадкове слово' },
      { text: '🎯 Квіз' }
    ],
    [
      { text: '📅 Слово дня' },
      { text: '📂 Категорії' }
    ],
    [
      { text: '⭐ Обране' },
      { text: '🔄 Повторити помилки' }
    ],
    [
      { text: '🏆 Досягнення' },
      { text: '📊 Статистика' }
    ],
    [
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

// Функция для создания клавиатуры слова с кнопкой избранного
function getWordKeyboard(word, userId, isFavorite) {
  const favoriteButton = isFavorite
    ? { text: '⭐ Видалити з обраного', callback_data: `unfav_${word}` }
    : { text: '⭐ В обране', callback_data: `fav_${word}` };

  return {
    inline_keyboard: [
      [
        { text: 'Ще слово 🔄', callback_data: 'next_word' }
      ],
      [favoriteButton]
    ]
  };
}

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

// Функция для получения слова дня (детерминированная на основе даты)
function getWordOfTheDay() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const index = dayOfYear % vocabulary.length;
  return vocabulary[index];
}

// Функция для получения слов по категории
function getWordsByCategory(category) {
  if (category === 'all') {
    return vocabulary;
  }
  return vocabulary.filter(word => word.category === category);
}

// Функция для создания клавиатуры категорий
function getCategoriesKeyboard() {
  const buttons = [];
  const categoryKeys = Object.keys(CATEGORIES).filter(key => key !== 'all');

  // Группируем по 2 кнопки в ряд
  for (let i = 0; i < categoryKeys.length; i += 2) {
    const row = [];
    const cat1 = categoryKeys[i];
    const wordsCount1 = getWordsByCategory(cat1).length;
    row.push({
      text: `${CATEGORIES[cat1].emoji} ${CATEGORIES[cat1].name} (${wordsCount1})`,
      callback_data: `cat_${cat1}`
    });

    if (i + 1 < categoryKeys.length) {
      const cat2 = categoryKeys[i + 1];
      const wordsCount2 = getWordsByCategory(cat2).length;
      row.push({
        text: `${CATEGORIES[cat2].emoji} ${CATEGORIES[cat2].name} (${wordsCount2})`,
        callback_data: `cat_${cat2}`
      });
    }

    buttons.push(row);
  }

  // Добавляем кнопку "Всі слова" в конце
  buttons.push([{
    text: `${CATEGORIES.all.emoji} ${CATEGORIES.all.name} (${vocabulary.length})`,
    callback_data: 'cat_all'
  }]);

  return { inline_keyboard: buttons };
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
        streak: 0,
        favoriteWords: new Set(),
        mistakeWords: new Set()
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
      streak: 0,
      favoriteWords: new Set(),
      mistakeWords: new Set()
    };
  }

  // Добавляем favoriteWords если его нет (для существующих пользователей)
  if (!session.stats.favoriteWords) {
    session.stats.favoriteWords = new Set();
  }

  // Добавляем mistakeWords если его нет (для существующих пользователей)
  if (!session.stats.mistakeWords) {
    session.stats.mistakeWords = new Set();
  }

  // Добавляем achievements если его нет (для существующих пользователей)
  if (!session.stats.achievements) {
    session.stats.achievements = new Set();
  }

  return session.stats;
}

// Функция для проверки и награждения достижениями
function checkAchievements(userId, ctx) {
  const stats = getUserStats(userId);
  const newAchievements = [];

  // Проверяем достижения по словам
  Object.entries(ACHIEVEMENTS).forEach(([key, achievement]) => {
    if (stats.achievements.has(key)) return; // Уже получено

    let earned = false;

    switch (achievement.type) {
      case 'words':
        earned = stats.wordsLearned.size >= achievement.requirement;
        break;
      case 'quizzes':
        earned = stats.quizzesTaken >= achievement.requirement;
        break;
      case 'streak':
        earned = stats.streak >= achievement.requirement;
        break;
      case 'favorites':
        earned = stats.favoriteWords.size >= achievement.requirement;
        break;
      case 'no_mistakes':
        earned = stats.mistakeWords.size === 0 && stats.quizzesTaken > 0;
        break;
    }

    if (earned) {
      stats.achievements.add(key);
      newAchievements.push(achievement);
    }
  });

  // Отправляем уведомление о новых достижениях
  if (newAchievements.length > 0 && ctx) {
    const message = newAchievements.map(a =>
      `${a.emoji} *${a.name}*\n${a.description}`
    ).join('\n\n');

    ctx.reply(
      `🎉 Нові досягнення!\n\n${message}`,
      { parse_mode: 'Markdown' }
    );
  }

  return newAchievements;
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
  bot.command('start', (ctx) => {
    const userId = ctx.from.id;
    const stats = getUserStats(userId);

    // Проверяем, новый ли пользователь
    const isNewUser = stats.wordsLearned.size === 0 && stats.quizzesTaken === 0;

    if (isNewUser) {
      // Онбординг для новых пользователей
      return ctx.reply(
        `👋 Привіт! Я бот для вивчення англійської мови.\n\n` +
        `📚 База: ${vocabulary.length} слів з перекладом та прикладами\n\n` +
        `🎯 Що я вмію:\n\n` +
        `📖 *Випадкове слово* - вивчай нові слова\n` +
        `📅 *Слово дня* - щоденне слово для всіх\n` +
        `📂 *Категорії* - слова по темах (їжа, сім'я, робота...)\n` +
        `🎯 *Квіз* - перевір свої знання (5/10/20 питань)\n` +
        `   • Англійська → Українська\n` +
        `   • Українська → Англійська\n` +
        `📊 *Статистика* - відстежуй свій прогрес\n\n` +
        `💡 Почни з кнопки "📖 Випадкове слово" нижче!\n\n` +
        `Вивчай англійську щодня! 🚀`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
      );
    } else {
      // Обычное приветствие для существующих пользователей
      return ctx.reply(MESSAGES.start, { reply_markup: MAIN_KEYBOARD });
    }
  });

  bot.command('help', (ctx) => ctx.reply(MESSAGES.help, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }));

  bot.command('word', (ctx) => {
    const userId = ctx.from.id;
    const word = getRandomItem(vocabulary);

    // Обновляем статистику
    const stats = getUserStats(userId);
    stats.wordsLearned.add(word.word);
    updateStreak(userId);

    const isFavorite = stats.favoriteWords.has(word.word);

    // Проверяем достижения
    checkAchievements(userId, ctx);

    return ctx.reply(formatWordMessage(word, userId), {
      parse_mode: 'Markdown',
      reply_markup: getWordKeyboard(word.word, userId, isFavorite)
    });
  });

  bot.command('wordofday', (ctx) => {
    const userId = ctx.from.id;
    const word = getWordOfTheDay();

    // Обновляем статистику
    const stats = getUserStats(userId);
    stats.wordsLearned.add(word.word);
    updateStreak(userId);

    const today = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    const progress = `📚 Вивчено: ${stats.wordsLearned.size}/1021`;
    const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

    return ctx.reply(
      `📅 Слово дня (${today}):\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
      { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
    );
  });

  bot.command('category', (ctx) => {
    return ctx.reply(
      '📂 Оберіть категорію слів:',
      { reply_markup: getCategoriesKeyboard() }
    );
  });

  bot.command('favorites', (ctx) => {
    const userId = ctx.from.id;
    const stats = getUserStats(userId);

    if (stats.favoriteWords.size === 0) {
      return ctx.reply(
        '⭐ У вас поки немає обраних слів.\n\nДодавайте слова в обране, натискаючи кнопку "⭐ В обране" під словом!',
        { reply_markup: MAIN_KEYBOARD }
      );
    }

    // Получаем случайное слово из избранного
    const favoriteWordsArray = Array.from(stats.favoriteWords);
    const randomWord = favoriteWordsArray[Math.floor(Math.random() * favoriteWordsArray.length)];
    const word = vocabulary.find(w => w.word === randomWord);

    if (!word) {
      return ctx.reply('Помилка: слово не знайдено', { reply_markup: MAIN_KEYBOARD });
    }

    const progress = `⭐ Обране: ${stats.favoriteWords.size} слів`;
    const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

    return ctx.reply(
      `⭐ Обране слово:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Ще обране слово 🔄', callback_data: 'next_favorite' }
            ],
            [
              { text: '⭐ Видалити з обраного', callback_data: `unfav_${word.word}` }
            ]
          ]
        }
      }
    );
  });

  bot.command('mistakes', (ctx) => {
    const userId = ctx.from.id;
    const stats = getUserStats(userId);

    if (stats.mistakeWords.size === 0) {
      return ctx.reply(
        '🔄 У вас поки немає помилок у квізах.\n\nПройдіть квіз, щоб побачити слова, в яких ви помилилися!',
        { reply_markup: MAIN_KEYBOARD }
      );
    }

    // Получаем случайное слово из ошибок
    const mistakeWordsArray = Array.from(stats.mistakeWords);
    const randomWord = mistakeWordsArray[Math.floor(Math.random() * mistakeWordsArray.length)];
    const word = vocabulary.find(w => w.word === randomWord);

    if (!word) {
      return ctx.reply('Помилка: слово не знайдено', { reply_markup: MAIN_KEYBOARD });
    }

    const progress = `🔄 Помилок: ${stats.mistakeWords.size} слів`;
    const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

    return ctx.reply(
      `🔄 Слово з помилками:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Ще слово з помилок 🔄', callback_data: 'next_mistake' }
            ],
            [
              { text: '✅ Вивчив це слово', callback_data: `clear_mistake_${word.word}` }
            ]
          ]
        }
      }
    );
  });

  bot.command('achievements', (ctx) => {
    const userId = ctx.from.id;
    const stats = getUserStats(userId);

    if (stats.achievements.size === 0) {
      return ctx.reply(
        '🏆 У вас поки немає досягнень.\n\nВивчайте слова, проходьте квізи та отримуйте нагороди!',
        { reply_markup: MAIN_KEYBOARD }
      );
    }

    // Формируем список полученных достижений
    const earnedList = Array.from(stats.achievements).map(key => {
      const achievement = ACHIEVEMENTS[key];
      return `${achievement.emoji} *${achievement.name}*\n   ${achievement.description}`;
    }).join('\n\n');

    // Формируем список доступных достижений
    const availableList = Object.entries(ACHIEVEMENTS)
      .filter(([key]) => !stats.achievements.has(key))
      .slice(0, 5) // Показываем только первые 5
      .map(([key, achievement]) => {
        let progress = '';
        switch (achievement.type) {
          case 'words':
            progress = `(${stats.wordsLearned.size}/${achievement.requirement})`;
            break;
          case 'quizzes':
            progress = `(${stats.quizzesTaken}/${achievement.requirement})`;
            break;
          case 'streak':
            progress = `(${stats.streak}/${achievement.requirement})`;
            break;
          case 'favorites':
            progress = `(${stats.favoriteWords.size}/${achievement.requirement})`;
            break;
        }
        return `🔒 ${achievement.name} ${progress}\n   ${achievement.description}`;
      }).join('\n\n');

    return ctx.reply(
      `🏆 Твої досягнення: ${stats.achievements.size}/${Object.keys(ACHIEVEMENTS).length}\n\n` +
      `✅ *Отримано:*\n\n${earnedList}\n\n` +
      `🔒 *Доступно:*\n\n${availableList}`,
      { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
    );
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
      `⭐ Обране: ${stats.favoriteWords.size} слів\n` +
      `🔄 Помилок: ${stats.mistakeWords.size} слів\n` +
      `🏆 Досягнень: ${stats.achievements.size}/${Object.keys(ACHIEVEMENTS).length}\n` +
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

      const isFavorite = stats.favoriteWords.has(word.word);

      return ctx.reply(formatWordMessage(word, userId), {
        parse_mode: 'Markdown',
        reply_markup: getWordKeyboard(word.word, userId, isFavorite)
      });
    }

    if (text === '📅 Слово дня') {
      const userId = ctx.from.id;
      const word = getWordOfTheDay();

      // Обновляем статистику
      const stats = getUserStats(userId);
      stats.wordsLearned.add(word.word);
      updateStreak(userId);

      const today = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
      const progress = `📚 Вивчено: ${stats.wordsLearned.size}/1021`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      return ctx.reply(
        `📅 Слово дня (${today}):\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
      );
    }

    if (text === '📂 Категорії') {
      return ctx.reply(
        '📂 Оберіть категорію слів:',
        { reply_markup: getCategoriesKeyboard() }
      );
    }

    if (text === '⭐ Обране') {
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      if (stats.favoriteWords.size === 0) {
        return ctx.reply(
          '⭐ У вас поки немає обраних слів.\n\nДодавайте слова в обране, натискаючи кнопку "⭐ В обране" під словом!',
          { reply_markup: MAIN_KEYBOARD }
        );
      }

      // Получаем случайное слово из избранного
      const favoriteWordsArray = Array.from(stats.favoriteWords);
      const randomWord = favoriteWordsArray[Math.floor(Math.random() * favoriteWordsArray.length)];
      const word = vocabulary.find(w => w.word === randomWord);

      if (!word) {
        return ctx.reply('Помилка: слово не знайдено', { reply_markup: MAIN_KEYBOARD });
      }

      const progress = `⭐ Обране: ${stats.favoriteWords.size} слів`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      return ctx.reply(
        `⭐ Обране слово:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Ще обране слово 🔄', callback_data: 'next_favorite' }
              ],
              [
                { text: '⭐ Видалити з обраного', callback_data: `unfav_${word.word}` }
              ]
            ]
          }
        }
      );
    }

    if (text === '🔄 Повторити помилки') {
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      if (stats.mistakeWords.size === 0) {
        return ctx.reply(
          '🔄 У вас поки немає помилок у квізах.\n\nПройдіть квіз, щоб побачити слова, в яких ви помилилися!',
          { reply_markup: MAIN_KEYBOARD }
        );
      }

      // Получаем случайное слово из ошибок
      const mistakeWordsArray = Array.from(stats.mistakeWords);
      const randomWord = mistakeWordsArray[Math.floor(Math.random() * mistakeWordsArray.length)];
      const word = vocabulary.find(w => w.word === randomWord);

      if (!word) {
        return ctx.reply('Помилка: слово не знайдено', { reply_markup: MAIN_KEYBOARD });
      }

      const progress = `🔄 Помилок: ${stats.mistakeWords.size} слів`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      return ctx.reply(
        `🔄 Слово з помилками:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Ще слово з помилок 🔄', callback_data: 'next_mistake' }
              ],
              [
                { text: '✅ Вивчив це слово', callback_data: `clear_mistake_${word.word}` }
              ]
            ]
          }
        }
      );
    }

    if (text === '🏆 Досягнення') {
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      if (stats.achievements.size === 0) {
        return ctx.reply(
          '🏆 У вас поки немає досягнень.\n\nВивчайте слова, проходьте квізи та отримуйте нагороди!',
          { reply_markup: MAIN_KEYBOARD }
        );
      }

      // Формируем список полученных достижений
      const earnedList = Array.from(stats.achievements).map(key => {
        const achievement = ACHIEVEMENTS[key];
        return `${achievement.emoji} *${achievement.name}*\n   ${achievement.description}`;
      }).join('\n\n');

      // Формируем список доступных достижений
      const availableList = Object.entries(ACHIEVEMENTS)
        .filter(([key]) => !stats.achievements.has(key))
        .slice(0, 5) // Показываем только первые 5
        .map(([key, achievement]) => {
          let progress = '';
          switch (achievement.type) {
            case 'words':
              progress = `(${stats.wordsLearned.size}/${achievement.requirement})`;
              break;
            case 'quizzes':
              progress = `(${stats.quizzesTaken}/${achievement.requirement})`;
              break;
            case 'streak':
              progress = `(${stats.streak}/${achievement.requirement})`;
              break;
            case 'favorites':
              progress = `(${stats.favoriteWords.size}/${achievement.requirement})`;
              break;
          }
          return `🔒 ${achievement.name} ${progress}\n   ${achievement.description}`;
        }).join('\n\n');

      return ctx.reply(
        `🏆 Твої досягнення: ${stats.achievements.size}/${Object.keys(ACHIEVEMENTS).length}\n\n` +
        `✅ *Отримано:*\n\n${earnedList}\n\n` +
        `🔒 *Доступно:*\n\n${availableList}`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
      );
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
        `⭐ Обране: ${stats.favoriteWords.size} слів\n` +
        `🔄 Помилок: ${stats.mistakeWords.size} слів\n` +
        `🏆 Досягнень: ${stats.achievements.size}/${Object.keys(ACHIEVEMENTS).length}\n` +
        `🎯 Пройдено квізів: ${stats.quizzesTaken}\n` +
        `⭐ Середній результат: ${avgScore}/5\n` +
        `🔥 Серія днів: ${stats.streak}`,
        { reply_markup: MAIN_KEYBOARD }
      );
    }

    if (text === 'ℹ️ Допомога') {
      return ctx.reply(MESSAGES.help, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
    }
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Обработка выбора категории
    if (data.startsWith('cat_')) {
      const category = data.replace('cat_', '');
      const userId = ctx.from.id;
      const categoryWords = getWordsByCategory(category);

      if (categoryWords.length === 0) {
        await ctx.answerCbQuery('В цій категорії немає слів');
        return;
      }

      // Получаем случайное слово из категории
      const word = getRandomItem(categoryWords);

      // Обновляем статистику
      const stats = getUserStats(userId);
      stats.wordsLearned.add(word.word);
      updateStreak(userId);

      const categoryInfo = CATEGORIES[category];
      const progress = `📚 Вивчено: ${stats.wordsLearned.size}/1021`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `${categoryInfo.emoji} Категорія: ${categoryInfo.name}\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Ще слово з категорії 🔄', callback_data: `cat_${category}` }
              ],
              [
                { text: '📂 Назад до категорій', callback_data: 'back_to_categories' }
              ]
            ]
          }
        }
      );
      return;
    }

    // Обработка кнопки "Назад до категорій"
    if (data === 'back_to_categories') {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '📂 Оберіть категорію слів:',
        { reply_markup: getCategoriesKeyboard() }
      );
      return;
    }

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

      const isFavorite = stats.favoriteWords.has(word.word);

      await ctx.answerCbQuery();
      return ctx.editMessageText(formatWordMessage(word, userId), {
        parse_mode: 'Markdown',
        reply_markup: getWordKeyboard(word.word, userId, isFavorite)
      });
    }

    // Обработка добавления в избранное
    if (data.startsWith('fav_')) {
      const wordText = data.replace('fav_', '');
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      stats.favoriteWords.add(wordText);

      await ctx.answerCbQuery('⭐ Додано в обране!');

      // Обновляем клавиатуру
      const word = vocabulary.find(w => w.word === wordText);
      if (word) {
        return ctx.editMessageReplyMarkup(getWordKeyboard(wordText, userId, true));
      }
      return;
    }

    // Обработка удаления из избранного
    if (data.startsWith('unfav_')) {
      const wordText = data.replace('unfav_', '');
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      stats.favoriteWords.delete(wordText);

      await ctx.answerCbQuery('Видалено з обраного');

      // Обновляем клавиатуру
      const word = vocabulary.find(w => w.word === wordText);
      if (word) {
        return ctx.editMessageReplyMarkup(getWordKeyboard(wordText, userId, false));
      }
      return;
    }

    // Обработка кнопки "Ще обране слово"
    if (data === 'next_favorite') {
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      if (stats.favoriteWords.size === 0) {
        await ctx.answerCbQuery('У вас немає обраних слів');
        return;
      }

      // Получаем случайное слово из избранного
      const favoriteWordsArray = Array.from(stats.favoriteWords);
      const randomWord = favoriteWordsArray[Math.floor(Math.random() * favoriteWordsArray.length)];
      const word = vocabulary.find(w => w.word === randomWord);

      if (!word) {
        await ctx.answerCbQuery('Помилка: слово не знайдено');
        return;
      }

      const progress = `⭐ Обране: ${stats.favoriteWords.size} слів`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      await ctx.answerCbQuery();
      return ctx.editMessageText(
        `⭐ Обране слово:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Ще обране слово 🔄', callback_data: 'next_favorite' }
              ],
              [
                { text: '⭐ Видалити з обраного', callback_data: `unfav_${word.word}` }
              ]
            ]
          }
        }
      );
    }

    // Обработка кнопки "Ще слово з помилок"
    if (data === 'next_mistake') {
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      if (stats.mistakeWords.size === 0) {
        await ctx.answerCbQuery('У вас немає помилок');
        return;
      }

      // Получаем случайное слово из ошибок
      const mistakeWordsArray = Array.from(stats.mistakeWords);
      const randomWord = mistakeWordsArray[Math.floor(Math.random() * mistakeWordsArray.length)];
      const word = vocabulary.find(w => w.word === randomWord);

      if (!word) {
        await ctx.answerCbQuery('Помилка: слово не знайдено');
        return;
      }

      const progress = `🔄 Помилок: ${stats.mistakeWords.size} слів`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      await ctx.answerCbQuery();
      return ctx.editMessageText(
        `🔄 Слово з помилками:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Ще слово з помилок 🔄', callback_data: 'next_mistake' }
              ],
              [
                { text: '✅ Вивчив це слово', callback_data: `clear_mistake_${word.word}` }
              ]
            ]
          }
        }
      );
    }

    // Обработка кнопки "Вивчив це слово"
    if (data.startsWith('clear_mistake_')) {
      const wordText = data.replace('clear_mistake_', '');
      const userId = ctx.from.id;
      const stats = getUserStats(userId);

      stats.mistakeWords.delete(wordText);

      await ctx.answerCbQuery('✅ Видалено зі списку помилок!');

      // Если больше нет ошибок, показываем сообщение
      if (stats.mistakeWords.size === 0) {
        return ctx.editMessageText(
          '🎉 Вітаю! Ви повторили всі слова з помилками!\n\nПройдіть новий квіз, щоб продовжити навчання.',
          { reply_markup: { inline_keyboard: [] } }
        );
      }

      // Показываем следующее слово
      const mistakeWordsArray = Array.from(stats.mistakeWords);
      const randomWord = mistakeWordsArray[Math.floor(Math.random() * mistakeWordsArray.length)];
      const word = vocabulary.find(w => w.word === randomWord);

      if (!word) {
        return ctx.editMessageText('Помилка: слово не знайдено');
      }

      const progress = `🔄 Помилок: ${stats.mistakeWords.size} слів`;
      const exampleText = word.example ? `\n\n💬 Приклад:\n${word.example}` : '';

      return ctx.editMessageText(
        `🔄 Слово з помилками:\n\n🇬🇧 *${word.word}*\n🇺🇦 ${word.translation}${exampleText}\n\n${progress}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Ще слово з помилок 🔄', callback_data: 'next_mistake' }
              ],
              [
                { text: '✅ Вивчив це слово', callback_data: `clear_mistake_${word.word}` }
              ]
            ]
          }
        }
      );
    }

    // Обработка ответов в квизе
    if (data.startsWith('quiz_')) {
      const [, userId, result] = data.split('_');
      const session = userSessions.get(parseInt(userId));

      if (!session) {
        return ctx.answerCbQuery('Сесія закінчилася. Почніть новий квіз');
      }

      const currentQuestion = session.questions[session.currentQuestion];
      const stats = getUserStats(parseInt(userId));

      if (result === 'correct') {
        session.score++;
        await ctx.answerCbQuery('✅ Правильно!');
      } else {
        // Добавляем слово в список ошибок
        const wordObj = vocabulary.find(w =>
          w.word === currentQuestion.word || w.translation === currentQuestion.word
        );
        if (wordObj) {
          stats.mistakeWords.add(wordObj.word);
        }
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

    // Проверяем достижение "Идеальный квиз"
    if (finalScore === quizSize && !stats.achievements.has('perfect_quiz')) {
      stats.achievements.add('perfect_quiz');
      const achievement = ACHIEVEMENTS.perfect_quiz;
      ctx.reply(
        `🎉 Нове досягнення!\n\n${achievement.emoji} *${achievement.name}*\n${achievement.description}`,
        { parse_mode: 'Markdown' }
      );
    }

    // Проверяем другие достижения
    checkAchievements(userId, ctx);

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
