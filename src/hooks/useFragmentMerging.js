/**
 * Хук для управления объединением фрагментов
 * Инкапсулирует логику работы с буфером фрагментов и их объединением по времени
 */

import { useRef, useCallback } from 'react';
import { getMergeDelay, getAutoTranslateSettings } from '../utils/settings';

/**
 * Хук для работы с объединением фрагментов
 * @param {Function} shouldAutoTranslate - Функция проверки авто-перевода
 * @param {Function} getAutoTranslateMetrics - Функция получения метрик авто-перевода
 * @returns {Object} Объект с функциями и refs для работы с фрагментами
 */
export const useFragmentMerging = (shouldAutoTranslate, getAutoTranslateMetrics) => {
  const pendingFragmentsRef = useRef([]); // Буфер для фрагментов, ожидающих объединения
  const lastFragmentTimeRef = useRef(null); // Время последнего фрагмента

  /**
   * Обрабатывает новый фрагмент текста
   * Определяет, нужно ли объединять с предыдущими фрагментами или добавить в буфер
   * @param {string} transcribedText - Распознанный текст
   * @returns {Object} Результат обработки: { finalText, shouldMerge, shouldAutoTranslateFlag, autoTranslateTrigger }
   */
  const processFragment = useCallback((transcribedText) => {
    const currentTime = Date.now();
    const mergeWindow = getMergeDelay();
    
    // Вычисляем время с последнего фрагмента
    const timeSinceLastFragment = lastFragmentTimeRef.current 
      ? currentTime - lastFragmentTimeRef.current 
      : Infinity;
    
    console.log('[MERGE:check] Проверка условий объединения', {
      timeSinceLastFragment: timeSinceLastFragment === Infinity ? 'first_fragment' : `${timeSinceLastFragment}ms`,
      mergeWindow: `${mergeWindow}ms`,
      bufferSize: pendingFragmentsRef.current.length,
      bufferContents: pendingFragmentsRef.current.map((f, i) => ({
        index: i,
        text: f.text,
        age: `${currentTime - f.timestamp}ms`,
      })),
      currentText: transcribedText,
      canMerge: timeSinceLastFragment <= mergeWindow && pendingFragmentsRef.current.length > 0,
      timestamp: new Date().toISOString(),
    });
    
    let finalText = transcribedText.trim();
    let shouldMerge = false;
    let shouldAutoTranslateFlag = false;
    let autoTranslateTrigger = null; // 'buffer' | 'after_merge' | null

    // Если есть недавние фрагменты (в пределах окна объединения)
    if (timeSinceLastFragment <= mergeWindow && pendingFragmentsRef.current.length > 0) {
      shouldMerge = true;
      // Объединяем все фрагменты из буфера с текущим текстом
      const previousTexts = pendingFragmentsRef.current.map(f => f.text).join(' ');
      finalText = `${previousTexts} ${finalText}`.trim();
      
      console.log('[MERGE:merge] Объединение фрагментов', {
        previousFragments: pendingFragmentsRef.current.length,
        previousTexts,
        currentText: transcribedText,
        finalText,
        timeSinceLastFragment: `${timeSinceLastFragment}ms`,
        mergeWindow: `${mergeWindow}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Если прошло больше времени или буфер пуст, добавляем текущий фрагмент в буфер
      const reason = timeSinceLastFragment === Infinity 
        ? 'first_fragment' 
        : timeSinceLastFragment > mergeWindow 
          ? 'timeout' 
          : 'empty_buffer';
      
      pendingFragmentsRef.current.push({
        text: transcribedText.trim(),
        timestamp: currentTime,
      });
      
      console.log('[MERGE:buffer] Фрагмент добавлен в буфер', {
        reason,
        fragmentText: transcribedText,
        bufferSize: pendingFragmentsRef.current.length,
        timeSinceLastFragment: timeSinceLastFragment === Infinity ? 'first' : `${timeSinceLastFragment}ms`,
        bufferContents: pendingFragmentsRef.current.map((f, i) => ({
          index: i,
          text: f.text,
          age: `${currentTime - f.timestamp}ms`,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // ПРОВЕРКА: автоматическая отправка при достижении настроенного количества символов с законченными предложениями
    if (!shouldMerge) {
      // Если не было объединения, проверяем весь буфер (включая только что добавленный фрагмент)
      const allFragmentsText = pendingFragmentsRef.current.map(f => f.text).join(' ');
      const combinedTextForCheck = allFragmentsText.trim();
      
      if (shouldAutoTranslate && shouldAutoTranslate(combinedTextForCheck)) {
        console.log('[AUTO:translate] Условие автоматической отправки выполнено', {
          textLength: combinedTextForCheck.length,
          bufferSize: pendingFragmentsRef.current.length,
          combinedText: combinedTextForCheck.substring(0, 100) + '...',
          timestamp: new Date().toISOString(),
        });

        // Всегда выводим лог авто-отправки
        if (getAutoTranslateMetrics) {
          const { rawLength, trimmedLength, remainingToThreshold } = getAutoTranslateMetrics(combinedTextForCheck);
          const { minChars } = getAutoTranslateSettings();
          console.log('[AUTO:send] Авто-отправка: отправляем буфер на перевод', {
            trigger: 'buffer',
            minChars,
            rawLength,
            trimmedLength,
            remainingToThreshold,
            bufferSize: pendingFragmentsRef.current.length,
            timestamp: new Date().toISOString(),
          });
        }
        
        shouldAutoTranslateFlag = true;
        autoTranslateTrigger = 'buffer';
        shouldMerge = true; // Используем существующую логику объединения
        finalText = combinedTextForCheck;
        
        // Очищаем буфер, так как отправляем на перевод
        console.log('[AUTO:buffer] Очистка буфера после автоматической отправки', {
          clearedFragments: pendingFragmentsRef.current.length,
          timestamp: new Date().toISOString(),
        });
        pendingFragmentsRef.current = [];
      }
    } else {
      // Если было объединение, проверяем объединенный текст
      if (shouldAutoTranslate && shouldAutoTranslate(finalText)) {
        console.log('[AUTO:translate] Условие автоматической отправки выполнено (после объединения)', {
          textLength: finalText.length,
          timestamp: new Date().toISOString(),
        });

        // Всегда выводим лог авто-отправки
        if (getAutoTranslateMetrics) {
          const { rawLength, trimmedLength, remainingToThreshold } = getAutoTranslateMetrics(finalText);
          const { minChars } = getAutoTranslateSettings();
          console.log('[AUTO:send] Авто-отправка: отправляем объединенный текст на перевод', {
            trigger: 'after_merge',
            minChars,
            rawLength,
            trimmedLength,
            remainingToThreshold,
            timestamp: new Date().toISOString(),
          });
        }
        
        shouldAutoTranslateFlag = true;
        autoTranslateTrigger = 'after_merge';
      }
    }

    // Обновляем время последнего фрагмента
    lastFragmentTimeRef.current = currentTime;

    return {
      finalText,
      shouldMerge,
      shouldAutoTranslateFlag,
      autoTranslateTrigger,
    };
  }, [shouldAutoTranslate, getAutoTranslateMetrics]);

  /**
   * Очищает буфер фрагментов
   */
  const clearBuffer = useCallback(() => {
    const clearedCount = pendingFragmentsRef.current.length;
    pendingFragmentsRef.current = [];
    console.log('[MERGE:buffer] Буфер очищен', {
      clearedFragments: clearedCount,
      timestamp: new Date().toISOString(),
    });
  }, []);

  /**
   * Получает накопленный текст из буфера
   * @returns {string} Объединенный текст всех фрагментов в буфере
   */
  const getAccumulatedText = useCallback(() => {
    return pendingFragmentsRef.current.map(f => f.text).join(' ').trim();
  }, []);

  /**
   * Получает размер буфера
   * @returns {number} Количество фрагментов в буфере
   */
  const getBufferSize = useCallback(() => {
    return pendingFragmentsRef.current.length;
  }, []);

  return {
    pendingFragmentsRef,
    lastFragmentTimeRef,
    processFragment,
    clearBuffer,
    getAccumulatedText,
    getBufferSize,
  };
};
