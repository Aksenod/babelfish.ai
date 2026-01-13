import { useEffect, useRef, useState } from 'react';

// Icons
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);

export default function DeleteSessionDrawer({ isOpen, onClose, session, onConfirm }) {
  const [isVisible, setIsVisible] = useState(false);
  const drawerRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
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

    document.addEventListener('keydown', handleEscape);
    
    // Focus cancel button by default for safety
    setTimeout(() => {
      if (cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      }
    }, 300);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !session) return null;

  const messagesCount = session.messages?.length || 0;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-session-title"
    >
      <div 
        ref={drawerRef}
        className={`fixed left-0 top-0 h-full w-full sm:w-1/2 md:w-1/2 lg:w-[480px] max-w-[50vw] ui-glass-panel-thick shadow-2xl overflow-y-auto custom-scrollbar transform transition-transform duration-300 ease-out rounded-r-3xl ${
          isVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(40px) saturate(120%)',
          WebkitBackdropFilter: 'blur(40px) saturate(120%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl ui-glass-panel-thin flex items-center justify-center text-red-600 bg-red-50">
                <TrashIcon />
              </div>
              <h2 id="delete-session-title" className="text-2xl font-bold text-slate-800">Удалить сессию</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl ui-glass-panel-thin flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
              aria-label="Закрыть"
              data-action="cancel"
            >
              <XIcon />
            </button>
          </div>

          {/* Warning Banner */}
          <div className="ui-glass-panel-thin rounded-2xl p-4 mb-6 border border-red-200/50 bg-red-50/30">
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold">⚠️ Внимание!</span> Это действие нельзя отменить. 
              Все сообщения и данные этой сессии будут безвозвратно удалены.
            </p>
          </div>

          {/* Session Info */}
          <div className="space-y-6">
            <div className="ui-glass-panel-thin rounded-2xl p-4 border border-slate-200/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Информация о сессии
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Название</p>
                  <p className="text-sm font-semibold text-slate-900">{session.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Сообщений</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {messagesCount} {messagesCount === 1 ? 'сообщение' : messagesCount < 5 ? 'сообщения' : 'сообщений'}
                  </p>
                </div>
                {session.summary && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Саммари</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{session.summary.substring(0, 100)}...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="ui-glass-panel-thin rounded-2xl p-4 border border-amber-200/50 bg-amber-50/30">
              <p className="text-sm text-slate-700 leading-relaxed">
                Вы уверены, что хотите удалить сессию <strong className="font-semibold text-slate-900">"{session.name}"</strong>?
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-white/20">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              className="w-full px-6 py-3 rounded-full ui-glass-panel-thin border border-white/40 text-slate-700 hover:text-slate-800 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all active:scale-95 font-medium"
              data-action="cancel"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              className="w-full px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white border border-red-400/50 shadow-lg hover:shadow-red-500/30 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-semibold flex items-center justify-center gap-2"
            >
              <TrashIcon />
              <span>Удалить сессию</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
