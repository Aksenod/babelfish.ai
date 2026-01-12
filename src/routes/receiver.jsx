import { useEffect, useRef, useState } from 'react';
import MessageFeed from '../components/MessageFeed';
import GitHubLink from '../components/GitHubLink';
import { useParams } from 'react-router-dom';

function App({ supabase }) {
  // Message history
  const [messageHistory, setMessageHistory] = useState([]);

  // Broadcast
  const { channelId } = useParams();

  // Subscribe to Supabase realtime broadcast
  useEffect(() => {
    const channel = supabase.channel(channelId);
    channel
      .on('broadcast', { event: 'transcript' }, ({ payload }) => {
        if (payload.translated) {
          // This is a translated message - update existing message by ID
          setMessageHistory(prev => 
            prev.map(msg => 
              msg.id === payload.messageId
                ? { ...msg, translation: payload.message }
                : msg
            )
          );
        } else {
          // This is an original transcript - add new message with broadcaster ID
          const newMessage = {
            id: payload.messageId, // Use ID from broadcaster
            original: payload.message,
            translation: null,
            timestamp: new Date(),
            language: payload.language,
            targetLanguage: null // Will be known when translation arrives
          };
          setMessageHistory(prev => [...prev, newMessage]);
        }
      })
      .subscribe();
  }, [channelId, supabase]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-bold mb-1 text-gray-800">
              Babelfish.ai - Receiver
            </h1>
            <h2 className="text-lg text-gray-600 mb-2">
              Real-time speech recognition & AI translation
            </h2>
            <p className="text-sm text-gray-500">
              Receiving from channel: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{channelId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Message Feed Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <MessageFeed messages={messageHistory} />
        </div>
      </div>
    </div>
  );
}

export default App;
