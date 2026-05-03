# English Learning Telegram Bot 📚

Телеграм бот для изучения английского языка с ежедневными словами и квизами. Работает через webhook на Vercel.

## Возможности

- 📖 **Слово дня** - получай случайные английские слова с переводом и примерами
- 🎯 **Квизы** - проверяй свои знания в интерактивных мини-квизах
- 🚀 **Без хостинга** - работает как serverless функция на Vercel

## Команды бота

- `/start` - Начать работу с ботом
- `/word` - Получить случайное слово с переводом
- `/quiz` - Пройти квиз из 5 вопросов
- `/help` - Показать справку

## Установка и деплой

### 1. Создай бота в Telegram

1. Найди [@BotFather](https://t.me/botfather) в Telegram
2. Отправь команду `/newbot`
3. Следуй инструкциям и получи токен бота

### 2. Установи зависимости

```bash
npm install
```

### 3. Задеплой на Vercel

```bash
npm install -g vercel
vercel login
vercel
```

### 4. Добавь переменную окружения

В настройках проекта на Vercel:
- Settings → Environment Variables
- Добавь `BOT_TOKEN` со значением токена от BotFather

### 5. Установи webhook

После деплоя выполни запрос (замени значения):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_URL>/api/webhook"
```

Пример:
```bash
curl -X POST "https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/setWebhook?url=https://my-bot.vercel.app/api/webhook"
```

## Проверка webhook

```bash
curl -X GET "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Структура проекта

```
БОТ/
├── api/
│   └── webhook.js      # Serverless функция для обработки webhook
├── package.json        # Зависимости проекта
├── vercel.json         # Конфигурация Vercel
├── .env.example        # Пример переменных окружения
└── README.md           # Документация
```

## Разработка

Для локальной разработки:

```bash
npm run dev
```

Затем используй ngrok для тестирования webhook:

```bash
ngrok http 3000
```

## Технологии

- **Telegraf** - фреймворк для Telegram ботов
- **Vercel** - serverless платформа для деплоя
- **Node.js** - runtime окружение

## Лицензия

MIT
# english-courses
