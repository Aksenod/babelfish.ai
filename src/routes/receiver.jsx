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
    <div className="flex flex-col h-screen mx-auto justify-end text-gray-800 bg-white">
      <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
        <GitHubLink url="https://github.com/supabase-community/babelfish.ai" />
        <div className="flex flex-col items-center mb-1 max-w-[400px] text-center">
          <h1 className="text-4xl font-bold mb-1">Babelfish.ai - Receiver</h1>
          <h2 className="text-xl font-semibold">
            Real-time in-browser speech recognition & decentralized in-browser
            AI translation.
          </h2>
        </div>

        <div className="w-[500px] p-2">
          <MessageFeed messages={messageHistory} />
        </div>
      </div>
    </div>
  );
}

export default App;
