/**
 * Сервис для разбиения текста на чанки и их перевода
 * Использует flushSync для решения проблемы батчинга React
 */

import { flushSync } from 'react-dom';
import { splitIntoSentenceChunks } from '../utils/utils';
import { translateText } from '../utils/api';
import { addMessageToSession, updateMessageInSession } from '../utils/sessionManager';
import { generateMessageId } from '../utils/messageIdGenerator';
import {
  getChunkSettings,
  getTranslationModel,
  getApiKeys,
} from '../utils/settings';

/**
 * Создает и переводит сообщения с разбиением на чанки
 * Использует flushSync для принудительного применения обновлений и предотвращения батчинга
 * 
 * @param {string} text - Текст для разбиения и перевода
 * @param {number|undefined} baseMessageId - Базовый ID для сообщения (опционально)
 * @param {string} source - Источник сообщения (для логирования)
 * @param {Function} setMessages - Функция обновления состояния сообщений
 * @param {Object} sessionIdRef - Ref с текущим sessionId
 * @returns {Promise<void>}
 */
export const createAndTranslateChunks = async (
  text,
  baseMessageId,
  source = 'unknown',
  setMessages,
  sessionIdRef
) => {
  const { maxChars, minChars } = getChunkSettings();
  const translationModel = getTranslationModel();
  const { openai, yandex, google } = getApiKeys();
  
  if (!openai || !(yandex || google)) {
    console.error('[CHUNK:error] Нет API ключей для перевода');
    return;
  }
  
  const translationApiKey = translationModel === 'google' ? google : yandex;
  
  // Разбиваем текст на чанки
  const chunks = splitIntoSentenceChunks(text, maxChars, minChars);
  
  console.log('[CHUNK:split] Текст разбит на чанки', {
    source,
    originalLength: text.length,
    chunksCount: chunks.length,
    maxChars,
    minChars,
    chunks: chunks.map((chunk, i) => ({
      index: i,
      length: chunk.length,
      preview: chunk.substring(0, 50) + '...',
    })),
    timestamp: new Date().toISOString(),
  });
  
  // Если только один чанк, обрабатываем как обычно
  if (chunks.length <= 1) {
    // Генерируем валидный ID, если не предоставлен или невалиден
    const messageId = (typeof baseMessageId === 'number' && !isNaN(baseMessageId) && isFinite(baseMessageId))
      ? baseMessageId
      : generateMessageId();
    const newMessage = {
      id: messageId,
      original: text,
      translated: null,
      timestamp: new Date(),
    };
    
    // Используем flushSync для принудительного применения обновления
    flushSync(() => {
      setMessages((prev) => [...prev, newMessage]);
    });
    
    if (sessionIdRef.current) {
      try {
        addMessageToSession(sessionIdRef.current, newMessage);
      } catch (err) {
        console.error('Error saving message to session:', err);
      }
    }
    
    // Переводим
    translateText(text, translationApiKey, translationModel)
      .then((translatedText) => {
        // Используем flushSync для принудительного применения обновления
        flushSync(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, translated: translatedText }
                : msg
            )
          );
        });
        
        if (sessionIdRef.current) {
          try {
            updateMessageInSession(sessionIdRef.current, messageId, { translated: translatedText });
          } catch (err) {
            console.error('Error updating message in session:', err);
          }
        }
        
        console.log('[CHUNK:translate] Перевод завершен (один чанк)', {
          source,
          messageId,
          originalLength: text.length,
          translatedLength: translatedText.length,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((err) => {
        console.error('[CHUNK:translate] Ошибка перевода:', err, {
          source,
          messageId,
          timestamp: new Date().toISOString(),
        });
      });
    
    return;
  }
  
  // Если несколько чанков, создаем отдельные сообщения
  console.log('[CHUNK:multi] Создание множественных сообщений из чанков', {
    source,
    chunksCount: chunks.length,
    baseMessageId,
    timestamp: new Date().toISOString(),
  });
  
  // Генерируем базовый ID, если не предоставлен или невалиден
  const validBaseMessageId = (typeof baseMessageId === 'number' && !isNaN(baseMessageId) && isFinite(baseMessageId))
    ? baseMessageId
    : generateMessageId();
  
  // Создаем и переводим каждый чанк с постепенным отображением
  // Используем flushSync для принудительного применения каждого обновления
  chunks.forEach((chunk, i) => {
    // Генерируем уникальный ID для каждого чанка
    const chunkMessageId = validBaseMessageId + i;
    
    // Добавляем задержку для постепенного отображения (300мс между сообщениями для лучшей видимости)
    setTimeout(() => {
      const chunkMessage = {
        id: chunkMessageId,
        original: chunk,
        translated: null,
        timestamp: new Date(),
      };
      
      // Используем flushSync для принудительного применения обновления
      // Это гарантирует, что каждое сообщение добавляется синхронно, без батчинга
      flushSync(() => {
        setMessages((prev) => {
          // Проверяем, что сообщение еще не существует (на случай повторного вызова)
          const exists = prev.some(msg => msg.id === chunkMessageId);
          if (exists) {
            return prev;
          }
          return [...prev, chunkMessage];
        });
      });
      
      // Сохраняем в сессию
      if (sessionIdRef.current) {
        try {
          addMessageToSession(sessionIdRef.current, chunkMessage);
        } catch (err) {
          console.error('Error saving chunk message to session:', err);
        }
      }
      
      // Переводим чанк асинхронно
      translateText(chunk, translationApiKey, translationModel)
        .then((translatedChunk) => {
          console.log('[CHUNK:translate] Чанк переведен', {
            source,
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            originalLength: chunk.length,
            translatedLength: translatedChunk.length,
            timestamp: new Date().toISOString(),
          });
          
          // Используем flushSync для принудительного применения обновления перевода
          flushSync(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === chunkMessageId
                  ? { ...msg, translated: translatedChunk }
                  : msg
              )
            );
          });
          
          // Сохраняем перевод в сессию
          if (sessionIdRef.current) {
            try {
              updateMessageInSession(sessionIdRef.current, chunkMessageId, { translated: translatedChunk });
            } catch (err) {
              console.error('Error updating chunk message in session:', err);
            }
          }
        })
        .catch((err) => {
          console.error('[CHUNK:translate] Ошибка перевода чанка:', err, {
            source,
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            chunkLength: chunk.length,
            timestamp: new Date().toISOString(),
          });
        });
    }, i * 300); // Увеличена задержка до 300мс для более заметного эффекта постепенного появления
  });
  
  console.log('[CHUNK:complete] Все чанки созданы и отправлены на перевод', {
    source,
    chunksCount: chunks.length,
    originalLength: text.length,
    timestamp: new Date().toISOString(),
  });
};
