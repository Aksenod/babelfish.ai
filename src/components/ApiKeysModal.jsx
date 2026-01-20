import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Constants
const DRAWER_ANIMATION_DURATION = 300; // ms

// Icons
const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.8 8.2 2.9 2.9"/></svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
);

export default function ApiKeysModal({ isOpen, onClose }) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [yandexKey, setYandexKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showYandex, setShowYandex] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Load keys from localStorage
      const savedOpenaiKey = localStorage.getItem('openai_api_key') || '';
      const savedYandexKey = localStorage.getItem('yandex_api_key') || '';
      const savedGoogleKey = localStorage.getItem('google_api_key') || '';
      
      setOpenaiKey(savedOpenaiKey);
      setYandexKey(savedYandexKey);
      setGoogleKey(savedGoogleKey);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Handle ESC key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus trap
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
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const drawerContent = (
    <div 
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-keys-title"
    >
      <div 
        ref={modalRef}
        className={`fixed right-0 top-0 h-full w-full sm:w-96 md:w-[480px] bg-white shadow-2xl overflow-y-auto custom-scrollbar transform transition-transform duration-300 ease-out rounded-l-3xl z-[10000] ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-700">
              <KeyIcon />
            </div>
            <h2 id="api-keys-title" className="text-2xl font-bold text-slate-800">API Ключи</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Закрыть"
          >
            <XIcon />
          </button>
        </div>

        {/* Info Banner */}
        <div className="ui-glass-panel-thin rounded-2xl p-4 mb-6 border border-blue-200/50 bg-blue-50/30">
          <p className="text-sm text-slate-700 leading-relaxed">
            <span className="font-semibold">💡 Совет:</span> Ключи не обязательны. Если они не указаны,
            приложение использует серверные ключи с Vercel. Ваши ключи сохраняются локально в браузере
            и применяются только при вводе.
          </p>
        </div>

        {/* API Keys Form */}
        <div className="space-y-6">
          {/* OpenAI Key */}
          <div className="space-y-2">
            <label htmlFor="openai-key" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                id="openai-key"
                ref={firstInputRef}
                type={showOpenai ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 rounded-xl ui-glass-panel-thin border border-white/40 text-sm text-slate-700 bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400 pr-12"
                aria-describedby="openai-help"
              />
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all"
                aria-label={showOpenai ? 'Скрыть ключ' : 'Показать ключ'}
              >
                {showOpenai ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p id="openai-help" className="text-sm text-slate-500">
              Получите ключ на{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          {/* Yandex Key */}
          <div className="space-y-2">
            <label htmlFor="yandex-key" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Яндекс.Переводчик API Key
            </label>
            <div className="relative">
              <input
                id="yandex-key"
                type={showYandex ? 'text' : 'password'}
                value={yandexKey}
                onChange={(e) => setYandexKey(e.target.value)}
                placeholder="AQVN..."
                className="w-full px-4 py-3 rounded-xl ui-glass-panel-thin border border-white/40 text-sm text-slate-700 bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400 pr-12"
                aria-describedby="yandex-help"
              />
              <button
                type="button"
                onClick={() => setShowYandex(!showYandex)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all"
                aria-label={showYandex ? 'Скрыть ключ' : 'Показать ключ'}
              >
                {showYandex ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p id="yandex-help" className="text-sm text-slate-500">
              Получите ключ в{' '}
              <a
                href="https://console.cloud.yandex.ru/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
              >
                Yandex Cloud Console
              </a>
              {' '}(1M символов/день бесплатно)
            </p>
          </div>

          {/* Google Key */}
          <div className="space-y-2">
            <label htmlFor="google-key" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Google Translate API Key
            </label>
            <div className="relative">
              <input
                id="google-key"
                type={showGoogle ? 'text' : 'password'}
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="0ead1e6d..."
                className="w-full px-4 py-3 rounded-xl ui-glass-panel-thin border border-white/40 text-sm text-slate-700 bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400 pr-12"
                aria-describedby="google-help"
              />
              <button
                type="button"
                onClick={() => setShowGoogle(!showGoogle)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all"
                aria-label={showGoogle ? 'Скрыть ключ' : 'Показать ключ'}
              >
                {showGoogle ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p id="google-help" className="text-sm text-slate-500">
              Получите ключ в{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
              >
                Google Cloud Console
              </a>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
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
    </div>
  );

  return createPortal(drawerContent, document.body);
}
