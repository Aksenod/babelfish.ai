import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Constants
const DRAWER_ANIMATION_DURATION = 300; // ms

const TRANSLATION_MODELS = [
  { value: 'yandex', label: 'Яндекс.Переводчик' },
  { value: 'google', label: 'Google Translate' },
  // Можно добавить другие модели позже
  // { value: 'openai', label: 'OpenAI GPT' },
];

export default function Settings({ isOpen, onClose }) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [yandexKey, setYandexKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [translationModel, setTranslationModel] = useState('yandex');
  const [voiceThreshold, setVoiceThreshold] = useState(30);
  const [silenceDuration, setSilenceDuration] = useState(3000);
  const [mergeDelay, setMergeDelay] = useState(2500);
  const [minRecordingDuration, setMinRecordingDuration] = useState(300);
  const [voiceFreqMin, setVoiceFreqMin] = useState(85);
  const [voiceFreqMax, setVoiceFreqMax] = useState(4000);
  const [stabilityCheckSamples, setStabilityCheckSamples] = useState(3);
  const [voiceEnergyRatio, setVoiceEnergyRatio] = useState(0.3);
  const [stabilityCoefficient, setStabilityCoefficient] = useState(0.8);
  const [filterMeaninglessText, setFilterMeaninglessText] = useState(true);
  const [minTextLength, setMinTextLength] = useState(3);
  const [filterArtifacts, setFilterArtifacts] = useState(true);
  const [filterInterjections, setFilterInterjections] = useState(true);
  const [filterShortPhrases, setFilterShortPhrases] = useState(true);
  const [minSingleWordLength, setMinSingleWordLength] = useState(2);
  const [sessionContext, setSessionContext] = useState('');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
  const [autoTranslateMinChars, setAutoTranslateMinChars] = useState(300);
  const [chunkMaxChars, setChunkMaxChars] = useState(300);
  const [chunkMinChars, setChunkMinChars] = useState(50);
  const [maxRecordingDuration, setMaxRecordingDuration] = useState(60000);
  const [isApiKeysExpanded, setIsApiKeysExpanded] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Load settings from localStorage only (для безопасности - ключи не попадают в production бандл)
    // В dev режиме можно использовать .env файл, но ключи не должны попадать в production
    const savedOpenaiKey = localStorage.getItem('openai_api_key') || '';
    const savedYandexKey = localStorage.getItem('yandex_api_key') || '';
    const savedGoogleKey = localStorage.getItem('google_api_key') || '';
    const savedModel = localStorage.getItem('translation_model') || 'yandex';
    const savedVoiceThreshold = parseInt(localStorage.getItem('voice_threshold') || '30', 10);
    const savedSilenceDuration = parseInt(localStorage.getItem('silence_duration') || '3000', 10);
    const savedMergeDelay = parseInt(localStorage.getItem('merge_delay') || '2500', 10);
    const savedMinRecordingDuration = parseInt(localStorage.getItem('min_recording_duration') || '300', 10);
    const savedVoiceFreqMin = parseInt(localStorage.getItem('voice_freq_min') || '85', 10);
    const savedVoiceFreqMax = parseInt(localStorage.getItem('voice_freq_max') || '4000', 10);
    const savedStabilityCheckSamples = parseInt(localStorage.getItem('stability_check_samples') || '3', 10);
    const savedVoiceEnergyRatio = parseFloat(localStorage.getItem('voice_energy_ratio') || '0.3', 10);
    const savedStabilityCoefficient = parseFloat(localStorage.getItem('stability_coefficient') || '0.8', 10);
    const savedFilterMeaninglessText = localStorage.getItem('filter_meaningless_text');
    const savedMinTextLength = parseInt(localStorage.getItem('filter_min_text_length') || '3', 10);
    const savedFilterArtifacts = localStorage.getItem('filter_artifacts');
    const savedFilterInterjections = localStorage.getItem('filter_interjections');
    const savedFilterShortPhrases = localStorage.getItem('filter_short_phrases');
    const savedMinSingleWordLength = parseInt(localStorage.getItem('filter_min_single_word_length') || '2', 10);
    const savedSessionContext = localStorage.getItem('session_context') || '';
    const savedAutoTranslateEnabled = localStorage.getItem('auto_translate_enabled');
    const savedAutoTranslateMinChars = parseInt(localStorage.getItem('auto_translate_min_chars') || '300', 10);
    const savedChunkMaxChars = parseInt(localStorage.getItem('chunk_max_chars') || '300', 10);
    const savedChunkMinChars = parseInt(localStorage.getItem('chunk_min_chars') || '50', 10);
    const savedMaxRecordingDuration = parseInt(localStorage.getItem('max_recording_duration') || '60000', 10);
    
    setOpenaiKey(savedOpenaiKey);
    setYandexKey(savedYandexKey);
    setGoogleKey(savedGoogleKey);
    setTranslationModel(savedModel);
    setVoiceThreshold(savedVoiceThreshold);
    setSilenceDuration(savedSilenceDuration);
    setMergeDelay(savedMergeDelay);
    setMinRecordingDuration(savedMinRecordingDuration);
    setVoiceFreqMin(savedVoiceFreqMin);
    setVoiceFreqMax(savedVoiceFreqMax);
    setStabilityCheckSamples(savedStabilityCheckSamples);
    setVoiceEnergyRatio(savedVoiceEnergyRatio);
    setStabilityCoefficient(savedStabilityCoefficient);
    setFilterMeaninglessText(savedFilterMeaninglessText === null ? true : savedFilterMeaninglessText === 'true');
    setMinTextLength(savedMinTextLength);
    setFilterArtifacts(savedFilterArtifacts === null ? true : savedFilterArtifacts === 'true');
    setFilterInterjections(savedFilterInterjections === null ? true : savedFilterInterjections === 'true');
    setFilterShortPhrases(savedFilterShortPhrases === null ? true : savedFilterShortPhrases === 'true');
    setMinSingleWordLength(savedMinSingleWordLength);
    setSessionContext(savedSessionContext);
    setAutoTranslateEnabled(savedAutoTranslateEnabled === null ? true : savedAutoTranslateEnabled === 'true');
    setAutoTranslateMinChars(savedAutoTranslateMinChars);
    setChunkMaxChars(savedChunkMaxChars);
    setChunkMinChars(savedChunkMinChars);
    setMaxRecordingDuration(savedMaxRecordingDuration);
  }, []);

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleTab = (e) => {
      if (!modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Focus first input when modal opens
    const focusTimer = setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    }, DRAWER_ANIMATION_DURATION);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('yandex_api_key', yandexKey);
    localStorage.setItem('google_api_key', googleKey);
    localStorage.setItem('translation_model', translationModel);
    localStorage.setItem('voice_threshold', voiceThreshold.toString());
    localStorage.setItem('silence_duration', silenceDuration.toString());
    localStorage.setItem('merge_delay', mergeDelay.toString());
    localStorage.setItem('min_recording_duration', minRecordingDuration.toString());
    localStorage.setItem('voice_freq_min', voiceFreqMin.toString());
    localStorage.setItem('voice_freq_max', voiceFreqMax.toString());
    localStorage.setItem('stability_check_samples', stabilityCheckSamples.toString());
    localStorage.setItem('voice_energy_ratio', voiceEnergyRatio.toString());
    localStorage.setItem('stability_coefficient', stabilityCoefficient.toString());
    localStorage.setItem('filter_meaningless_text', filterMeaninglessText.toString());
    localStorage.setItem('filter_min_text_length', minTextLength.toString());
    localStorage.setItem('filter_artifacts', filterArtifacts.toString());
    localStorage.setItem('filter_interjections', filterInterjections.toString());
    localStorage.setItem('filter_short_phrases', filterShortPhrases.toString());
    localStorage.setItem('filter_min_single_word_length', minSingleWordLength.toString());
    localStorage.setItem('session_context', sessionContext);
    localStorage.setItem('auto_translate_enabled', autoTranslateEnabled.toString());
    localStorage.setItem('auto_translate_min_chars', autoTranslateMinChars.toString());
    localStorage.setItem('chunk_max_chars', chunkMaxChars.toString());
    localStorage.setItem('chunk_min_chars', chunkMinChars.toString());
    localStorage.setItem('max_recording_duration', maxRecordingDuration.toString());
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[10000] transform transition-transform duration-300 ease-in-out overflow-y-auto custom-scrollbar rounded-l-3xl ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="3" y2="3"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
            </div>
            <h2 id="settings-title" className="text-2xl font-bold text-slate-800">Настройки</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Закрыть настройки"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Совет:</strong> Ключи можно хранить в файле <code className="bg-blue-100 px-1 rounded">.env</code> в корне проекта. 
              Ключи из файла используются автоматически, если не указаны в localStorage.
            </p>
          </div>

          {/* Collapsible API Keys Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsApiKeysExpanded(!isApiKeysExpanded)}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-expanded={isApiKeysExpanded}
              aria-controls="api-keys-content"
            >
              <h3 className="text-lg font-semibold text-gray-800">API Ключи</h3>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${isApiKeysExpanded ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isApiKeysExpanded && (
              <div id="api-keys-content" className="p-4 space-y-4">
                <div>
                  <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    id="openai-key"
                    ref={firstInputRef}
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    aria-describedby="openai-help"
                  />
                  <p id="openai-help" className="text-sm text-gray-500 mt-1">
                    <>
                      Получите ключ на{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      >
                        platform.openai.com
                      </a>
                    </>
                  </p>
                </div>

                <div>
                  <label htmlFor="yandex-key" className="block text-sm font-medium text-gray-700 mb-2">
                    Яндекс.Переводчик API Key
                  </label>
                  <input
                    id="yandex-key"
                    type="password"
                    value={yandexKey}
                    onChange={(e) => setYandexKey(e.target.value)}
                    placeholder="AQVN..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    aria-describedby="yandex-help"
                  />
                  <p id="yandex-help" className="text-sm text-gray-500 mt-1">
                    <>
                      Получите ключ в{' '}
                      <a
                        href="https://console.cloud.yandex.ru/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      >
                        Yandex Cloud Console
                      </a>
                      {' '}(1M символов/день бесплатно)
                    </>
                  </p>
                </div>

                <div>
                  <label htmlFor="google-key" className="block text-sm font-medium text-gray-700 mb-2">
                    Google Translate API Key
                  </label>
                  <input
                    id="google-key"
                    type="password"
                    value={googleKey}
                    onChange={(e) => setGoogleKey(e.target.value)}
                    placeholder="0ead1e6d..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    aria-describedby="google-help"
                  />
                  <p id="google-help" className="text-sm text-gray-500 mt-1">
                    <>
                      Получите ключ в{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      >
                        Google Cloud Console
                      </a>
                    </>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="translation-model" className="block text-sm font-medium text-gray-700 mb-2">
              Модель перевода
            </label>
            <select
              id="translation-model"
              value={translationModel}
              onChange={(e) => setTranslationModel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {TRANSLATION_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Автоматический перевод</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="auto-translate-enabled" className="block text-sm font-medium text-gray-700 mb-1">
                    Включить автоматический перевод
                  </label>
                  <p className="text-xs text-gray-500">
                    Автоматически отправлять накопленный текст на перевод при достижении заданного количества символов
                  </p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="auto-translate-enabled"
                      type="checkbox"
                      checked={autoTranslateEnabled}
                      onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {autoTranslateEnabled && (
                <>
                  <div>
                    <label htmlFor="auto-translate-min-chars" className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальное количество символов для авто-перевода
                    </label>
                    <input
                      id="auto-translate-min-chars"
                      type="number"
                      min="50"
                      max="2000"
                      step="50"
                      value={autoTranslateMinChars}
                      onChange={(e) => setAutoTranslateMinChars(parseInt(e.target.value, 10) || 300)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="auto-translate-min-chars-help"
                    />
                    <p id="auto-translate-min-chars-help" className="text-sm text-gray-500 mt-1">
                      Авто-перевод сработает, когда накопленный текст достигнет этого количества символов и будет содержать законченные предложения (50-2000 символов, по умолчанию: 300)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="chunk-max-chars" className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальный размер чанка для разбиения (символов)
                    </label>
                    <input
                      id="chunk-max-chars"
                      type="number"
                      min="100"
                      max="1000"
                      step="50"
                      value={chunkMaxChars}
                      onChange={(e) => setChunkMaxChars(parseInt(e.target.value, 10) || 300)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="chunk-max-chars-help"
                    />
                    <p id="chunk-max-chars-help" className="text-sm text-gray-500 mt-1">
                      Длинные тексты будут разбиты на чанки этого размера по границам предложений (100-1000 символов, по умолчанию: 300). Это помогает читать переводы в реальном времени.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="chunk-min-chars" className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальный размер чанка (символов)
                    </label>
                    <input
                      id="chunk-min-chars"
                      type="number"
                      min="20"
                      max="200"
                      step="10"
                      value={chunkMinChars}
                      onChange={(e) => setChunkMinChars(parseInt(e.target.value, 10) || 50)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="chunk-min-chars-help"
                    />
                    <p id="chunk-min-chars-help" className="text-sm text-gray-500 mt-1">
                      Чанки меньше этого размера будут объединены со следующим, если это возможно (20-200 символов, по умолчанию: 50)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Контекст сессий</h3>
            <div>
              <label htmlFor="session-context" className="block text-sm font-medium text-gray-700 mb-2">
                Контекст для саммари сессий
              </label>
              <textarea
                id="session-context"
                value={sessionContext}
                onChange={(e) => setSessionContext(e.target.value)}
                placeholder="Например: все сессии относятся к команде по разработке онбординга клиентов в банке в Индии"
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
                aria-describedby="session-context-help"
              />
              <p id="session-context-help" className="text-sm text-gray-500 mt-1">
                Этот контекст будет учитываться при создании саммари сессий через GPT. Оставьте пустым, если контекст не нужен.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Настройки распознавания речи</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="voice-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                  Порог чувствительности
                </label>
                <input
                  id="voice-threshold"
                  type="number"
                  min="1"
                  max="100"
                  value={voiceThreshold}
                  onChange={(e) => setVoiceThreshold(parseInt(e.target.value, 10) || 30)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  aria-describedby="voice-threshold-help"
                />
                <p id="voice-threshold-help" className="text-sm text-gray-500 mt-1">
                  Чем выше значение, тем громче должна быть речь для начала записи (1-100, по умолчанию: 30)
                </p>
              </div>

              <div>
                <label htmlFor="silence-duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Длительность тишины (мс)
                </label>
                <input
                  id="silence-duration"
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={silenceDuration}
                  onChange={(e) => setSilenceDuration(parseInt(e.target.value, 10) || 2000)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  aria-describedby="silence-duration-help"
                />
                <p id="silence-duration-help" className="text-sm text-gray-500 mt-1">
                  Время тишины перед автоматической остановкой записи (500-10000 мс, по умолчанию: 2000)
                </p>
              </div>

              <div>
                <label htmlFor="merge-delay" className="block text-sm font-medium text-gray-700 mb-2">
                  Задержка объединения (мс)
                </label>
                <input
                  id="merge-delay"
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={mergeDelay}
                  onChange={(e) => setMergeDelay(parseInt(e.target.value, 10) || 2500)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  aria-describedby="merge-delay-help"
                />
                <p id="merge-delay-help" className="text-sm text-gray-500 mt-1">
                  Время ожидания для объединения близких фрагментов речи (500-10000 мс, по умолчанию: 2500)
                </p>
              </div>
            </div>
          </div>

          {/* Filtering Settings Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-expanded={isFilterExpanded}
                aria-controls="filter-settings-content"
              >
                <h3 className="text-lg font-semibold text-gray-800">Настройки фильтрации</h3>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${isFilterExpanded ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isFilterExpanded && (
                <div id="filter-settings-content" className="p-4 space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      ⚙️ <strong>Продвинутые настройки:</strong> Эти параметры помогают фильтровать звуки клавиатуры и другие неречевые звуки. 
                      Изменяйте только если понимаете их назначение.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="min-recording-duration" className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальная длительность записи (мс)
                    </label>
                    <input
                      id="min-recording-duration"
                      type="number"
                      min="100"
                      max="2000"
                      step="50"
                      value={minRecordingDuration}
                      onChange={(e) => setMinRecordingDuration(parseInt(e.target.value, 10) || 300)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="min-recording-duration-help"
                    />
                    <p id="min-recording-duration-help" className="text-sm text-gray-500 mt-1">
                      Записи короче этого времени будут игнорироваться (100-2000 мс, по умолчанию: 300). Помогает отфильтровать короткие щелчки.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="max-recording-duration" className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальная длительность одной записи (мс)
                    </label>
                    <input
                      id="max-recording-duration"
                      type="number"
                      min="5000"
                      max="120000"
                      step="1000"
                      value={maxRecordingDuration}
                      onChange={(e) => setMaxRecordingDuration(parseInt(e.target.value, 10) || 60000)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="max-recording-duration-help"
                    />
                    <p id="max-recording-duration-help" className="text-sm text-gray-500 mt-1">
                      Запись будет автоматически остановлена и отправлена на распознавание после достижения этого времени (5000-120000 мс, по умолчанию: 60000). Это позволяет получать сообщения по частям в процессе длинной речи.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="voice-freq-min" className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальная частота речи (Гц)
                    </label>
                    <input
                      id="voice-freq-min"
                      type="number"
                      min="50"
                      max="500"
                      step="5"
                      value={voiceFreqMin}
                      onChange={(e) => setVoiceFreqMin(parseInt(e.target.value, 10) || 85)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="voice-freq-min-help"
                    />
                    <p id="voice-freq-min-help" className="text-sm text-gray-500 mt-1">
                      Нижняя граница речевого диапазона частот (50-500 Гц, по умолчанию: 85). Звуки ниже этой частоты игнорируются.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="voice-freq-max" className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальная частота речи (Гц)
                    </label>
                    <input
                      id="voice-freq-max"
                      type="number"
                      min="2000"
                      max="8000"
                      step="100"
                      value={voiceFreqMax}
                      onChange={(e) => setVoiceFreqMax(parseInt(e.target.value, 10) || 4000)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="voice-freq-max-help"
                    />
                    <p id="voice-freq-max-help" className="text-sm text-gray-500 mt-1">
                      Верхняя граница речевого диапазона частот (2000-8000 Гц, по умолчанию: 4000). Основная энергия речи находится в этом диапазоне.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="stability-check-samples" className="block text-sm font-medium text-gray-700 mb-2">
                      Количество проверок стабильности
                    </label>
                    <input
                      id="stability-check-samples"
                      type="number"
                      min="2"
                      max="10"
                      step="1"
                      value={stabilityCheckSamples}
                      onChange={(e) => setStabilityCheckSamples(parseInt(e.target.value, 10) || 3)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="stability-check-samples-help"
                    />
                    <p id="stability-check-samples-help" className="text-sm text-gray-500 mt-1">
                      Количество проверок для определения стабильности сигнала (2-10, по умолчанию: 3). Речь более стабильна, чем щелчки клавиатуры.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="voice-energy-ratio" className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальная доля энергии в речевом диапазоне
                    </label>
                    <input
                      id="voice-energy-ratio"
                      type="number"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={voiceEnergyRatio}
                      onChange={(e) => setVoiceEnergyRatio(parseFloat(e.target.value) || 0.3)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="voice-energy-ratio-help"
                    />
                    <p id="voice-energy-ratio-help" className="text-sm text-gray-500 mt-1">
                      Минимальная доля энергии сигнала в речевом диапазоне (0.1-1.0, по умолчанию: 0.3). Чем выше, тем строже фильтрация.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="stability-coefficient" className="block text-sm font-medium text-gray-700 mb-2">
                      Коэффициент стабильности
                    </label>
                    <input
                      id="stability-coefficient"
                      type="number"
                      min="0.3"
                      max="2.0"
                      step="0.1"
                      value={stabilityCoefficient}
                      onChange={(e) => setStabilityCoefficient(parseFloat(e.target.value) || 0.8)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      aria-describedby="stability-coefficient-help"
                    />
                    <p id="stability-coefficient-help" className="text-sm text-gray-500 mt-1">
                      Максимальный коэффициент вариации для стабильного сигнала (0.3-2.0, по умолчанию: 0.8). Чем ниже, тем строже фильтрация нестабильных звуков.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label htmlFor="filter-meaningless-text" className="block text-sm font-medium text-gray-700 mb-1">
                          Фильтровать бессмысленный текст
                        </label>
                        <p className="text-xs text-gray-500">
                          Включить фильтрацию текста, который может быть артефактом распознавания (междометия, повторения и т.д.)
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="filter-meaningless-text"
                            type="checkbox"
                            checked={filterMeaninglessText}
                            onChange={(e) => setFilterMeaninglessText(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {filterMeaninglessText && (
                    <div className="pt-4 space-y-4 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-blue-800">
                          💡 <strong>Параметры фильтрации:</strong> Настройте параметры фильтра бессмысленного текста для более точной работы.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="min-text-length" className="block text-sm font-medium text-gray-700 mb-2">
                          Минимальная длина текста (символов)
                        </label>
                        <input
                          id="min-text-length"
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          value={minTextLength}
                          onChange={(e) => setMinTextLength(parseInt(e.target.value, 10) || 3)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          aria-describedby="min-text-length-help"
                        />
                        <p id="min-text-length-help" className="text-sm text-gray-500 mt-1">
                          Минимальная длина текста без знаков препинания (1-10 символов, по умолчанию: 3). Более короткие тексты будут отфильтрованы.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="min-single-word-length" className="block text-sm font-medium text-gray-700 mb-2">
                          Минимальная длина одиночного слова (символов)
                        </label>
                        <input
                          id="min-single-word-length"
                          type="number"
                          min="1"
                          max="5"
                          step="1"
                          value={minSingleWordLength}
                          onChange={(e) => setMinSingleWordLength(parseInt(e.target.value, 10) || 2)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          aria-describedby="min-single-word-length-help"
                        />
                        <p id="min-single-word-length-help" className="text-sm text-gray-500 mt-1">
                          Минимальная длина одиночного слова (1-5 символов, по умолчанию: 2). Более короткие одиночные слова будут отфильтрованы.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label htmlFor="filter-artifacts" className="block text-sm font-medium text-gray-700 mb-1">
                              Фильтровать артефакты
                            </label>
                            <p className="text-xs text-gray-500">
                              Фильтровать повторяющиеся слова и звуки клавиатуры (bye bye bye, no no no и т.д.)
                            </p>
                          </div>
                          <div className="ml-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                id="filter-artifacts"
                                type="checkbox"
                                checked={filterArtifacts}
                                onChange={(e) => setFilterArtifacts(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label htmlFor="filter-interjections" className="block text-sm font-medium text-gray-700 mb-1">
                              Фильтровать междометия
                            </label>
                            <p className="text-xs text-gray-500">
                              Фильтровать междометия и бессмысленные звуки (uh, um, эм, хм и т.д.)
                            </p>
                          </div>
                          <div className="ml-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                id="filter-interjections"
                                type="checkbox"
                                checked={filterInterjections}
                                onChange={(e) => setFilterInterjections(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label htmlFor="filter-short-phrases" className="block text-sm font-medium text-gray-700 mb-1">
                              Фильтровать короткие фразы
                            </label>
                            <p className="text-xs text-gray-500">
                              Фильтровать короткие приветствия и прощания (hi, bye, привет, пока и т.д.)
                            </p>
                          </div>
                          <div className="ml-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                id="filter-short-phrases"
                                type="checkbox"
                                checked={filterShortPhrases}
                                onChange={(e) => setFilterShortPhrases(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-white/20">
          <button
            type="button"
            onClick={handleSave}
            className="w-full px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3 rounded-full ui-glass-panel-thin border border-white/40 text-slate-700 hover:text-slate-800 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all active:scale-95 font-medium"
          >
            Отмена
          </button>
        </div>
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
