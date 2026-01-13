import { useRef, useEffect } from 'react';
import { GlassCard } from './ui';

// Simple Icons
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const MessageSquareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default function MessageFeed({ messages, onDeleteMessage, error, isRecording = false }) {
  const feedRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!messages || messages.length === 0) {
    // Show error if present
    if (error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
          <div className="ui-glass-panel-thick rounded-2xl p-6 border-2 border-red-300/60 bg-red-50/50 shadow-lg max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 text-red-600">
                <AlertCircleIcon />
              </div>
              <p className="text-red-800 text-sm font-semibold leading-relaxed break-words flex-1 text-left">
                {error}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    // Default empty state
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
        <div className="w-16 h-16 rounded-full ui-glass-panel-thin flex items-center justify-center mb-4 text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
        </div>
        <p className="text-lg text-slate-800 font-medium">Готово к переводу</p>
        <p className="text-sm text-slate-600 mt-1">Начните говорить, чтобы увидеть переводы здесь</p>
      </div>
    );
  }

  return (
    <div 
      ref={feedRef}
      className="h-full min-h-0 overflow-visible px-4 pb-4 space-y-3"
      style={{ height: '100%' }}
      role="log"
      aria-live="polite"
    >
      {/* Decorative card - always first, full width, transparent */}
      <div className="hidden md:block w-full h-[68px] opacity-0 pointer-events-none" aria-hidden="true"></div>
      {messages.map((message, index) => (
        <GlassCard
          key={message.id}
          variant="thick"
          rounded="3xl"
          hover
          className="group relative p-0 overflow-visible"
        >
          {/* Delete Button (Floating) */}
          {onDeleteMessage && (
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1.5 rounded-full bg-white/50 text-red-500 hover:bg-red-50 shadow-sm border border-red-100 transition-colors backdrop-blur-sm"
                title="Удалить сообщение"
              >
                <TrashIcon />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/20 rounded-3xl overflow-hidden">
            {/* EN (Input) */}
            <div className="p-4 flex flex-col gap-1.5 relative bg-white/5 md:bg-transparent h-fit">
              <div className="flex items-center justify-between opacity-50 border-b border-black/5 pb-2 mb-1">
                <div className="flex items-center gap-2">
                  <MessageSquareIcon />
                  <span className="text-xs font-bold tracking-wider uppercase">Английский (Ввод)</span>
                </div>
                <span className="text-xs font-mono text-slate-500 opacity-80">{formatTime(message.timestamp)}</span>
              </div>
              <p className="text-base text-slate-800 leading-relaxed font-medium flex-1 break-words overflow-wrap-anywhere">{message.original}</p>
            </div>

            {/* RU (Output) */}
            {message.translated ? (
              <div className="p-4 flex flex-col gap-1.5 relative bg-blue-50/30 md:bg-gradient-to-br md:from-blue-50/30 md:to-transparent h-fit">
                <div className="flex items-center justify-between border-b border-blue-500/10 pb-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">Русский (Вывод)</span>
                  </div>
                </div>
                <p className="text-base text-slate-800 leading-relaxed font-medium flex-1 drop-shadow-sm break-words overflow-wrap-anywhere">{message.translated}</p>
              </div>
            ) : (
              /* Processing State */
              <div className="p-4 flex flex-col gap-1.5 relative overflow-hidden bg-blue-50/10 h-fit">
                {/* Liquid animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent translate-x-[-100%] animate-shimmer"></div>

                <div className="flex items-center justify-between relative z-10 border-b border-blue-500/10 pb-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">Обработка</span>
                  </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center relative z-10 min-h-[60px]">
                    <span className="text-sm font-semibold ui-text-shimmer flex items-center gap-1.5 bg-white/40 px-3 py-1.5 rounded-full border border-white/40 shadow-sm backdrop-blur-md">
                    Перевод
                    <span className="flex gap-0.5 mt-1">
                      <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      ))}
      
      {/* Empty card with shimmer during recording */}
      {isRecording && (
        <GlassCard
          variant="thick"
          rounded="3xl"
          className="relative p-0 overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent translate-x-[-100%] animate-shimmer rounded-3xl pointer-events-none z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/20 rounded-3xl overflow-hidden">
            {/* EN (Input) - Placeholder */}
            <div className="p-4 flex flex-col gap-1.5 relative bg-white/5 md:bg-transparent h-fit min-h-[100px]">
              <div className="flex items-center justify-between opacity-50 border-b border-black/5 pb-2 mb-1">
                <div className="flex items-center gap-2">
                  <MicIcon />
                  <span className="text-xs font-bold tracking-wider uppercase">Запись...</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 mt-2">
                <div className="h-4 bg-slate-200/40 rounded animate-pulse"></div>
                <div className="h-4 bg-slate-200/40 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-slate-200/40 rounded animate-pulse w-5/6"></div>
              </div>
            </div>

            {/* RU (Output) - Placeholder */}
            <div className="p-4 flex flex-col gap-1.5 relative overflow-hidden bg-blue-50/10 h-fit min-h-[100px]">
              {/* Shimmer background */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent translate-x-[-100%] animate-shimmer"></div>
              
              <div className="flex items-center justify-between relative z-10 border-b border-blue-500/10 pb-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-bold text-red-600 tracking-wider uppercase">Генерация...</span>
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center relative z-10 min-h-[60px]">
                <span className="text-sm font-semibold text-red-600/80 flex items-center gap-1.5 bg-white/40 px-3 py-1.5 rounded-full border border-red-200/40 shadow-sm backdrop-blur-md">
                  Распознавание
                  <span className="flex gap-0.5 mt-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
      {/* Decorative card - always last, full width, transparent */}
      <div className="w-full h-[60px] opacity-0 pointer-events-none" aria-hidden="true"></div>
    </div>
  );
}