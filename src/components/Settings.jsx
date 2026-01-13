import { useState, useEffect, useRef } from 'react';

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
  const [isApiKeysExpanded, setIsApiKeysExpanded] = useState(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

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
    
    setOpenaiKey(savedOpenaiKey);
    setYandexKey(savedYandexKey);
    setGoogleKey(savedGoogleKey);
    setTranslationModel(savedModel);
    setVoiceThreshold(savedVoiceThreshold);
    setSilenceDuration(savedSilenceDuration);
    setMergeDelay(savedMergeDelay);
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
    setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
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
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="settings-title" className="text-2xl font-bold text-gray-800">Настройки</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
            aria-label="Закрыть настройки"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">
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
                  <p id="openai-help" className="text-xs text-gray-500 mt-1">
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
                  <p id="yandex-help" className="text-xs text-gray-500 mt-1">
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
                  <p id="google-help" className="text-xs text-gray-500 mt-1">
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
                <p id="voice-threshold-help" className="text-xs text-gray-500 mt-1">
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
                <p id="silence-duration-help" className="text-xs text-gray-500 mt-1">
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
                <p id="merge-delay-help" className="text-xs text-gray-500 mt-1">
                  Время ожидания для объединения близких фрагментов речи (500-10000 мс, по умолчанию: 2500)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
