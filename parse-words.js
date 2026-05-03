const fs = require('fs');

// Читаем файл
const content = fs.readFileSync('english_1000_words.txt', 'utf-8');

// Парсим слова
const lines = content.split('\n');
const words = [];

for (const line of lines) {
  // Ищем строки формата: "номер. слово — перевод"
  const match = line.match(/^\s*\d+\.\s+([a-zA-Z\s]+?)\s+—\s+(.+)$/);

  if (match) {
    const word = match[1].trim();
    const translation = match[2].trim();

    words.push({
      word: word,
      translation: translation
    });
  }
}

console.log(`Найдено слов: ${words.length}`);

// Сохраняем в JSON
fs.writeFileSync('vocabulary.json', JSON.stringify(words, null, 2), 'utf-8');

console.log('Слова сохранены в vocabulary.json');
