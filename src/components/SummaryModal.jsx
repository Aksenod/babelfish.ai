import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateSummary } from '../utils/api';
import { updateSession, getSession } from '../utils/sessionManager';

export default function SummaryModal({ isOpen, onClose, session, onSummaryGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const modalRef = useRef(null);

  // Загружаем актуальную сессию из localStorage при открытии модального окна
  useEffect(() => {
    if (isOpen && session?.id) {
      try {
        // Загружаем актуальную сессию из localStorage, чтобы получить все сообщения
        const actualSession = getSession(session.id);
        if (actualSession) {
          setCurrentSession(actualSession);
          setSummary(actualSession.summary || '');
          setError(null);
          setCopied(false);
        } else {
          setError('Сессия не найдена');
          setCurrentSession(null);
        }
      } catch (err) {
        console.error('Ошибка при загрузке сессии:', err);
        setError('Ошибка при загрузке сессии');
        setCurrentSession(null);
      }
    } else if (!isOpen) {
      // Очищаем состояние при закрытии
      setCurrentSession(null);
      setSummary('');
      setError(null);
      setCopied(false);
    }
  }, [isOpen, session?.id]);

  // Загружаем промпт из localStorage при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      const savedPrompt = localStorage.getItem('summary_custom_prompt') || '';
      setCustomPrompt(savedPrompt);
    }
  }, [isOpen]);

  // Сохраняем промпт в localStorage при каждом изменении
  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setCustomPrompt(newPrompt);
    localStorage.setItem('summary_custom_prompt', newPrompt);
  };

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

  const handleGenerateSummary = async () => {
    // Используем актуальную сессию, загруженную из localStorage
    const sessionToUse = currentSession || session;
    
    if (!sessionToUse) {
      setError('Сессия не найдена');
      return;
    }

    const openaiKey = localStorage.getItem('openai_api_key') || '';

    // Загружаем актуальную сессию еще раз перед генерацией, чтобы убедиться, что у нас самые свежие данные
    let actualSession = sessionToUse;
    try {
      const freshSession = getSession(sessionToUse.id);
      if (freshSession) {
        actualSession = freshSession;
        setCurrentSession(freshSession);
      }
    } catch (err) {
      console.warn('Не удалось загрузить актуальную сессию, используем текущую:', err);
    }

    // Проверяем наличие сообщений
    if (!actualSession.messages || actualSession.messages.length === 0) {
      setError('В сессии нет сообщений для создания саммари');
      return;
    }

    // Загружаем контекст из localStorage
    const context = localStorage.getItem('session_context') || '';

    setIsGenerating(true);
    setError(null);

    try {
      // Используем кастомный промпт, если он задан
      const promptToUse = customPrompt.trim().length > 0 ? customPrompt.trim() : null;
      
      const generatedSummary = await generateSummary(
        actualSession.messages,
        context,
        openaiKey,
        promptToUse
      );

      // Сохраняем саммари в сессию
      updateSession(actualSession.id, { summary: generatedSummary });
      setSummary(generatedSummary);
      
      // Обновляем локальное состояние сессии
      setCurrentSession({ ...actualSession, summary: generatedSummary });

      // Уведомляем родительский компонент об обновлении
      if (onSummaryGenerated) {
        onSummaryGenerated();
      }
    } catch (err) {
      console.error('Ошибка при генерации саммари:', err);
      setError(err.message || 'Произошла ошибка при генерации саммари');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка при копировании:', err);
      setError('Не удалось скопировать саммари');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Используем актуальную сессию или переданную
  const displaySession = currentSession || session;
  
  if (!isOpen || !displaySession) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="summary-title" className="text-2xl font-bold text-gray-800">
            Саммари сессии: {displaySession.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {summary ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Саммари:</h3>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  aria-label="Копировать саммари"
                >
                  {copied ? '✓ Скопировано' : '📋 Копировать'}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="prose prose-sm max-w-none text-gray-900">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 first:mt-0 border-b border-gray-300 pb-2" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3 first:mt-0 border-b border-gray-200 pb-1" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2 first:mt-0" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-base font-semibold text-gray-900 mt-3 mb-2" {...props} />
                      ),
                      h5: ({ node, ...props }) => (
                        <h5 className="text-sm font-semibold text-gray-900 mt-2 mb-1" {...props} />
                      ),
                      h6: ({ node, ...props }) => (
                        <h6 className="text-sm font-medium text-gray-800 mt-2 mb-1" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-base text-gray-900 leading-relaxed mb-3 last:mb-0" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-outside ml-6 mb-3 space-y-1 text-base text-gray-900" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-outside ml-6 mb-3 space-y-1 text-base text-gray-900" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-base text-gray-900 leading-relaxed pl-1" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-gray-900" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic text-gray-800" {...props} />
                      ),
                      code: ({ node, inline, ...props }) => 
                        inline ? (
                          <code className="bg-gray-200 text-gray-900 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                        ) : (
                          <code className="block bg-gray-200 text-gray-900 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3" {...props} />
                        ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-700 my-3 bg-blue-50 py-2 rounded-r" {...props} />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="border-t border-gray-300 my-4" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
                      ),
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-600">
                Саммари еще не создано. Нажмите кнопку ниже, чтобы сгенерировать его.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center space-x-2 py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" aria-hidden="true"></div>
              <span className="text-gray-600">Генерация саммари...</span>
            </div>
          )}

          {/* Промпт для саммари */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <label htmlFor="summary-prompt" className="text-sm font-semibold text-gray-800">
                Промпт для генерации саммари:
              </label>
              <button
                onClick={() => {
                  const defaultPrompt = `Ты - помощник для создания подробного саммари сессий перевода.

{context}

Ниже представлены сообщения из сессии перевода (оригинальные тексты на английском и их переводы на русский):

{messages}

Создай подробное саммари этой сессии на русском языке. Саммари должно включать:
- Основные темы и вопросы, обсуждавшиеся в сессии
- Ключевые решения или выводы
- Важные детали, упомянутые в разговоре
- Любую другую релевантную информацию`;
                  setCustomPrompt(defaultPrompt);
                  localStorage.setItem('summary_custom_prompt', defaultPrompt);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                type="button"
              >
                Сбросить к дефолту
              </button>
            </div>
            <textarea
              id="summary-prompt"
              value={customPrompt}
              onChange={handlePromptChange}
              placeholder="Введите промпт для генерации саммари. Используйте {messages} для вставки списка сообщений и {context} для вставки контекста."
              className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm font-mono"
              aria-label="Промпт для генерации саммари"
            />
            <p className="text-xs text-gray-500">
              💡 Используйте <code className="bg-gray-100 px-1 py-0.5 rounded">{'{messages}'}</code> для вставки списка сообщений и <code className="bg-gray-100 px-1 py-0.5 rounded">{'{context}'}</code> для вставки контекста. Промпт сохраняется автоматически.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={isGenerating}
            >
              Закрыть
            </button>
            <button
              onClick={handleGenerateSummary}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isGenerating || !displaySession.messages || displaySession.messages.length === 0}
            >
              {summary ? '🔄 Обновить саммари' : '✨ Создать саммари'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
