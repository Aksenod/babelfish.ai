import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { updateSession } from '../utils/sessionManager';

// Constants
const DRAWER_ANIMATION_DURATION = 300; // ms

// Icons
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

export default function EditSessionDrawer({ isOpen, onClose, session, onSessionUpdated }) {
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (session) {
        setSessionName(session.name || '');
        setError('');
        setIsUpdating(false);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, session]);

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
        inputRef.current.select();
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

    if (trimmedName === session.name) {
      onClose();
      return;
    }

    setIsUpdating(true);

    try {
      updateSession(session.id, { name: trimmedName });
      onSessionUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении сессии');
      setIsUpdating(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !session) return null;

  const drawerContent = (
    <div 
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-session-title"
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
              <div className="w-10 h-10 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-700">
                <EditIcon />
              </div>
              <h2 id="edit-session-title" className="text-2xl font-bold text-slate-800">Редактировать сессию</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Закрыть"
              disabled={isUpdating}
            >
              <XIcon />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Info */}
            <div className="ui-glass-panel-thin rounded-2xl p-4 border border-blue-200/50 bg-blue-50/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Текущее название
              </p>
              <p className="text-sm text-slate-700 font-medium">{session.name}</p>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <label htmlFor="edit-session-name" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Новое название
              </label>
              <input
                id="edit-session-name"
                ref={inputRef}
                type="text"
                value={sessionName}
                onChange={(e) => {
                  setSessionName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  // Обработка Enter для лучшего UX
                  if (e.key === 'Enter' && !isUpdating && sessionName.trim() && sessionName.trim() !== session.name) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Например: Встреча команды"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl ui-glass-panel-thin border border-white/40 text-sm text-slate-700 bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-describedby={error ? 'edit-session-name-error' : 'edit-session-name-help'}
                aria-invalid={!!error}
                disabled={isUpdating}
              />
              {error && (
                <p id="edit-session-name-error" className="text-red-600 text-sm flex items-center gap-1.5" role="alert">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              )}
              <p id="edit-session-name-help" className="text-sm text-slate-500">
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
              disabled={isUpdating || !sessionName.trim()}
            >
              {isUpdating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <SaveIcon />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 rounded-full ui-glass-panel-thin border border-white/40 text-slate-700 hover:text-slate-800 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all active:scale-95 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUpdating}
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
