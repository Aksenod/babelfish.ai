import { useRef, useEffect, useState } from 'react';

export default function MessageFeed({ messages, onDeleteMessage }) {
  const feedRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

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

  const handleCopy = async (text, messageId, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${messageId}-${type}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="w-full h-full border-2 border-gray-300 rounded-xl p-3 sm:p-4 bg-white shadow-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-4">
            <div className="text-3xl sm:text-5xl mb-3" role="img" aria-label="Микрофон">🎤</div>
            <p className="text-base sm:text-lg text-gray-600 font-medium">Говорите на английском для перевода</p>
            <p className="text-xs text-gray-400 mt-1.5">Распознанная речь и перевод появятся здесь</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={feedRef}
      className="w-full h-full border-2 border-gray-300 rounded-xl p-2 sm:p-3 bg-white shadow-lg overflow-y-auto scrollbar-thin"
      role="log"
      aria-live="polite"
      aria-label="Лента сообщений с переводами"
    >
      <div className="space-y-2">
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            className={`bg-gray-50 rounded-lg p-2 sm:p-3 border-2 transition-all duration-300 ${
              index === messages.length - 1 
                ? 'border-blue-400 shadow-md bg-blue-50 animate-in fade-in slide-in-from-bottom-2' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center mb-1.5 relative group">
              <span className="text-xs text-gray-500 font-medium">
                {formatTime(message.timestamp)}
              </span>
              {onDeleteMessage && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                  aria-label="Удалить сообщение"
                  title="Удалить"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-gray-200 relative group">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">Английский (EN):</span>
                  <button
                    onClick={() => handleCopy(message.original, message.id, 'original')}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-0.5"
                    aria-label="Копировать английский текст"
                    title="Копировать"
                  >
                    {copiedId === `${message.id}-original` ? '✓' : '📋'}
                  </button>
                </div>
                <p className="text-sm sm:text-base text-gray-900 leading-normal break-words">{message.original}</p>
              </div>
              
              {message.translated && (
                <div className="bg-gray-50 rounded-lg p-2 sm:p-2.5 border border-gray-200 relative group">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-semibold text-gray-700">Русский (RU):</span>
                    <button
                      onClick={() => handleCopy(message.translated, message.id, 'translated')}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-0.5"
                      aria-label="Копировать русский текст"
                      title="Копировать"
                    >
                      {copiedId === `${message.id}-translated` ? '✓' : '📋'}
                    </button>
                  </div>
                  <p className="text-sm sm:text-base text-gray-900 leading-normal break-words">{message.translated}</p>
                </div>
              )}
              
              {!message.translated && (
                <div className="bg-gray-100 rounded-lg p-2 sm:p-2.5 border border-gray-300">
                  <span className="text-xs font-semibold text-gray-500 block mb-1.5">Русский (RU):</span>
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" aria-hidden="true"></div>
                    <p className="text-sm sm:text-base text-gray-400 italic">Перевожу...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
