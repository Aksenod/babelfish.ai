import { useState, useEffect, useRef } from 'react';
import { createSession } from '../utils/sessionManager';

export default function CreateSessionModal({ isOpen, onClose, onSessionCreated }) {
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSessionName('');
      setError('');
      setIsCreating(false);
      // Focus input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

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

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-session-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="create-session-title" className="text-2xl font-bold text-gray-800">
            Создать сессию
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
            aria-label="Закрыть"
            disabled={isCreating}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 mb-2">
              Название сессии
            </label>
            <input
              id="session-name"
              ref={inputRef}
              type="text"
              value={sessionName}
              onChange={(e) => {
                setSessionName(e.target.value);
                setError('');
              }}
              placeholder="Например: Встреча команды"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              aria-describedby={error ? 'session-name-error' : 'session-name-help'}
              aria-invalid={!!error}
              disabled={isCreating}
            />
            {error && (
              <p id="session-name-error" className="text-red-600 text-sm mt-1" role="alert">
                {error}
              </p>
            )}
            <p id="session-name-help" className="text-gray-500 text-xs mt-1">
              Введите название для вашей сессии перевода
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={isCreating}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating || !sessionName.trim()}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Создание...
                </span>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
