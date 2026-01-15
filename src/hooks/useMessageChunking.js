/**
 * Хук для управления разбиением сообщений на чанки
 * Инкапсулирует логику работы с chunkService
 */

import { useCallback } from 'react';
import { createAndTranslateChunks as createAndTranslateChunksService } from '../services/chunkService';

/**
 * Хук для работы с разбиением сообщений на чанки
 * @param {Function} setMessages - Функция обновления состояния сообщений
 * @param {Object} sessionIdRef - Ref с текущим sessionId
 * @returns {Function} Функция для создания и перевода чанков
 */
export const useMessageChunking = (setMessages, sessionIdRef) => {
  /**
   * Создает и переводит сообщения с разбиением на чанки
   * @param {string} text - Текст для разбиения и перевода
   * @param {number|undefined} baseMessageId - Базовый ID для сообщения (опционально)
   * @param {string} source - Источник сообщения (для логирования)
   * @returns {Promise<void>}
   */
  const createAndTranslateChunks = useCallback(
    async (text, baseMessageId, source = 'unknown') => {
      return createAndTranslateChunksService(text, baseMessageId, source, setMessages, sessionIdRef);
    },
    [setMessages, sessionIdRef]
  );

  return {
    createAndTranslateChunks,
  };
};
