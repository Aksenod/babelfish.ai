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
 * @param {Object} options - Параметры фильтрации
 * @param {number} options.minTextLength - Минимальная длина текста без знаков препинания (по умолчанию 3)
 * @param {boolean} options.filterArtifacts - Фильтровать артефакты распознавания (по умолчанию true)
 * @param {boolean} options.filterInterjections - Фильтровать междометия (по умолчанию true)
 * @param {boolean} options.filterShortPhrases - Фильтровать короткие фразы (по умолчанию true)
 * @param {number} options.minSingleWordLength - Минимальная длина одиночного слова (по умолчанию 2)
 * @returns {boolean} - true если текст осмысленный, false если его стоит пропустить
 */
export function isMeaningfulText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const {
    minTextLength = 3,
    filterArtifacts = true,
    filterInterjections = true,
    filterShortPhrases = true,
    minSingleWordLength = 2,
  } = options;

  const trimmed = text.trim();
  
  // Проверка на пустой текст
  if (trimmed.length === 0) {
    return false;
  }

  // Проверка на артефакты распознавания (звуки клавиатуры и т.п.)
  if (filterArtifacts && isLikelyArtifact(trimmed)) {
    return false;
  }

  // Удаляем знаки препинания для проверки минимальной длины
  const textWithoutPunctuation = trimmed.replace(/[.,!?;:—\-–'"()\[\]{}]/g, '').trim();
  
  // Минимальная длина текста без пробелов и знаков препинания
  if (textWithoutPunctuation.length < minTextLength) {
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
  if (filterInterjections) {
    const allWordsAreMeaningless = words.every(word => meaninglessWords.has(word));
    if (allWordsAreMeaningless) {
      return false;
    }
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
  if (filterShortPhrases && shortPhrases.has(normalizedText)) {
    return false;
  }

  // Также проверяем, если текст состоит из 1-4 слов и все они входят в список коротких фраз
  // Это поможет отфильтровать комбинации типа "thank you very much" (если "very much" тоже в списке)
  // Но для начала просто проверяем точное совпадение с короткими фразами

  // Если только одно слово и оно очень короткое, пропускаем
  if (words.length === 1 && words[0].length <= minSingleWordLength) {
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils.js:252',message:'hasCompleteSentences ENTRY',data:{textType:typeof text,textLength:text?.length,textSample:text?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  if (!text || typeof text !== 'string') {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils.js:254',message:'hasCompleteSentences EXIT early (invalid)',data:{textType:typeof text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return false;
  }

  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils.js:260',message:'hasCompleteSentences EXIT early (empty)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return false;
  }

  // Регулярное выражение для поиска законченных предложений:
  // [.!?] за которым следует пробел или конец строки
  // Учитываем, что после знака препинания может быть пробел или конец текста
  const completeSentencePattern = /[.!?](?:\s|$)/;
  const result = completeSentencePattern.test(trimmed);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils.js:268',message:'hasCompleteSentences EXIT with result',data:{trimmedLength:trimmed.length,patternMatch:result,textSample:trimmed.substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  return result;
}

/**
 * Разбивает длинный текст на чанки по границам предложений
 * Старается резать по границам предложений (`.`, `!`, `?` + пробел/конец строки)
 * Если предложение длиннее maxChars → режет по символам
 * @param {string} text - Текст для разбиения
 * @param {number} maxChars - Максимальная длина чанка (по умолчанию 300)
 * @param {number} minChunkSize - Минимальная длина чанка (по умолчанию 50). Чанки меньше этого размера объединяются со следующим, если возможно
 * @returns {string[]} - Массив чанков
 */
export function splitIntoSentenceChunks(text, maxChars = 300, minChunkSize = 50) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  // Если текст короче maxChars, возвращаем как есть
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const chunks = [];
  
  // Регулярное выражение для поиска границ предложений
  // Ищем: . ! ? за которыми следует пробел или конец строки
  const sentenceEndPattern = /([.!?])(\s+|$)/g;
  
  // Находим все границы предложений
  const sentenceEnds = [];
  let match;
  let lastIndex = 0;
  
  while ((match = sentenceEndPattern.exec(trimmed)) !== null) {
    const endIndex = match.index + match[1].length; // Позиция после знака препинания
    sentenceEnds.push({
      index: endIndex,
      fullMatch: match[0],
    });
    lastIndex = endIndex;
  }
  
  // Если нет границ предложений, режем по символам
  if (sentenceEnds.length === 0) {
    let currentIndex = 0;
    while (currentIndex < trimmed.length) {
      const chunk = trimmed.substring(currentIndex, currentIndex + maxChars);
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      currentIndex += maxChars;
    }
    return chunks.length > 0 ? chunks : [trimmed];
  }
  
  // Разбиваем по границам предложений
  let currentChunk = '';
  let currentChunkStart = 0;
  
  for (let i = 0; i < sentenceEnds.length; i++) {
    const sentenceEnd = sentenceEnds[i];
    const nextSentenceStart = i < sentenceEnds.length - 1 
      ? sentenceEnds[i + 1].index 
      : trimmed.length;
    
    // Текст от начала текущего предложения до конца следующего
    const sentenceText = trimmed.substring(
      currentChunkStart,
      nextSentenceStart
    ).trim();
    
    // Если одно предложение длиннее maxChars, режем его по символам
    if (sentenceText.length > maxChars) {
      // Сохраняем текущий чанк, если он не пустой
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Режем длинное предложение на части
      let sentenceIndex = currentChunkStart;
      while (sentenceIndex < nextSentenceStart) {
        const part = trimmed.substring(sentenceIndex, sentenceIndex + maxChars).trim();
        if (part.length > 0) {
          chunks.push(part);
        }
        sentenceIndex += maxChars;
      }
      
      currentChunkStart = nextSentenceStart;
      continue;
    }
    
    // Проверяем, поместится ли предложение в текущий чанк
    const potentialChunk = currentChunk 
      ? `${currentChunk} ${sentenceText}`.trim()
      : sentenceText;
    
    if (potentialChunk.length <= maxChars) {
      // Помещается - добавляем к текущему чанку
      currentChunk = potentialChunk;
    } else {
      // Не помещается - закрываем текущий чанк и начинаем новый
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentenceText;
    }
    
    currentChunkStart = nextSentenceStart;
  }
  
  // Добавляем последний чанк, если он не пустой
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Если остался текст после последней границы предложения
  if (lastIndex < trimmed.length) {
    const remainingText = trimmed.substring(lastIndex).trim();
    if (remainingText.length > 0) {
      if (remainingText.length <= maxChars) {
        // Если остаток короткий, пытаемся объединить с последним чанком
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const combined = `${lastChunk} ${remainingText}`.trim();
          if (combined.length <= maxChars) {
            chunks[chunks.length - 1] = combined;
          } else {
            chunks.push(remainingText);
          }
        } else {
          chunks.push(remainingText);
        }
      } else {
        // Если остаток длинный, режем по символам
        let remainingIndex = lastIndex;
        while (remainingIndex < trimmed.length) {
          const part = trimmed.substring(remainingIndex, remainingIndex + maxChars).trim();
          if (part.length > 0) {
            chunks.push(part);
          }
          remainingIndex += maxChars;
        }
      }
    }
  }
  
  // Объединяем слишком маленькие чанки со следующими
  const finalChunks = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Если чанк слишком маленький и есть следующий
    if (chunk.length < minChunkSize && i < chunks.length - 1) {
      const nextChunk = chunks[i + 1];
      const combined = `${chunk} ${nextChunk}`.trim();
      
      // Если объединенный чанк не превышает maxChars, объединяем
      if (combined.length <= maxChars) {
        finalChunks.push(combined);
        i++; // Пропускаем следующий чанк, так как мы его объединили
        continue;
      }
    }
    
    finalChunks.push(chunk);
  }
  
  // Фильтруем пустые чанки
  return finalChunks.filter(chunk => chunk.trim().length > 0);
}
