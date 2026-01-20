import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, deleteSession } from '../utils/sessionManager';
import CreateSessionDrawer from './CreateSessionDrawer';
import SummaryDrawer from './SummaryDrawer';
import EditSessionDrawer from './EditSessionDrawer';
import DeleteSessionDrawer from './DeleteSessionDrawer';
import { DecorativeBlurs } from './ui';

// Иконки
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [summarySession, setSummarySession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);

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
    console.log('Session created, navigating to:', sessionId);
    if (!sessionId) {
      console.error('Session ID is missing in handleSessionCreated');
      return;
    }
    // Закрываем drawer перед навигацией
    setIsCreateDrawerOpen(false);
    // Загружаем обновленный список сессий
    loadSessions();
    // Небольшая задержка перед навигацией для гарантии закрытия drawer
    setTimeout(() => {
      console.log('Navigating to session:', `/session/${sessionId}`);
      navigate(`/session/${sessionId}`);
    }, 100);
  };

  const handleOpenSession = (sessionId, e) => {
    // Предотвращаем распространение события, если оно было передано
    if (e) {
      e.stopPropagation();
    }
    if (!sessionId) {
      console.error('Session ID is missing', sessionId);
      return;
    }
    console.log('Opening session:', sessionId);
    navigate(`/session/${sessionId}`);
  };

  const handleEditSession = (e, session) => {
    e.stopPropagation();
    setEditingSession(session);
  };

  const handleDeleteSession = (e, session) => {
    e.stopPropagation();
    setDeletingSession(session);
  };

  const handleSummarySession = (e, session) => {
    e.stopPropagation();
    setSummarySession(session);
  };

  const handleSummaryGenerated = () => {
    loadSessions();
  };

  const handleSessionUpdated = () => {
    loadSessions();
    setEditingSession(null);
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

  // Если сессий нет, показываем экран создания первой сессии
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen ui-mesh-bg p-4 relative">
        <DecorativeBlurs />
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6" role="img" aria-label="Пусто">
            📝
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Создайте первую сессию
          </h1>
          <p className="text-gray-600 mb-8">
            Начните новую сессию перевода, чтобы сохранить историю диалогов
          </p>
          <button
            onClick={handleCreateSession}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Создать первую сессию"
          >
            Создать сессию
          </button>
        </div>

        <CreateSessionDrawer
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen ui-mesh-bg p-4 relative">
      <DecorativeBlurs />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Сессии перевода
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Управляйте вашими сессиями перевода
            </p>
          </div>
          <button
            onClick={handleCreateSession}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            aria-label="Создать новую сессию"
          >
            <PlusIcon />
            <span>Создать сессию</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {sessions.map((session) => {
            return (
              <div
                key={session.id}
                onClick={(e) => {
                  // Проверяем, что клик не был по кнопке или интерактивному элементу
                  const target = e.target;
                  const clickedButton = target.closest('button');
                  const clickedInteractive = target.closest('[role="button"]');
                  
                  // Если клик был по кнопке или интерактивному элементу, не обрабатываем
                  if (!clickedButton && !clickedInteractive) {
                    handleOpenSession(session.id, e);
                  }
                }}
                onTouchEnd={(e) => {
                  // Обработка touch событий для мобильных устройств
                  // Проверяем, что это не клик по кнопке внутри
                  const target = e.target;
                  const clickedButton = target.closest('button');
                  
                  // Если клик был по кнопке, не обрабатываем здесь (кнопка сама обработает)
                  if (!clickedButton) {
                    e.preventDefault();
                    handleOpenSession(session.id, e);
                  }
                }}
                className="group relative p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl cursor-pointer transition-all touch-manipulation hover:bg-white hover:border-slate-300 hover:shadow-md"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenSession(session.id);
                  }
                }}
                aria-label={`Открыть сессию ${session.name}`}
                style={{ touchAction: 'manipulation' }}
              >
                {/* Session Name */}
                <div className="flex items-start gap-2 mb-3 pr-16">
                  <h3 className="text-lg font-semibold leading-tight truncate flex-1 text-slate-800">
                    {session.name}
                  </h3>
                </div>

                {/* Session Info */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Сообщений:</span>
                    <span className="font-medium text-slate-700">
                      {session.messages?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Обновлено:</span>
                    <span className="font-medium text-slate-700">
                      {formatDate(session.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Summary Preview */}
                {session.summary && (
                  <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {session.summary.length > 120 
                        ? `${session.summary.substring(0, 120)}...` 
                        : session.summary}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  {session.messages?.length > 0 && (
                    <button
                      onClick={(e) => handleSummarySession(e, session)}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSummarySession(e, session);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 active:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                      aria-label={`${session.summary ? 'Просмотреть' : 'Создать'} саммари`}
                      title={session.summary ? 'Просмотреть саммари' : 'Создать саммари'}
                    >
                      <SummaryIcon />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEditSession(e, session)}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleEditSession(e, session);
                    }}
                    className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                    aria-label="Редактировать сессию"
                    title="Редактировать"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session)}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteSession(e, session);
                    }}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                    aria-label="Удалить сессию"
                    title="Удалить"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawers */}
      <CreateSessionDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSessionCreated={handleSessionCreated}
      />

      <SummaryDrawer
        isOpen={!!summarySession}
        onClose={() => setSummarySession(null)}
        session={summarySession}
        onSummaryGenerated={handleSummaryGenerated}
      />

      <EditSessionDrawer
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        onSessionUpdated={handleSessionUpdated}
      />

      <DeleteSessionDrawer
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        session={deletingSession}
        onConfirm={() => {
          if (deletingSession) {
            try {
              deleteSession(deletingSession.id);
              loadSessions();
              setDeletingSession(null);
            } catch (err) {
              console.error('Ошибка при удалении сессии:', err);
              alert(err.message || 'Ошибка при удалении сессии');
            }
          }
        }}
      />
    </div>
  );
}
