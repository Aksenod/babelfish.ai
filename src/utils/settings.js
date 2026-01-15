/**
 * Утилиты для работы с настройками из localStorage
 * Все функции получения настроек вынесены из translator.jsx для централизации и переиспользования
 */

/**
 * Загружает API ключи из localStorage
 * Всегда используем только localStorage - ключи не попадают в production бандл
 * Пользователь вводит ключи через Settings и они сохраняются в localStorage
 */
export const getApiKeys = () => {
  return {
    openai: localStorage.getItem('openai_api_key') || '',
    yandex: localStorage.getItem('yandex_api_key') || '',
    google: localStorage.getItem('google_api_key') || '',
  };
};

/**
 * Получает модель перевода из localStorage
 */
export const getTranslationModel = () => {
  return localStorage.getItem('translation_model') || 'yandex';
};

/**
 * Источник распознавания речи
 */
export const getTranscriptionSource = () => {
  return localStorage.getItem('transcription_source') || 'local_worker';
};

/**
 * Загружает настройки детекции голоса из localStorage
 */
export const getVoiceSettings = () => ({
  threshold: parseInt(localStorage.getItem('voice_threshold') || '30', 10),
  silenceDuration: parseInt(localStorage.getItem('silence_duration') || '1500', 10), // Уменьшено с 3000 до 1500 мс для более частых остановок записи
  minRecordingDuration: parseInt(localStorage.getItem('min_recording_duration') || '300', 10),
  voiceFreqMin: parseInt(localStorage.getItem('voice_freq_min') || '85', 10),
  voiceFreqMax: parseInt(localStorage.getItem('voice_freq_max') || '4000', 10),
  stabilityCheckSamples: parseInt(localStorage.getItem('stability_check_samples') || '3', 10),
  voiceEnergyRatio: parseFloat(localStorage.getItem('voice_energy_ratio') || '0.3', 10),
  stabilityCoefficient: parseFloat(localStorage.getItem('stability_coefficient') || '0.8', 10),
});

/**
 * Получает задержку объединения фрагментов из localStorage
 */
export const getMergeDelay = () => {
  return parseInt(localStorage.getItem('merge_delay') || '1000', 10); // Уменьшено с 2500 до 1000 мс для более частого появления сообщений
};

/**
 * Максимальная длительность одной непрерывной записи (мс)
 */
export const getMaxRecordingDuration = () => {
  const raw = parseInt(localStorage.getItem('max_recording_duration') || '20000', 10); // Уменьшено с 60000 до 20000 мс для более частых остановок записи
  if (Number.isNaN(raw) || raw <= 0) {
    return 20000;
  }
  // Ограничиваем разумный диапазон 5-120 секунд
  const min = 5000;
  const max = 120000;
  return Math.min(Math.max(raw, min), max);
};

/**
 * Получение настройки фильтра бессмысленного текста из localStorage
 */
export const getFilterMeaninglessText = () => {
  const value = localStorage.getItem('filter_meaningless_text');
  // По умолчанию true (фильтр включен) для обратной совместимости
  return value === null ? true : value === 'true';
};

/**
 * Получение параметров фильтра бессмысленного текста из localStorage
 */
export const getFilterMeaninglessOptions = () => {
  return {
    minTextLength: parseInt(localStorage.getItem('filter_min_text_length') || '3', 10),
    filterArtifacts: localStorage.getItem('filter_artifacts') === null ? true : localStorage.getItem('filter_artifacts') === 'true',
    filterInterjections: localStorage.getItem('filter_interjections') === null ? true : localStorage.getItem('filter_interjections') === 'true',
    filterShortPhrases: localStorage.getItem('filter_short_phrases') === null ? true : localStorage.getItem('filter_short_phrases') === 'true',
    minSingleWordLength: parseInt(localStorage.getItem('filter_min_single_word_length') || '2', 10),
  };
};

/**
 * Получение настроек авто-перевода из localStorage
 */
export const getAutoTranslateSettings = () => {
  const enabled = localStorage.getItem('auto_translate_enabled');
  const minChars = parseInt(localStorage.getItem('auto_translate_min_chars') || '100', 10);
  return {
    enabled: enabled === null ? true : enabled === 'true', // По умолчанию включено
    minChars: minChars || 100, // По умолчанию 100 символов (уменьшено для более частого появления сообщений)
  };
};

/**
 * Получение настроек разбиения на чанки из localStorage
 */
export const getChunkSettings = () => {
  const maxChars = parseInt(localStorage.getItem('chunk_max_chars') || '300', 10);
  const minChars = parseInt(localStorage.getItem('chunk_min_chars') || '50', 10);
  return {
    maxChars: maxChars || 300, // По умолчанию 300 символов
    minChars: minChars || 50, // По умолчанию 50 символов
  };
};

/**
 * Настройки отображения предложений
 */
export const getSentenceDisplaySettings = () => {
  const sentencesOnScreen = parseInt(localStorage.getItem('sentences_on_screen') || '2', 10);
  const showOriginal = localStorage.getItem('show_original');
  return {
    sentencesOnScreen: [1, 2, 3].includes(sentencesOnScreen) ? sentencesOnScreen : 2,
    showOriginal: showOriginal === null ? true : showOriginal === 'true',
  };
};
