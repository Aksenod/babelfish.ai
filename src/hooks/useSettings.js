/**
 * Хук для реактивного доступа к настройкам из localStorage
 * Автоматически обновляется при изменении localStorage
 */

import { useState, useEffect } from 'react';
import {
  getApiKeys,
  getTranslationModel,
  getVoiceSettings,
  getMergeDelay,
  getMaxRecordingDuration,
  getFilterMeaninglessText,
  getFilterMeaninglessOptions,
  getAutoTranslateSettings,
  getChunkSettings,
  getSentenceDisplaySettings,
  getTranscriptionSource,
} from '../utils/settings';

/**
 * Хук для получения всех настроек реактивно
 * @returns {Object} Объект со всеми настройками
 */
export const useSettings = () => {
  const [settingsVersion, setSettingsVersion] = useState(0);

  // Обновляем версию при изменении localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Обновляем при любом изменении в localStorage (для простоты)
      // Можно оптимизировать, проверяя конкретные ключи
      if (e.key && (
        e.key.startsWith('openai_') ||
        e.key.startsWith('yandex_') ||
        e.key.startsWith('google_') ||
        e.key.startsWith('translation_') ||
        e.key.startsWith('voice_') ||
        e.key.startsWith('silence_') ||
        e.key.startsWith('min_recording_') ||
        e.key.startsWith('merge_') ||
        e.key.startsWith('max_recording_') ||
        e.key.startsWith('filter_') ||
        e.key.startsWith('auto_translate_') ||
        e.key.startsWith('chunk_') ||
        e.key.startsWith('sentences_') ||
        e.key.startsWith('show_original') ||
        e.key.startsWith('transcription_')
      )) {
        setSettingsVersion((prev) => prev + 1);
      }
    };

    // Слушаем изменения в localStorage (из других вкладок/окон)
    window.addEventListener('storage', handleStorageChange);

    // Также слушаем изменения в текущем окне через кастомное событие
    // (localStorage события не срабатывают в том же окне)
    const handleCustomStorageChange = () => {
      setSettingsVersion((prev) => prev + 1);
    };
    
    // Создаем кастомное событие для отслеживания изменений в текущем окне
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(...args) {
      originalSetItem.apply(this, args);
      window.dispatchEvent(new Event('localStorageChange'));
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  // Возвращаем все настройки (пересчитываются при изменении settingsVersion)
  return {
    apiKeys: getApiKeys(),
    translationModel: getTranslationModel(),
    voiceSettings: getVoiceSettings(),
    mergeDelay: getMergeDelay(),
    maxRecordingDuration: getMaxRecordingDuration(),
    filterMeaninglessText: getFilterMeaninglessText(),
    filterMeaninglessOptions: getFilterMeaninglessOptions(),
    autoTranslateSettings: getAutoTranslateSettings(),
    chunkSettings: getChunkSettings(),
    sentenceDisplaySettings: getSentenceDisplaySettings(),
    transcriptionSource: getTranscriptionSource(),
  };
};
