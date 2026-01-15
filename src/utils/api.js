/**
 * API utilities for transcription and translation
 */

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {Blob} audioBlob - Audio blob to transcribe
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBlob, apiKey) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const blobSize = audioBlob.size;
  const startTime = Date.now();
  
  // Определяем расширение файла на основе MIME типа
  let fileExtension = 'webm';
  let fileName = 'audio.webm';
  if (audioBlob.type) {
    if (audioBlob.type.includes('webm')) {
      fileExtension = 'webm';
      fileName = 'audio.webm';
    } else if (audioBlob.type.includes('ogg')) {
      fileExtension = 'ogg';
      fileName = 'audio.ogg';
    } else if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) {
      fileExtension = 'mp4';
      fileName = 'audio.mp4';
    } else if (audioBlob.type.includes('wav')) {
      fileExtension = 'wav';
      fileName = 'audio.wav';
    }
  }
  
  console.log('[API:transcribe] Начало распознавания речи', {
    blobSize,
    blobSizeKB: (blobSize / 1024).toFixed(2),
    blobSizeMB: (blobSize / (1024 * 1024)).toFixed(2),
    mimeType: audioBlob.type || 'unknown',
    fileExtension,
    timestamp: new Date().toISOString(),
  });

  const formData = new FormData();
  formData.append('file', audioBlob, fileName);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[API:transcribe] Ошибка распознавания', {
        status: response.status,
        error: errorMessage,
        blobSize,
        blobSizeKB: (blobSize / 1024).toFixed(2),
        mimeType: audioBlob.type || 'unknown',
        fileExtension,
        duration: Date.now() - startTime,
      });
      
      // Если ошибка связана с форматом файла, даем более понятное сообщение
      if (errorMessage.includes('Invalid file format') || errorMessage.includes('file format')) {
        throw new Error(`Неподдерживаемый формат аудио. MIME тип: ${audioBlob.type || 'unknown'}. Попробуйте использовать другой формат записи.`);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const transcribedText = data.text;
    const duration = Date.now() - startTime;
    
    console.log('[API:transcribe] Распознавание завершено', {
      text: transcribedText,
      textLength: transcribedText.length,
      duration,
      durationSeconds: (duration / 1000).toFixed(2),
      timestamp: new Date().toISOString(),
    });

    return transcribedText;
  } catch (err) {
    console.error('[API:transcribe] Исключение при распознавании', {
      error: err.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

/**
 * Translate text using Google Cloud Translation API
 * @param {string} text - Text to translate
 * @param {string} apiKey - Google API key
 * @returns {Promise<string>} Translated text
 */
export async function translateTextGoogle(text, apiKey) {
  if (!apiKey) {
    throw new Error('Google API key is required');
  }

  if (!text || text.trim().length === 0) {
    console.log('[API:translate:google] Пропуск перевода - пустой текст');
    return '';
  }

  const startTime = Date.now();
  console.log('[API:translate:google] Начало перевода', {
    originalText: text,
    textLength: text.length,
    timestamp: new Date().toISOString(),
  });

  // Google Cloud Translation API v2
  const apiUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  const requestBody = {
    q: text,
    target: 'ru',
    source: 'en',
    format: 'text',
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[API:translate:google] Ошибка перевода', {
        status: response.status,
        error: errorMessage,
        duration: Date.now() - startTime,
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;
    const duration = Date.now() - startTime;

    console.log('[API:translate:google] Перевод завершен', {
      originalText: text,
      translatedText,
      originalLength: text.length,
      translatedLength: translatedText.length,
      duration,
      durationSeconds: (duration / 1000).toFixed(2),
      timestamp: new Date().toISOString(),
    });

    return translatedText;
  } catch (err) {
    console.error('[API:translate:google] Исключение при переводе', {
      error: err.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

/**
 * Translate text using Yandex Translate API
 * @param {string} text - Text to translate
 * @param {string} apiKey - Yandex API key
 * @returns {Promise<string>} Translated text
 */
export async function translateTextYandex(text, apiKey) {
  if (!apiKey) {
    throw new Error('Yandex API key is required');
  }

  if (!text || text.trim().length === 0) {
    console.log('[API:translate:yandex] Пропуск перевода - пустой текст');
    return '';
  }

  const startTime = Date.now();
  console.log('[API:translate:yandex] Начало перевода', {
    originalText: text,
    textLength: text.length,
    timestamp: new Date().toISOString(),
  });

  // В режиме разработки используем Vite proxy, в production используем serverless прокси
  const isDev = import.meta.env.DEV;
  // VITE_YANDEX_PROXY_URL должен быть задан в .env файле для production
  // Например: VITE_YANDEX_PROXY_URL=https://your-proxy.vercel.app/api/yandex-translate
  const proxyUrl = import.meta.env.VITE_YANDEX_PROXY_URL;
  
  const apiUrl = isDev 
    ? '/api/yandex-translate'
    : proxyUrl || 'https://translate.api.cloud.yandex.net/translate/v2/translate';

  const requestBody = {
    texts: [text],
    targetLanguageCode: 'ru',
    sourceLanguageCode: 'en',
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      const errorMessage = error.message || `API error: ${response.status}`;
      console.error('[API:translate:yandex] Ошибка перевода', {
        status: response.status,
        error: errorMessage,
        duration: Date.now() - startTime,
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const translatedText = data.translations[0].text;
    const duration = Date.now() - startTime;

    console.log('[API:translate:yandex] Перевод завершен', {
      originalText: text,
      translatedText,
      originalLength: text.length,
      translatedLength: translatedText.length,
      duration,
      durationSeconds: (duration / 1000).toFixed(2),
      timestamp: new Date().toISOString(),
    });

    return translatedText;
  } catch (err) {
    console.error('[API:translate:yandex] Исключение при переводе', {
      error: err.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

/**
 * Translate text using specified translation service
 * @param {string} text - Text to translate
 * @param {string} apiKey - API key for the translation service
 * @param {string} model - Translation model ('yandex' or 'google')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, apiKey, model = 'yandex') {
  if (model === 'google') {
    return translateTextGoogle(text, apiKey);
  } else {
    return translateTextYandex(text, apiKey);
  }
}

/**
 * Estimate approximate token count for text
 * Rough estimation: ~4 chars per token for English, ~2-3 for Russian
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokenCount(text) {
  if (!text) return 0;
  // Более консервативная оценка: учитываем смешанный контент
  // Примерно 3.5 символа на токен для смешанного английского/русского текста
  return Math.ceil(text.length / 3.5);
}

/**
 * Split messages into chunks that fit within token limit
 * @param {Array} messages - Array of message objects
 * @param {number} maxTokensPerChunk - Maximum tokens per chunk
 * @returns {Array<Array>} Array of message chunks
 */
function splitMessagesIntoChunks(messages, maxTokensPerChunk) {
  const chunks = [];
  let currentChunk = [];
  let currentChunkTokens = 0;

  for (const msg of messages) {
    const original = msg.original || '';
    const translated = msg.translated || null;
    
    // Формируем текст сообщения для оценки токенов
    let messageText;
    if (translated) {
      messageText = `${currentChunk.length + 1}. [EN] ${original}\n    [RU] ${translated}`;
    } else {
      messageText = `${currentChunk.length + 1}. [EN] ${original}`;
    }
    
    const messageTokens = estimateTokenCount(messageText);
    const separatorTokens = 2; // Примерно 2 токена на разделитель между сообщениями
    
    // Если добавление этого сообщения превысит лимит, начинаем новый чанк
    if (currentChunkTokens + messageTokens + separatorTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkTokens = 0;
    }
    
    currentChunk.push(msg);
    currentChunkTokens += messageTokens + separatorTokens;
  }
  
  // Добавляем последний чанк, если он не пустой
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Generate summary for a single chunk of messages
 * @param {Array} messages - Array of message objects
 * @param {string} context - Context string
 * @param {string} apiKey - OpenAI API key
 * @param {string} customPrompt - Custom prompt template
 * @param {boolean} isChunk - Whether this is a chunk (affects prompt)
 * @returns {Promise<string>} Generated summary
 */
async function generateSummaryForChunk(messages, context, apiKey, customPrompt, isChunk = false) {
  // Формируем список сообщений для промпта
  const messagesText = messages
    .map((msg, index) => {
      const original = msg.original || '';
      const translated = msg.translated || null;
      
      if (translated) {
        return `${index + 1}. [EN] ${original}\n    [RU] ${translated}`;
      } else {
        return `${index + 1}. [EN] ${original}`;
      }
    })
    .join('\n\n');

  // Формируем промпт
  let prompt;
  
  if (customPrompt && customPrompt.trim().length > 0) {
    prompt = customPrompt.trim();
    prompt = prompt.replace(/{messages}/g, messagesText);
    
    if (context && context.trim().length > 0) {
      prompt = prompt.replace(/{context}/g, context.trim());
    } else {
      prompt = prompt.replace(/{context}/g, '');
      prompt = prompt.replace(/\n{3,}/g, '\n\n');
    }
  } else {
    if (isChunk) {
      // Для чанка используем упрощенный промпт
      prompt = `Ниже представлены сообщения из части сессии перевода:\n\n${messagesText}\n\n`;
      prompt += `Создай краткое саммари этой части на русском языке, выделив основные темы и важные детали.`;
    } else {
      // Дефолтный промпт для полного набора сообщений
      prompt = `Ты - помощник для создания подробного саммари сессий перевода.\n\n`;

      if (context && context.trim().length > 0) {
        prompt += `Контекст: ${context.trim()}\n\n`;
      }

      prompt += `Ниже представлены сообщения из сессии перевода (оригинальные тексты на английском и их переводы на русский):\n\n${messagesText}\n\n`;
      prompt += `Создай подробное саммари этой сессии на русском языке. Саммари должно включать:\n`;
      prompt += `- Основные темы и вопросы, обсуждавшиеся в сессии\n`;
      prompt += `- Ключевые решения или выводы\n`;
      prompt += `- Важные детали, упомянутые в разговоре\n`;
      prompt += `- Любую другую релевантную информацию\n\n`;
      
      if (context && context.trim().length > 0) {
        prompt += `Учитывай указанный контекст при создании саммари.`;
      }
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Ты - помощник для создания подробных и информативных саммари сессий перевода. Отвечай только на русском языке.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: isChunk ? 1000 : 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMessage = error.error?.message || `API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Generate summary for session using GPT-4o API
 * Automatically splits large requests into chunks if needed
 * @param {Array} messages - Array of message objects with 'original' field
 * @param {string} context - Context string from settings (optional)
 * @param {string} apiKey - OpenAI API key
 * @param {string} customPrompt - Custom prompt template (optional)
 * @returns {Promise<string>} Generated summary
 */
export async function generateSummary(messages, context, apiKey, customPrompt = null) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  if (!messages || messages.length === 0) {
    throw new Error('Messages are required for summary generation');
  }

  const startTime = Date.now();
  console.log('[API:summary] Начало генерации саммари', {
    messagesCount: messages.length,
    hasContext: !!context,
    hasCustomPrompt: !!customPrompt,
    timestamp: new Date().toISOString(),
  });

  // Формируем список сообщений для оценки размера
  const messagesText = messages
    .map((msg, index) => {
      const original = msg.original || '';
      const translated = msg.translated || null;
      
      if (translated) {
        return `${index + 1}. [EN] ${original}\n    [RU] ${translated}`;
      } else {
        return `${index + 1}. [EN] ${original}`;
      }
    })
    .join('\n\n');

  // Формируем базовый промпт для оценки размера
  let basePrompt;
  if (customPrompt && customPrompt.trim().length > 0) {
    basePrompt = customPrompt.trim();
    basePrompt = basePrompt.replace(/{messages}/g, messagesText);
    if (context && context.trim().length > 0) {
      basePrompt = basePrompt.replace(/{context}/g, context.trim());
    } else {
      basePrompt = basePrompt.replace(/{context}/g, '');
      basePrompt = basePrompt.replace(/\n{3,}/g, '\n\n');
    }
  } else {
    basePrompt = `Ты - помощник для создания подробного саммари сессий перевода.\n\n`;
    if (context && context.trim().length > 0) {
      basePrompt += `Контекст: ${context.trim()}\n\n`;
    }
    basePrompt += `Ниже представлены сообщения из сессии перевода (оригинальные тексты на английском и их переводы на русский):\n\n${messagesText}\n\n`;
    basePrompt += `Создай подробное саммари этой сессии на русском языке. Саммари должно включать:\n`;
    basePrompt += `- Основные темы и вопросы, обсуждавшиеся в сессии\n`;
    basePrompt += `- Ключевые решения или выводы\n`;
    basePrompt += `- Важные детали, упомянутые в разговоре\n`;
    basePrompt += `- Любую другую релевантную информацию\n\n`;
    if (context && context.trim().length > 0) {
      basePrompt += `Учитывай указанный контекст при создании саммари.`;
    }
  }

  // Добавляем системное сообщение к оценке
  const systemMessage = 'Ты - помощник для создания подробных и информативных саммари сессий перевода. Отвечай только на русском языке.';
  const estimatedTokens = estimateTokenCount(systemMessage) + estimateTokenCount(basePrompt);
  
  // Безопасный лимит: 25000 токенов (оставляем запас для ответа и системного сообщения)
  const MAX_TOKENS_PER_REQUEST = 25000;
  const needsChunking = estimatedTokens > MAX_TOKENS_PER_REQUEST;

  console.log('[API:summary] Оценка размера запроса', {
    estimatedTokens,
    needsChunking,
    maxTokensPerRequest: MAX_TOKENS_PER_REQUEST,
  });

  try {
    let summary;

    if (needsChunking) {
      // Разбиваем сообщения на чанки
      // Вычитаем токены для промпта и системного сообщения, оставляем место для ответа
      const maxTokensPerChunk = MAX_TOKENS_PER_REQUEST - estimateTokenCount(systemMessage) - 500; // 500 для промпта чанка
      const chunks = splitMessagesIntoChunks(messages, maxTokensPerChunk);
      
      console.log('[API:summary] Разбивка на чанки', {
        totalChunks: chunks.length,
        chunksSizes: chunks.map(chunk => chunk.length),
      });

      // Генерируем промежуточные саммари для каждого чанка
      const chunkSummaries = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[API:summary] Обработка чанка ${i + 1}/${chunks.length}`);
        const chunkSummary = await generateSummaryForChunk(
          chunks[i],
          context,
          apiKey,
          customPrompt,
          true // isChunk = true
        );
        chunkSummaries.push(chunkSummary);
        
        // Небольшая задержка между запросами, чтобы не превысить rate limit
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Объединяем промежуточные саммари в финальное
      const combinedSummaries = chunkSummaries
        .map((summary, index) => `## Часть ${index + 1}\n\n${summary}`)
        .join('\n\n');

      let finalPromptFull = `Ниже представлены промежуточные саммари разных частей одной сессии перевода:\n\n${combinedSummaries}\n\n`;
      finalPromptFull += `Создай единое подробное саммари всей сессии на русском языке, объединив информацию из всех частей. Саммари должно включать:\n`;
      finalPromptFull += `- Основные темы и вопросы, обсуждавшиеся в сессии\n`;
      finalPromptFull += `- Ключевые решения или выводы\n`;
      finalPromptFull += `- Важные детали, упомянутые в разговоре\n`;
      finalPromptFull += `- Любую другую релевантную информацию\n\n`;
      if (context && context.trim().length > 0) {
        finalPromptFull += `Учитывай указанный контекст: ${context.trim()}`;
      }

      const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: finalPromptFull
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!finalResponse.ok) {
        const error = await finalResponse.json().catch(() => ({ error: { message: 'Unknown error' } }));
        const errorMessage = error.error?.message || `API error: ${finalResponse.status}`;
        throw new Error(errorMessage);
      }

      const finalData = await finalResponse.json();
      summary = finalData.choices[0]?.message?.content || '';
    } else {
      // Обычная генерация без разбивки
      summary = await generateSummaryForChunk(messages, context, apiKey, customPrompt, false);
    }

    const duration = Date.now() - startTime;

    console.log('[API:summary] Генерация саммари завершена', {
      summaryLength: summary.length,
      duration,
      durationSeconds: (duration / 1000).toFixed(2),
      usedChunking: needsChunking,
      timestamp: new Date().toISOString(),
    });

    return summary.trim();
  } catch (err) {
    console.error('[API:summary] Исключение при генерации саммари', {
      error: err.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}
