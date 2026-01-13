import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '../utils/sessionManager';
import CreateSessionDrawer from './CreateSessionDrawer';
import SummaryDrawer from './SummaryDrawer';

// Иконки
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);

const SummaryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);

const ActiveIndicator = () => (
  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.8)]"></div>
);

export default function SessionHistory({ currentSessionId, onEditSession, onDeleteSession, onOpenSummary }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [summarySession, setSummarySession] = useState(null);

  useEffect(() => {
    loadSessions();
    
    // Обновляем список при изменении фокуса окна (на случай изменений в других вкладках)
    const handleFocus = () => {
      loadSessions();
    };
    window.addEventListener('focus', handleFocus);
    
    // Storage event listener для синхронизации между вкладками
    const handleStorageChange = (e) => {
      // Обновляем список при изменении localStorage в другой вкладке
      if (e.key === 'babelfish_sessions' || e.key === null) {
        loadSessions();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Периодическое обновление для текущей вкладки (каждые 5 секунд)
    const intervalId = setInterval(() => {
      loadSessions();
    }, 5000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  const loadSessions = () => {
    const allSessions = getSessions();
    // Сортируем по дате обновления (новые сверху)
    const sorted = [...allSessions].sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(sorted);
  };

  const handleCreateSession = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleSessionCreated = (sessionId) => {
    loadSessions();
    navigate(`/session/${sessionId}`);
  };

  const handleOpenSession = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  const handleEditSession = (e, session) => {
    e.stopPropagation();
    if (onEditSession) {
      onEditSession(session);
    }
  };

  const handleDeleteSession = (e, session) => {
    e.stopPropagation();
    if (onDeleteSession) {
      onDeleteSession(session);
    }
  };

  const handleSummarySession = (e, session) => {
    e.stopPropagation();
    if (onOpenSummary) {
      onOpenSummary(session);
    } else {
      setSummarySession(session);
    }
  };

  const handleSummaryGenerated = () => {
    loadSessions();
  };

  const handleSessionUpdated = () => {
    loadSessions();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) {
      return 'Только что';
    } else if (minutes < 60) {
      return `${minutes} мин. назад`;
    } else if (hours < 24) {
      return `${hours} ч. назад`;
    } else if (days === 0) {
      return 'Сегодня';
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return `${days} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-600">История</span>
        <button
          onClick={handleCreateSession}
          className="p-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
          aria-label="Создать новую сессию"
          title="Создать сессию"
        >
          <PlusIcon />
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-2">
            <p className="text-xs text-slate-500 mb-3">Нет сессий</p>
            <button
              onClick={handleCreateSession}
              className="text-xs text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Создать первую
            </button>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                onClick={() => handleOpenSession(session.id)}
                className={`
                  group relative p-2.5 rounded-xl cursor-pointer transition-all
                  ${isActive 
                    ? 'bg-blue-50 border-2 border-blue-400 shadow-sm' 
                    : 'bg-white/50 border border-slate-200 hover:bg-white/80 hover:border-slate-300'
                  }
                `}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenSession(session.id);
                  }
                }}
                aria-label={`Открыть сессию ${session.name}`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute top-2 left-2">
                    <ActiveIndicator />
                  </div>
                )}

                {/* Session Name */}
                <div className="flex items-start gap-2 mb-1.5 pr-6">
                  <h3 className={`
                    text-sm font-semibold leading-tight truncate flex-1
                    ${isActive ? 'text-blue-900' : 'text-slate-800'}
                  `}>
                    {session.name}
                  </h3>
                </div>

                {/* Session Info */}
                <div className="space-y-1 mb-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Сообщений:</span>
                    <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {session.messages?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Обновлено:</span>
                    <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {formatDate(session.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Summary Preview */}
                {session.summary && (
                  <div className="mb-2 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {session.summary.length > 80 
                        ? `${session.summary.substring(0, 80)}...` 
                        : session.summary}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {session.messages?.length > 0 && (
                    <button
                      onClick={(e) => handleSummarySession(e, session)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label={`${session.summary ? 'Просмотреть' : 'Создать'} саммари`}
                      title={session.summary ? 'Просмотреть саммари' : 'Создать саммари'}
                    >
                      <SummaryIcon />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEditSession(e, session)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Редактировать сессию"
                    title="Редактировать"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Удалить сессию"
                    title="Удалить"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawers */}
      <CreateSessionDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSessionCreated={handleSessionCreated}
      />

      {/* SummaryDrawer рендерится через onOpenSummary в translator.jsx */}
      {!onOpenSummary && (
        <SummaryDrawer
          isOpen={!!summarySession}
          onClose={() => setSummarySession(null)}
          session={summarySession}
          onSummaryGenerated={handleSummaryGenerated}
        />
      )}
    </div>
  );
}
