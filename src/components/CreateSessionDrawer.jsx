import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createSession } from '../utils/sessionManager';

// Constants
const DRAWER_ANIMATION_DURATION = 300; // ms

// Icons
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

export default function CreateSessionDrawer({ isOpen, onClose, onSessionCreated }) {
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setSessionName('');
      setError('');
      setIsCreating(false);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus trap для доступности
    const handleTab = (e) => {
      if (!drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll(
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
    
    // Focus input when drawer opens
    const focusTimer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, DRAWER_ANIMATION_DURATION);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = sessionName.trim();
    
    if (!trimmedName) {
      setError('Название сессии не может быть пустым');
      inputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 100) {
      setError('Название сессии слишком длинное (максимум 100 символов)');
      inputRef.current?.focus();
      return;
    }

    setIsCreating(true);

    try {
      const session = createSession(trimmedName);
      onSessionCreated(session.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка при создании сессии');
      setIsCreating(false);
    }
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
      aria-labelledby="create-session-title"
    >
      <div 
        ref={drawerRef}
        className={`fixed left-0 top-0 h-full w-full sm:w-1/2 md:w-1/2 lg:w-[480px] bg-white shadow-2xl overflow-y-auto custom-scrollbar transform transition-transform duration-300 ease-out sm:rounded-r-3xl z-[10000] ${
          isVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl ui-glass-panel-thin flex items-center justify-center text-blue-600 bg-blue-50">
                <PlusIcon />
              </div>
              <h2 id="create-session-title" className="text-2xl font-bold text-slate-800">Создать сессию</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Закрыть"
              disabled={isCreating}
            >
              <XIcon />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input */}
            <div className="space-y-2">
              <label htmlFor="create-session-name" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Название сессии
              </label>
              <input
                id="create-session-name"
                ref={inputRef}
                type="text"
                value={sessionName}
                onChange={(e) => {
                  setSessionName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  // Обработка Enter для лучшего UX
                  if (e.key === 'Enter' && !isCreating && sessionName.trim()) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Например: Встреча команды"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl ui-glass-panel-thin border border-white/40 text-sm text-slate-700 bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-describedby={error ? 'create-session-name-error' : 'create-session-name-help'}
                aria-invalid={!!error}
                disabled={isCreating}
              />
              {error && (
                <p id="create-session-name-error" className="text-red-600 text-sm flex items-center gap-1.5" role="alert">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              )}
              <p id="create-session-name-help" className="text-sm text-slate-500">
                Максимум 100 символов
              </p>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-white/20">
            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isCreating || !sessionName.trim()}
            >
              {isCreating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>Создание...</span>
                </>
              ) : (
                <>
                  <PlusIcon />
                  <span>Создать сессию</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 rounded-full ui-glass-panel-thin border border-white/40 text-slate-700 hover:text-slate-800 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all active:scale-95 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating}
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
