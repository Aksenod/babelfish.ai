import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { generateSummary } from '../utils/api';
import { updateSession, getSession } from '../utils/sessionManager';

// Constants
const DRAWER_ANIMATION_DURATION = 300; // ms

// Icons
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const SummaryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
);

export default function SummaryDrawer({ isOpen, onClose, session, onSummaryGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (session?.id) {
        try {
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
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, session?.id]);

  useEffect(() => {
    if (isOpen) {
      const savedPrompt = localStorage.getItem('summary_custom_prompt') || '';
      setCustomPrompt(savedPrompt);
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
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen, onClose]);

  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setCustomPrompt(newPrompt);
    localStorage.setItem('summary_custom_prompt', newPrompt);
  };

  const handleGenerateSummary = async () => {
    const sessionToUse = currentSession || session;
    
    if (!sessionToUse) {
      setError('Сессия не найдена');
      return;
    }

    const openaiKey = localStorage.getItem('openai_api_key') || '';

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

    if (!actualSession.messages || actualSession.messages.length === 0) {
      setError('В сессии нет сообщений для создания саммари');
      return;
    }

    const context = localStorage.getItem('session_context') || '';

    setIsGenerating(true);
    setError(null);

    try {
      const promptToUse = customPrompt.trim().length > 0 ? customPrompt.trim() : null;
      
      const generatedSummary = await generateSummary(
        actualSession.messages,
        context,
        openaiKey,
        promptToUse
      );

      updateSession(actualSession.id, { summary: generatedSummary });
      setSummary(generatedSummary);
      setCurrentSession({ ...actualSession, summary: generatedSummary });

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

  const displaySession = currentSession || session;
  
  if (!isOpen || !displaySession) return null;

  const drawerContent = (
    <div 
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
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
              <div className="w-10 h-10 rounded-xl ui-glass-panel-thin flex items-center justify-center text-purple-600 bg-purple-50">
                <SummaryIcon />
              </div>
              <div>
                <h2 id="summary-title" className="text-2xl font-bold text-slate-800">Саммари сессии</h2>
                <p className="text-xs text-slate-500 mt-0.5">{displaySession.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              aria-label="Закрыть"
            >
              <XIcon />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="ui-glass-panel-thin rounded-2xl p-4 mb-6 border border-red-200/50 bg-red-50/30">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Summary Content */}
          {summary ? (
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Содержание:</h3>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl ui-glass-panel-thin border border-white/40 text-slate-600 hover:text-slate-800 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all flex items-center gap-2 text-sm"
                  aria-label="Копировать саммари"
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
              <div className="ui-glass-panel-thin rounded-2xl p-4 border border-white/40 bg-white/20">
                <div className="prose prose-sm max-w-none text-slate-900">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0 border-b border-slate-300 pb-1" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-base font-bold text-slate-900 mt-3 mb-2 first:mt-0 border-b border-slate-200 pb-1" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-sm font-semibold text-slate-900 mt-3 mb-1 first:mt-0" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-xs font-semibold text-slate-900 mt-2 mb-1" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-sm text-slate-800 leading-relaxed mb-2 last:mb-0" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-outside ml-4 mb-2 space-y-1 text-sm text-slate-800" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-outside ml-4 mb-2 space-y-1 text-sm text-slate-800" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-sm text-slate-800 leading-relaxed" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-slate-900" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic text-slate-800" {...props} />
                      ),
                      code: ({ node, inline, ...props }) => 
                        inline ? (
                          <code className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                        ) : (
                          <code className="block bg-slate-200 text-slate-900 p-2 rounded-lg text-xs font-mono overflow-x-auto mb-2" {...props} />
                        ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-purple-400 pl-3 italic text-slate-700 my-2 bg-purple-50 py-1 rounded-r text-sm" {...props} />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="border-t border-slate-300 my-2" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a className="text-purple-600 hover:text-purple-800 underline text-sm" {...props} />
                      ),
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="ui-glass-panel-thin rounded-2xl p-4 mb-6 border border-slate-200/50 bg-slate-50/30 text-center">
              <p className="text-sm text-slate-600">
                Саммари еще не создано. Нажмите кнопку ниже, чтобы сгенерировать его.
              </p>
            </div>
          )}

          {/* Generating Indicator */}
          {isGenerating && (
            <div className="flex items-center justify-center space-x-2 py-4 mb-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" aria-hidden="true"></div>
              <span className="text-sm text-slate-600">Генерация саммари...</span>
            </div>
          )}

          {/* Custom Prompt Section */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <label htmlFor="summary-prompt" className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Промпт для генерации:
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
                className="text-xs text-purple-600 hover:text-purple-800 underline focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded px-2 py-1"
                type="button"
              >
                Сбросить
              </button>
            </div>
            <textarea
              id="summary-prompt"
              value={customPrompt}
              onChange={handlePromptChange}
              placeholder="Введите промпт для генерации саммари. Используйте {messages} для вставки списка сообщений и {context} для вставки контекста."
              className="w-full min-h-[120px] p-3 rounded-xl ui-glass-panel-thin border border-white/40 text-xs font-mono text-slate-800 bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/35 transition-all resize-y placeholder:text-slate-500"
              aria-label="Промпт для генерации саммари"
            />
            <p className="text-xs text-slate-500">
              💡 Используйте <code className="bg-white/30 px-1 py-0.5 rounded">{'{messages}'}</code> для вставки списка сообщений и <code className="bg-white/30 px-1 py-0.5 rounded">{'{context}'}</code> для вставки контекста. Промпт сохраняется автоматически.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col gap-3 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={handleGenerateSummary}
              className="w-full px-6 py-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white border border-purple-400/50 shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isGenerating || !displaySession.messages || displaySession.messages.length === 0}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>Генерация...</span>
                </>
              ) : summary ? (
                <>
                  <span>🔄</span>
                  <span>Обновить саммари</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Создать саммари</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 rounded-full ui-glass-panel-thin border border-white/40 text-slate-700 hover:text-slate-800 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all active:scale-95 font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
