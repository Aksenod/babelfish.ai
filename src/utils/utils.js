export function randomId() {
  const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
  return uint32.toString(16);
}

/**
 * Проверяет, является ли текст результатом артефактов распознавания (например, звуки клавиатуры)
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true если текст похож на артефакт, false если нормальный
 */
export function isLikelyArtifact(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim().toLowerCase();
  
  // Разбиваем на слова
  const words = trimmed
    .replace(/[.,!?;:—\-–'"()\[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  if (words.length === 0) {
    return false;
  }
  
  // Проверка на повторяющиеся короткие слова (bye bye bye, no no no, etc.)
  if (words.length >= 2) {
    const uniqueWords = new Set(words);
    // Если все слова одинаковые и короткие (<= 4 символа)
    if (uniqueWords.size === 1 && words[0].length <= 4 && words.length >= 2) {
      return true;
    }
    
    // Если много повторений одного короткого слова
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    const totalWords = words.length;
    
    for (const [word, count] of Object.entries(wordCounts)) {
      const wordLength = word.length;
      const repetitionRatio = count / totalWords;
      
      // Для очень коротких слов (1-2 символа): >= 3 повторения
      if (wordLength <= 2 && count >= 3) {
        return true;
      }
      
      // Для коротких слов (3-4 символа): проверяем процент повторений
      // Если слово составляет >= 30% текста и встречается >= 3 раза - это артефакт
      // Но только если текст короткий (<= 15 слов) - в длинных текстах это нормально
      if (wordLength >= 3 && wordLength <= 4) {
        if (count >= 3 && repetitionRatio >= 0.3 && totalWords <= 15) {
          return true;
        }
        // Для очень коротких текстов (<= 5 слов) даже 2 повторения могут быть артефактом
        if (count >= 2 && repetitionRatio >= 0.4 && totalWords <= 5) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Проверяет, является ли текст осмысленным и стоит ли его обрабатывать
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true если текст осмысленный, false если его стоит пропустить
 */
export function isMeaningfulText(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  
  // Проверка на пустой текст
  if (trimmed.length === 0) {
    return false;
  }

  // Проверка на артефакты распознавания (звуки клавиатуры и т.п.)
  if (isLikelyArtifact(trimmed)) {
    return false;
  }

  // Удаляем знаки препинания для проверки минимальной длины
  const textWithoutPunctuation = trimmed.replace(/[.,!?;:—\-–'"()\[\]{}]/g, '').trim();
  
  // Минимальная длина текста без пробелов и знаков препинания должна быть не менее 3 символов
  if (textWithoutPunctuation.length < 3) {
    return false;
  }

  // Разбиваем на слова (учитываем разные языки)
  const words = trimmed
    .toLowerCase()
    .replace(/[.,!?;:—\-–'"()\[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);

  // Если нет слов (только знаки препинания)
  if (words.length === 0) {
    return false;
  }

  // Список междометий и бессмысленных звуков (английский и русский)
  const meaninglessWords = new Set([
    // Английские междометия
    'uh', 'um', 'ah', 'eh', 'oh', 'hmm', 'hm', 'er', 'erm', 'uhm',
    'a', 'e', 'o', 'i', 'u', // Одиночные гласные
    'mm', 'mmm', 'huh', 'ha', 'heh', 'hah',
    // Русские междометия
    'э', 'ээ', 'эм', 'мм', 'м', 'а', 'аа', 'о', 'оо', 'у', 'уу',
    'хм', 'хмм', 'ага', 'угу', 'эх', 'ох', 'ах',
    // Общие звуки
    'tsk', 'tut', 'psst', 'shh', 'shhh',
  ]);

  // Если все слова - это междометия, текст бессмысленный
  const allWordsAreMeaningless = words.every(word => meaninglessWords.has(word));
  if (allWordsAreMeaningless) {
    return false;
  }

  // Список коротких фраз-приветствий/прощаний, которые часто появляются случайно при печати
  // Эти фразы обычно короткие (1-4 слова) и не несут смысловой нагрузки в контексте перевода
  const shortPhrases = new Set([
    // Английские приветствия и прощания
    'thank you',
    'thanks',
    'bye',
    'bye bye',
    'bye-bye',
    'goodbye',
    'good bye',
    'hi',
    'hello',
    'hey',
    'ok',
    'okay',
    'yes',
    'no',
    'sure',
    'alright',
    'all right',
    'see you',
    'see ya',
    'take care',
    'have a nice day',
    'good morning',
    'good afternoon',
    'good evening',
    'good night',
    'nice to meet you',
    'how are you',
    'how do you do',
    'please',
    'excuse me',
    'sorry',
    'pardon',
    'pardon me',
    // Русские приветствия и прощания
    'спасибо',
    'пожалуйста',
    'до свидания',
    'пока',
    'пока пока',
    'привет',
    'здравствуй',
    'здравствуйте',
    'да',
    'нет',
    'хорошо',
    'ладно',
    'ок',
    'окей',
    'извините',
    'простите',
    'будь здоров',
    'счастливо',
    'удачи',
    'всего доброго',
    'до встречи',
    'увидимся',
  ]);

  // Нормализуем текст для сравнения (убираем знаки препинания, приводим к нижнему регистру)
  const normalizedText = trimmed
    .toLowerCase()
    .replace(/[.,!?;:—\-–'"()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Проверяем, является ли весь текст одной из коротких фраз
  // Это помогает отфильтровать случайные распознавания при печати
  if (shortPhrases.has(normalizedText)) {
    return false;
  }

  // Также проверяем, если текст состоит из 1-4 слов и все они входят в список коротких фраз
  // Это поможет отфильтровать комбинации типа "thank you very much" (если "very much" тоже в списке)
  // Но для начала просто проверяем точное совпадение с короткими фразами

  // Если только одно слово и оно очень короткое (1-2 символа), пропускаем
  if (words.length === 1 && words[0].length <= 2) {
    return false;
  }

  // Дополнительная проверка: если текст состоит только из одного очень короткого слова (3 символа),
  // и это не распространенное слово, пропускаем
  if (words.length === 1 && words[0].length === 3) {
    // Список распространенных коротких слов, которые могут быть осмысленными
    const commonShortWords = new Set([
      'yes', 'no', 'not', 'now', 'new', 'old', 'big', 'hot', 'red', 'bad', 'sad', 'mad',
      'day', 'way', 'may', 'say', 'pay', 'try', 'why', 'who', 'how', 'two', 'one',
      'да', 'нет', 'не', 'но', 'он', 'она', 'они', 'мы', 'вы', 'ты', 'мой', 'твой',
      'мир', 'дом', 'сон', 'день', 'ночь', 'рука', 'нога', 'голова', 'вода', 'огонь',
    ]);
    
    if (!commonShortWords.has(words[0])) {
      return false;
    }
  }

  // Проверка на случайные одиночные буквы или звуки
  // Если текст состоит из 1-2 символов и это не распространенное слово, пропускаем
  if (trimmed.length <= 2 && words.length === 1) {
    const commonSingleChars = new Set(['a', 'i', 'o', 'u', 'я', 'я', 'а', 'о', 'у', 'и', 'ы', 'э']);
    if (!commonSingleChars.has(trimmed.toLowerCase())) {
      return false;
    }
  }

  // Если текст прошел все проверки, считаем его осмысленным
  return true;
}

/**
 * Проверяет, есть ли в тексте законченные предложения
 * Законченное предложение = точка, восклицательный или вопросительный знак,
 * за которым следует пробел или конец текста
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true если есть законченные предложения, false если нет
 */
export function hasCompleteSentences(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return false;
  }

  // Регулярное выражение для поиска законченных предложений:
  // [.!?] за которым следует пробел или конец строки
  // Учитываем, что после знака препинания может быть пробел или конец текста
  const completeSentencePattern = /[.!?](?:\s|$)/;
  
  return completeSentencePattern.test(trimmed);
}
