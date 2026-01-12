import { useEffect, useRef, useState } from 'react';
import GitHubLink from '../components/GitHubLink';
import { useParams } from 'react-router-dom';

function App({ supabase }) {
  // Inputs and outputs
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');

  // Broadcast
  const { channelId } = useParams();

  // Subscribe to Supabase realtime broadcast
  useEffect(() => {
    const channel = supabase.channel(channelId);
    channel
      .on('broadcast', { event: 'transcript' }, ({ payload }) => {
        if (payload.translated) {
          // This is a translated message
          setTranslation(payload.message);
        } else {
          // This is an original transcript
          setTranscript(payload.message);
          setSourceLanguage(payload.language);
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
          <div className="relative">
            <h3 className="text-l font-semibold mb-2">
              Original Transcript ({sourceLanguage.toUpperCase()}):
            </h3>
            <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2 mb-4">
              {transcript}
            </p>
          </div>

          {translation && (
            <div className="relative">
              <h3 className="text-l font-semibold mb-2">
                Translation:
              </h3>
              <p className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-2">
                {translation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
