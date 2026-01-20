import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, deleteSession } from '../utils/sessionManager';
import CreateSessionModal from './CreateSessionModal';
import EditSessionModal from './EditSessionModal';
import DeleteSessionModal from './DeleteSessionModal';
import SummaryModal from './SummaryModal';
import { Button, GlassCard, DecorativeBlurs } from './ui';

export default function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const [summarySession, setSummarySession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const allSessions = getSessions();
    // Сортируем по дате обновления (новые сверху)
    const sorted = [...allSessions].sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(sorted);
  };

  const handleCreateSession = () => {
    setIsModalOpen(true);
  };

  const handleSessionCreated = (sessionId) => {
    setIsModalOpen(false);
    navigate(`/session/${sessionId}`);
  };

  const handleOpenSession = (sessionId) => {
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
  };

  const handleConfirmDelete = () => {
    if (deletingSession) {
      try {
        deleteSession(deletingSession.id);
        loadSessions();
      } catch (err) {
        console.error('Ошибка при удалении сессии:', err);
        alert(err.message || 'Ошибка при удалении сессии');
      }
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
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
          <Button
            variant="floating"
            color="blue"
            size="lg"
            onClick={handleCreateSession}
            aria-label="Создать первую сессию"
          >
            Создать сессию
          </Button>
        </div>

        <CreateSessionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSessionCreated={handleSessionCreated}
        />

        <EditSessionModal
          isOpen={!!editingSession}
          onClose={() => setEditingSession(null)}
          session={editingSession}
          onSessionUpdated={handleSessionUpdated}
        />

        <DeleteSessionModal
          isOpen={!!deletingSession}
          onClose={() => setDeletingSession(null)}
          session={deletingSession}
          onConfirm={handleConfirmDelete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen ui-mesh-bg p-4 relative">
      <DecorativeBlurs />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <GlassCard variant="thick" rounded="xl" className="p-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                Сессии перевода
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Управляйте вашими сессиями перевода
              </p>
            </div>
            <Button
              variant="floating"
              color="blue"
              onClick={handleCreateSession}
              aria-label="Создать новую сессию"
            >
              + Создать сессию
            </Button>
          </div>
        </GlassCard>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenSession(session.id)}
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
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800 truncate flex-1 mr-2">
                  {session.name}
                </h3>
                <div className="flex items-center gap-2">
                  {session.messages?.length > 0 && (
                    <button
                      onClick={(e) => handleSummarySession(e, session)}
                      className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      aria-label={`${session.summary ? 'Просмотреть' : 'Создать'} саммари для сессии ${session.name}`}
                      title={session.summary ? 'Просмотреть саммари' : 'Создать саммари'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEditSession(e, session)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Редактировать сессию ${session.name}`}
                    title="Редактировать"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Удалить сессию ${session.name}`}
                    title="Удалить"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Сообщений:</span>
                  <span className="font-medium text-gray-800">
                    {session.messages?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Обновлено:</span>
                  <span className="font-medium text-gray-800">
                    {formatDate(session.updatedAt)}
                  </span>
                </div>
                {session.summary && (
                  <div 
                    className="mt-2 pt-2 border-t border-gray-200 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSummarySession(e, session);
                    }}
                    title="Нажмите, чтобы открыть полное саммари"
                  >
                    <div className="text-sm text-gray-500 mb-1 font-semibold">Саммари:</div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {session.summary.length > 150 
                        ? `${session.summary.substring(0, 150)}...` 
                        : session.summary}
                    </p>
                    <div className="text-sm text-purple-600 mt-1 font-medium">Нажмите, чтобы открыть →</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {session.messages?.length > 0 && !session.summary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSummarySession(e, session);
                    }}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-medium flex items-center justify-center gap-2"
                    aria-label={`Создать саммари для сессии ${session.name}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Создать саммари
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSession(session.id);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
                  aria-label={`Открыть сессию ${session.name}`}
                >
                  Открыть
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSessionCreated={handleSessionCreated}
      />

      <EditSessionModal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        onSessionUpdated={handleSessionUpdated}
      />

      <DeleteSessionModal
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        session={deletingSession}
        onConfirm={handleConfirmDelete}
      />

      <SummaryModal
        isOpen={!!summarySession}
        onClose={() => setSummarySession(null)}
        session={summarySession}
        onSummaryGenerated={handleSummaryGenerated}
      />
    </div>
  );
}
