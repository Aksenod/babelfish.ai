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
  console.log('[API:transcribe] Начало распознавания речи', {
    blobSize,
    blobSizeKB: (blobSize / 1024).toFixed(2),
    blobSizeMB: (blobSize / (1024 * 1024)).toFixed(2),
    timestamp: new Date().toISOString(),
  });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
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
        duration: Date.now() - startTime,
      });
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
 * Generate summary for session using GPT-4o API
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

  // Формируем список сообщений для промпта (включая оригинал и перевод)
  const messagesText = messages
    .map((msg, index) => {
      const original = msg.original || '';
      const translated = msg.translated || null;
      
      if (translated) {
        // Если есть перевод, показываем оба текста
        return `${index + 1}. [EN] ${original}\n    [RU] ${translated}`;
      } else {
        // Если перевода нет, показываем только оригинал
        return `${index + 1}. [EN] ${original}`;
      }
    })
    .join('\n\n');

  // Формируем промпт
  let prompt;
  
  if (customPrompt && customPrompt.trim().length > 0) {
    // Используем кастомный промпт, заменяя плейсхолдер {messages} на список сообщений
    prompt = customPrompt.trim();
    prompt = prompt.replace(/{messages}/g, messagesText);
    
    // Заменяем плейсхолдер {context}
    if (context && context.trim().length > 0) {
      prompt = prompt.replace(/{context}/g, context.trim());
    } else {
      // Если контекст пустой, удаляем строки, содержащие только {context} или пустые строки после удаления
      prompt = prompt.replace(/{context}/g, '');
      // Удаляем пустые строки (более 2 переносов подряд)
      prompt = prompt.replace(/\n{3,}/g, '\n\n');
    }
  } else {
    // Дефолтный промпт
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

  try {
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = error.error?.message || `API error: ${response.status}`;
      console.error('[API:summary] Ошибка генерации саммари', {
        status: response.status,
        error: errorMessage,
        duration: Date.now() - startTime,
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || '';
    const duration = Date.now() - startTime;

    console.log('[API:summary] Генерация саммари завершена', {
      summaryLength: summary.length,
      duration,
      durationSeconds: (duration / 1000).toFixed(2),
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
