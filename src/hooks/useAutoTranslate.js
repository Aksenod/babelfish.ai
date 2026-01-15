/**
 * Хук для логики авто-перевода
 * Содержит функции проверки условий авто-перевода и метрики
 */

import { useCallback } from 'react';
import { getAutoTranslateSettings } from '../utils/settings';
import { hasCompleteSentences } from '../utils/utils';

/**
 * Включает подробные логи авто-перевода в dev (и опционально в prod через localStorage)
 * localStorage: debug_auto_translate = "1"
 */
const isAutoTranslateDebugEnabled = () =>
  import.meta.env.DEV || localStorage.getItem('debug_auto_translate') === '1';

/**
 * Хук для работы с авто-переводом
 * @returns {Object} Объект с функциями для работы с авто-переводом
 */
export const useAutoTranslate = () => {
  /**
   * Получает метрики текста для авто-перевода
   * @param {string} text - Текст для анализа
   * @returns {Object} Метрики текста
   */
  const getAutoTranslateMetrics = useCallback((text) => {
    const raw = typeof text === 'string' ? text : '';
    const trimmed = raw.trim();
    const rawLength = raw.length;
    const trimmedLength = trimmed.length;
    const { minChars } = getAutoTranslateSettings();
    const remainingToThreshold = Math.max(0, minChars - trimmedLength);
    return { rawLength, trimmedLength, remainingToThreshold };
  }, []);

  /**
   * Проверка условия автоматической отправки на перевод
   * Возвращает true, если авто-перевод включен, текст >= minChars символов И есть законченные предложения
   * @param {string} text - Текст для проверки
   * @returns {boolean} true, если нужно выполнить авто-перевод
   */
  const shouldAutoTranslate = useCallback((text) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:145',message:'shouldAutoTranslate ENTRY',data:{textType:typeof text,textLength:text?.length,textSample:text?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Проверяем, включен ли авто-перевод
    const { enabled, minChars } = getAutoTranslateSettings();
    if (!enabled) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:150',message:'shouldAutoTranslate EXIT early (disabled)',data:{enabled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return false;
    }
    
    if (!text || typeof text !== 'string') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:152',message:'shouldAutoTranslate EXIT early (invalid input)',data:{textType:typeof text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return false;
    }

    const trimmed = text.trim();
    const { rawLength, trimmedLength, remainingToThreshold } = getAutoTranslateMetrics(text);
    
    // Проверяем длину текста (все символы, включая пробелы и знаки препинания)
    const passesLength = trimmedLength >= minChars;
    const hasSentences = passesLength ? hasCompleteSentences(trimmed) : false;
    const shouldSend = passesLength && hasSentences;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:162',message:'shouldAutoTranslate BEFORE length check',data:{rawLength,trimmedLength,remainingToThreshold,minChars,passesLength},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Диагностический лог (без полного текста, чтобы не засорять консоль/не светить данные)
    if (isAutoTranslateDebugEnabled() && (passesLength || trimmedLength >= Math.max(0, minChars - 80))) {
      console.log('[AUTO:check] Проверка авто-отправки', {
        countingRule: 'trim().length (включая пробелы/знаки, кроме ведущих/хвостовых пробелов)',
        minChars,
        rawLength,
        trimmedLength,
        remainingToThreshold,
        passesLength,
        hasCompleteSentences: hasSentences,
        result: shouldSend,
        sample: trimmed.substring(0, 80),
        timestamp: new Date().toISOString(),
      });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:180',message:'shouldAutoTranslate EXIT with result',data:{passesLength,hasSentences,shouldSend,trimmedLength,minChars},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    return shouldSend;
  }, [getAutoTranslateMetrics]);

  return {
    shouldAutoTranslate,
    getAutoTranslateMetrics,
  };
};
