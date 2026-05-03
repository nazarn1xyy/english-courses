const fs = require('fs');

// Читаємо існуючий словник
const vocabulary = JSON.parse(fs.readFileSync('vocabulary.json', 'utf-8'));

// Категорії слів
const categories = {
  food: ['apple', 'bread', 'milk', 'meat', 'fish', 'egg', 'cheese', 'sugar', 'salt', 'coffee', 'tea', 'water', 'food', 'cake', 'rice', 'soup', 'fruit', 'vegetable', 'chicken', 'potato', 'tomato', 'orange', 'banana', 'lemon', 'butter', 'oil', 'pepper', 'honey', 'chocolate', 'ice', 'cream', 'juice', 'wine', 'beer', 'restaurant', 'kitchen', 'cook', 'eat', 'drink', 'breakfast', 'lunch', 'dinner', 'meal', 'dish', 'plate', 'cup', 'glass', 'bottle', 'knife', 'fork', 'spoon'],

  family: ['family', 'mother', 'father', 'parent', 'child', 'son', 'daughter', 'brother', 'sister', 'husband', 'wife', 'grandmother', 'grandfather', 'uncle', 'aunt', 'cousin', 'baby', 'boy', 'girl', 'man', 'woman', 'people', 'person', 'friend', 'name', 'age', 'birth', 'birthday', 'wedding', 'marry', 'love'],

  home: ['home', 'house', 'room', 'door', 'window', 'wall', 'floor', 'roof', 'kitchen', 'bathroom', 'bedroom', 'living', 'garden', 'yard', 'furniture', 'table', 'chair', 'bed', 'sofa', 'desk', 'shelf', 'mirror', 'lamp', 'light', 'key', 'lock', 'stairs', 'elevator', 'apartment', 'building', 'address'],

  body: ['body', 'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'tooth', 'tongue', 'lip', 'hair', 'neck', 'shoulder', 'arm', 'hand', 'finger', 'leg', 'foot', 'knee', 'back', 'chest', 'stomach', 'heart', 'blood', 'bone', 'skin', 'brain'],

  clothes: ['clothes', 'shirt', 'dress', 'skirt', 'pants', 'jeans', 'coat', 'jacket', 'sweater', 'suit', 'tie', 'hat', 'cap', 'shoe', 'boot', 'sock', 'glove', 'belt', 'pocket', 'button', 'wear', 'fashion', 'style'],

  nature: ['nature', 'tree', 'flower', 'grass', 'plant', 'forest', 'mountain', 'hill', 'river', 'lake', 'sea', 'ocean', 'beach', 'island', 'sky', 'cloud', 'sun', 'moon', 'star', 'rain', 'snow', 'wind', 'weather', 'season', 'spring', 'summer', 'autumn', 'winter', 'animal', 'bird', 'fish', 'dog', 'cat', 'horse', 'cow', 'pig', 'sheep', 'chicken'],

  city: ['city', 'town', 'village', 'street', 'road', 'bridge', 'building', 'shop', 'store', 'market', 'bank', 'hospital', 'school', 'university', 'library', 'museum', 'theater', 'cinema', 'hotel', 'restaurant', 'cafe', 'park', 'square', 'station', 'airport', 'port', 'church', 'temple', 'office', 'factory', 'farm'],

  transport: ['car', 'bus', 'train', 'plane', 'ship', 'boat', 'bicycle', 'bike', 'taxi', 'truck', 'metro', 'subway', 'transport', 'traffic', 'drive', 'ride', 'fly', 'travel', 'trip', 'journey', 'ticket', 'passenger', 'driver', 'road', 'way', 'direction', 'map', 'distance'],

  work: ['work', 'job', 'office', 'business', 'company', 'boss', 'manager', 'worker', 'employee', 'colleague', 'team', 'meeting', 'project', 'task', 'plan', 'report', 'document', 'paper', 'computer', 'phone', 'email', 'internet', 'website', 'program', 'data', 'information', 'money', 'pay', 'salary', 'price', 'cost', 'buy', 'sell', 'market', 'customer', 'service'],

  education: ['school', 'university', 'college', 'class', 'lesson', 'course', 'student', 'teacher', 'professor', 'learn', 'study', 'teach', 'education', 'knowledge', 'book', 'page', 'text', 'word', 'letter', 'read', 'write', 'language', 'english', 'grammar', 'vocabulary', 'test', 'exam', 'question', 'answer', 'homework', 'subject', 'math', 'science', 'history', 'art', 'music', 'sport'],

  time: ['time', 'hour', 'minute', 'second', 'day', 'week', 'month', 'year', 'today', 'tomorrow', 'yesterday', 'morning', 'afternoon', 'evening', 'night', 'midnight', 'noon', 'date', 'calendar', 'clock', 'watch', 'early', 'late', 'now', 'then', 'soon', 'already', 'yet', 'still', 'always', 'never', 'sometimes', 'often', 'usually', 'past', 'present', 'future', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],

  emotions: ['happy', 'sad', 'angry', 'afraid', 'scared', 'worried', 'nervous', 'excited', 'surprised', 'tired', 'bored', 'interested', 'love', 'hate', 'like', 'enjoy', 'prefer', 'want', 'need', 'hope', 'wish', 'feel', 'emotion', 'mood', 'smile', 'laugh', 'cry', 'tears'],

  health: ['health', 'doctor', 'nurse', 'hospital', 'medicine', 'drug', 'pill', 'sick', 'ill', 'disease', 'pain', 'hurt', 'ache', 'cold', 'fever', 'cough', 'headache', 'toothache', 'stomach', 'healthy', 'fit', 'strong', 'weak', 'tired', 'rest', 'sleep', 'wake', 'dream'],

  communication: ['say', 'tell', 'speak', 'talk', 'ask', 'answer', 'call', 'phone', 'message', 'email', 'letter', 'write', 'read', 'listen', 'hear', 'understand', 'know', 'think', 'believe', 'mean', 'explain', 'describe', 'discuss', 'argue', 'agree', 'disagree', 'conversation', 'dialogue', 'question', 'answer', 'yes', 'no', 'please', 'thanks', 'sorry', 'excuse', 'hello', 'goodbye', 'welcome'],

  actions: ['do', 'make', 'go', 'come', 'walk', 'run', 'jump', 'sit', 'stand', 'lie', 'sleep', 'wake', 'open', 'close', 'start', 'stop', 'begin', 'end', 'finish', 'continue', 'try', 'help', 'give', 'take', 'bring', 'carry', 'hold', 'put', 'place', 'move', 'push', 'pull', 'throw', 'catch', 'hit', 'break', 'cut', 'wash', 'clean', 'cook', 'eat', 'drink', 'play', 'work', 'rest', 'wait', 'stay', 'leave', 'arrive', 'return', 'enter', 'exit', 'climb', 'fall', 'rise', 'grow', 'change', 'turn', 'become'],

  numbers: ['number', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million', 'first', 'second', 'third', 'last', 'next', 'count', 'calculate', 'add', 'subtract', 'multiply', 'divide'],

  colors: ['color', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'dark', 'light', 'bright', 'pale'],

  size: ['big', 'large', 'small', 'little', 'tiny', 'huge', 'great', 'long', 'short', 'tall', 'high', 'low', 'wide', 'narrow', 'thick', 'thin', 'deep', 'shallow', 'heavy', 'light', 'size', 'length', 'width', 'height', 'weight'],

  quality: ['good', 'bad', 'best', 'worst', 'better', 'worse', 'nice', 'beautiful', 'pretty', 'ugly', 'clean', 'dirty', 'new', 'old', 'young', 'modern', 'ancient', 'fresh', 'stale', 'hot', 'cold', 'warm', 'cool', 'wet', 'dry', 'hard', 'soft', 'strong', 'weak', 'fast', 'slow', 'quick', 'easy', 'difficult', 'hard', 'simple', 'complex', 'clear', 'unclear', 'right', 'wrong', 'correct', 'true', 'false', 'real', 'fake', 'full', 'empty', 'rich', 'poor', 'expensive', 'cheap', 'free', 'busy', 'quiet', 'loud', 'noisy', 'silent', 'safe', 'dangerous', 'careful', 'careless', 'important', 'necessary', 'useful', 'useless', 'possible', 'impossible', 'sure', 'certain', 'probable', 'likely', 'unlikely']
};

// Додаємо категорії до словника
let categorizedCount = 0;
vocabulary.forEach(item => {
  // Шукаємо категорію для слова
  let foundCategory = 'other';

  for (const [categoryName, words] of Object.entries(categories)) {
    if (words.includes(item.word.toLowerCase())) {
      foundCategory = categoryName;
      categorizedCount++;
      break;
    }
  }

  item.category = foundCategory;
});

console.log(`Categorized ${categorizedCount} words out of ${vocabulary.length}`);
console.log(`Words in "other" category: ${vocabulary.length - categorizedCount}`);

// Статистика по категоріям
const categoryStats = {};
vocabulary.forEach(item => {
  categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
});

console.log('\nCategory statistics:');
Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} words`);
});

// Зберігаємо оновлений словник
fs.writeFileSync('vocabulary.json', JSON.stringify(vocabulary, null, 2));
fs.writeFileSync('api/vocabulary.json', JSON.stringify(vocabulary, null, 2));

console.log('\nSaved to vocabulary.json and api/vocabulary.json');
