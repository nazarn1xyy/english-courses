const fs = require('fs');

// Читаем файл
const content = fs.readFileSync('english_1000_words_ua.txt', 'utf-8');

// Парсим строки
const lines = content.split('\n');
const vocabulary = [];

for (const line of lines) {
  // Ищем строки с форматом: номер. слово — перевод
  const match = line.match(/^\s*\d+\.\s+([a-zA-Z]+)\s+—\s+(.+)$/);

  if (match) {
    const word = match[1].trim();
    const translation = match[2].trim();

    vocabulary.push({
      word: word,
      translation: translation
    });
  }
}

console.log(`Parsed ${vocabulary.length} words`);

// Сохраняем в JSON
fs.writeFileSync('vocabulary.json', JSON.stringify(vocabulary, null, 2));
fs.writeFileSync('api/vocabulary.json', JSON.stringify(vocabulary, null, 2));

console.log('Saved to vocabulary.json and api/vocabulary.json');
