import React, { useRef, useEffect } from 'react';

export default function MessageFeed({ messages }) {
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
    return (
      <div className="w-full h-[200px] border rounded-lg p-4 bg-gray-50">
        <p className="text-center text-gray-500">No messages yet. Start speaking to see transcripts and translations.</p>
      </div>
    );
  }

  return (
    <div 
      ref={feedRef}
      className="w-full h-[200px] border rounded-lg p-4 bg-gray-50 overflow-y-auto scrollbar-thin"
    >
      <div className="space-y-3">
        {messages.map((message) => (
          <div key={message.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">
                {formatTime(message.timestamp)}
              </span>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {message.language?.toUpperCase() || 'Original'}
                </span>
                {message.targetLanguage && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    {message.targetLanguage?.split('_')[0]?.toUpperCase() || 'Translation'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Original:</span>
                <p className="text-sm text-gray-900 mt-1">{message.original}</p>
              </div>
              
              {message.translation && (
                <div>
                  <span className="text-sm font-medium text-green-700">Translation:</span>
                  <p className="text-sm text-gray-900 mt-1">{message.translation}</p>
                </div>
              )}
              
              {!message.translation && (
                <div>
                  <span className="text-sm font-medium text-gray-400">Translation:</span>
                  <p className="text-sm text-gray-400 mt-1 italic">Translating...</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
