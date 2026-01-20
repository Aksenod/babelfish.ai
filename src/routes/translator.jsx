import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageFeed from '../components/MessageFeed';
import Settings from '../components/Settings';
import SettingsSidebar from '../components/SettingsSidebar';
import ApiKeysModal from '../components/ApiKeysModal';
import Toast from '../components/Toast';
import SessionHistory from '../components/SessionHistory';
import SummaryDrawer from '../components/SummaryDrawer';
import EditSessionDrawer from '../components/EditSessionDrawer';
import DeleteSessionDrawer from '../components/DeleteSessionDrawer';
import { Button } from '../components/ui';
import { getSession, updateSession, deleteSession, deleteMessageFromSession } from '../utils/sessionManager';
import {
  getApiKeys,
  getTranslationModel,
  getTranscriptionSource,
  getVoiceSettings,
  getMaxRecordingDuration,
} from '../utils/settings';
import { generateMessageId } from '../utils/messageIdGenerator';
import { useSettings } from '../hooks/useSettings';
import { useVoiceActivityDetection } from '../hooks/useVoiceActivityDetection';
import { processAudio as processAudioService, finalizeSentenceBuffer } from '../services/audioProcessingService';
import { createTestMessages } from '../utils/createTestMessages';

// Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 5 7 7-7 7"/><path d="M5 12h14"/></svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.8 8.2 2.9 2.9"/></svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);


const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);


function Translator() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false); // Состояние прослушивания (ожидание речи)
  const [deleteToasts, setDeleteToasts] = useState([]); // Состояние для тостов удаления (массив)
  const [sessionState, setSessionState] = useState('idle'); // 'idle' | 'active' | 'stopped'
  const [sessionName, setSessionName] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false); // Состояние активности сессии (запись)
  const [uiLanguage, setUiLanguage] = useState('en'); // Язык интерфейса: 'en' или 'ru'
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(true); // Видимость правой колонки настроек
  const [isSummaryDrawerOpen, setIsSummaryDrawerOpen] = useState(false); // Видимость drawer с саммари
  const [summarySession, setSummarySession] = useState(null); // Сессия для саммари
  const [editingSession, setEditingSession] = useState(null); // Сессия для редактирования
  const [deletingSession, setDeletingSession] = useState(null); // Сессия для удаления
  const [mobileActiveColumn, setMobileActiveColumn] = useState(1); // 0=left, 1=center, 2=right
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const recorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const voiceActivityCheckRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSessionActiveRef = useRef(false); // Ref для синхронного доступа к состоянию сессии
  const sessionIdRef = useRef(null); // Ref для хранения sessionId
  const recentAudioLevelsRef = useRef([]); // История уровней аудио для проверки стабильности
  const recordingStartTimeRef = useRef(null); // Время начала записи
  const textStreamRef = useRef('');
  const recentSentencesRef = useRef([]);
  const sentenceBufferRef = useRef([]); // Буфер для накопления предложений перед созданием карточки
  const transcriptionWorkerRef = useRef(null);
  const transcriptionWorkerStatusRef = useRef('idle');
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isSwiping = useRef(false);
  const messagesScrollContainerMobileRef = useRef(null); // Ref для мобильного контейнера скролла
  const messagesScrollContainerDesktopRef = useRef(null); // Ref для десктопного контейнера скролла
  const isFirstChunkRef = useRef(true); // Флаг для отслеживания первого чанка (содержит WebM заголовок)
  const lastProcessedChunkIndexRef = useRef(0); // Индекс последнего обработанного чанка
  const periodicProcessingTimerRef = useRef(null); // Таймер для периодической обработки чанков

  const { sentenceDisplaySettings, transcriptionSource } = useSettings();
  const { sentencesOnScreen, showOriginal } = sentenceDisplaySettings;

  // Load session on mount
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    try {
      const session = getSession(sessionId);
      if (!session) {
        console.error('Session not found:', sessionId);
        navigate('/');
        return;
      }

      sessionIdRef.current = sessionId;
      setSessionName(session.name);
      
      // Load session status
      if (session.status) {
        setSessionState(session.status);
      }
      
      // Load messages from session
      if (session.messages && session.messages.length > 0) {
        // Convert timestamp numbers back to Date objects
        const loadedMessages = session.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:136',message:'Loading messages from session',data:{loadedMessagesCount:loadedMessages.length,loadedMessageIds:loadedMessages.map(m=>m.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setMessages(loadedMessages);
      } else {
        // Session is empty - set empty messages array
        setMessages([]);
      }
      textStreamRef.current = '';
      recentSentencesRef.current = [];
    } catch (err) {
      console.error('Error loading session:', err);
      navigate('/');
    }
  }, [sessionId, navigate]);

  // Sync sessionState with isSessionActive
  useEffect(() => {
    setIsSessionActive(sessionState === 'active');
    isSessionActiveRef.current = sessionState === 'active';
  }, [sessionState]);

  // Load UI language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('ui_language') || 'en';
    setUiLanguage(savedLanguage);
  }, []);

  // Make createTestMessages available in console for debugging
  useEffect(() => {
    if (import.meta.env.DEV && sessionId) {
      window.createTestMessages = (count = 10) => {
        return createTestMessages(sessionId, count).then(() => {
          // Reload messages after creation
          const session = getSession(sessionId);
          if (session && session.messages) {
            const loadedMessages = session.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            setMessages(loadedMessages);
          }
        });
      };
      console.log('💡 Функция createTestMessages(count) доступна в консоли для создания тестовых сообщений');
    }
    return () => {
      if (window.createTestMessages) {
        delete window.createTestMessages;
      }
    };
  }, [sessionId]);

  // Initialize transcription worker (local) when needed
  useEffect(() => {
    if (transcriptionSource !== 'local_worker') {
      // Cleanup worker if switching away from local
      if (transcriptionWorkerRef.current) {
        transcriptionWorkerRef.current.terminate();
        transcriptionWorkerRef.current = null;
        transcriptionWorkerStatusRef.current = 'idle';
      }
      return;
    }

    if (!transcriptionWorkerRef.current) {
      transcriptionWorkerRef.current = new Worker(
        new URL('../transcriptionWorker.js', import.meta.url),
        { type: 'module' }
      );
    }

    const worker = transcriptionWorkerRef.current;
    const handleWorkerMessage = (event) => {
      if (event.data?.status === 'ready') {
        transcriptionWorkerStatusRef.current = 'ready';
        console.log('[TRANSCRIPTION:worker] Worker ready');
      } else if (event.data?.status === 'error') {
        console.error('[TRANSCRIPTION:worker] Worker error:', event.data);
        setError('Ошибка загрузки локальной модели распознавания. Попробуйте использовать OpenAI Whisper.');
        transcriptionWorkerStatusRef.current = 'error';
      } else if (event.data?.status === 'loading') {
        console.log('[TRANSCRIPTION:worker] Loading model...', event.data?.data);
      }
    };

    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', (error) => {
      console.error('[TRANSCRIPTION:worker] Worker error event:', error);
      setError('Ошибка инициализации локальной модели распознавания. Попробуйте использовать OpenAI Whisper.');
      transcriptionWorkerStatusRef.current = 'error';
    });

    if (transcriptionWorkerStatusRef.current !== 'ready' && transcriptionWorkerStatusRef.current !== 'loading') {
      transcriptionWorkerStatusRef.current = 'loading';
      worker.postMessage({ type: 'load' });
    }

    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, [transcriptionSource, setError]);

  // Плавный скролл вниз при появлении новых карточек
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'translator.jsx:214',message:'Messages state updated',data:{messagesCount:messages.length,messagesIds:messages.map(m=>m.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const scrollToBottom = (container) => {
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    // Скроллим оба контейнера (мобильный и десктопный)
    scrollToBottom(messagesScrollContainerMobileRef.current);
    scrollToBottom(messagesScrollContainerDesktopRef.current);
  }, [messages]);

  // Initialize audio recording and voice activity detection
  useEffect(() => {
    const initRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Initialize Web Audio API for voice activity detection
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        const mimeTypes = [
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/mp4',
        ];

        let supportedMimeType = 'audio/webm';
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            supportedMimeType = mimeType;
            break;
          }
        }

        const options = {
          mimeType: supportedMimeType,
          audioBitsPerSecond: 128000,
        };

        recorderRef.current = new MediaRecorder(stream, options);

        recorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('[VAD:chunk] Получен аудио чанк', {
              chunkSize: event.data.size,
              chunkSizeKB: (event.data.size / 1024).toFixed(2),
              mimeType: event.data.type || 'unknown',
              isFirstChunk: isFirstChunkRef.current,
              timestamp: new Date().toISOString(),
            });

            // Накапливаем все чанки для финальной обработки
            audioChunksRef.current.push(event.data);

            // Обрабатываем только первый чанк во время записи
            // Первый чанк содержит WebM заголовок и может быть декодирован отдельно
            if (isRecordingRef.current && isFirstChunkRef.current) {
              const MIN_CHUNK_SIZE = 1024; // 1KB
              if (event.data.size >= MIN_CHUNK_SIZE) {
                console.log('[VAD:chunk] Обработка первого чанка (содержит WebM заголовок)');
                processAudio(event.data);
                isFirstChunkRef.current = false;
                lastProcessedChunkIndexRef.current = 0; // Первый чанк обработан
                
                // Запускаем периодическую обработку накопленных чанков
                startPeriodicProcessing();
              } else {
                console.log('[VAD:chunk] Первый чанк слишком маленький, пропускаем', {
                  chunkSize: event.data.size,
                  minSize: MIN_CHUNK_SIZE,
                });
              }
            }
          }
        };

        // Функция для периодической обработки накопленных чанков
        const startPeriodicProcessing = () => {
          // Очищаем предыдущий таймер, если есть
          if (periodicProcessingTimerRef.current) {
            clearInterval(periodicProcessingTimerRef.current);
          }

          // Обрабатываем накопленные чанки каждые 2 секунды
          const PROCESSING_INTERVAL = 2000; // 2 секунды
          periodicProcessingTimerRef.current = setInterval(() => {
            if (!isRecordingRef.current || isProcessingRef.current) {
              return; // Не обрабатываем, если запись остановлена или идет обработка
            }

            // Проверяем, есть ли новые чанки для обработки
            const totalChunks = audioChunksRef.current.length;
            const processedChunks = lastProcessedChunkIndexRef.current + 1;
            
            if (totalChunks > processedChunks) {
              // Есть новые чанки для обработки
              // Создаем blob из всех чанков, начиная с первого (который содержит заголовок)
              // и включая все новые чанки
              const chunksToProcess = audioChunksRef.current.slice(0, totalChunks);
              const accumulatedBlob = new Blob(chunksToProcess, { 
                type: recorderRef.current?.mimeType || 'audio/webm' 
              });

              console.log('[VAD:periodic] Периодическая обработка накопленных чанков', {
                blobSize: accumulatedBlob.size,
                blobSizeKB: (accumulatedBlob.size / 1024).toFixed(2),
                chunksCount: chunksToProcess.length,
                processedChunks,
                totalChunks,
                timestamp: new Date().toISOString(),
              });

              // Обрабатываем только если blob достаточно большой
              const MIN_BLOB_SIZE = 2048; // 2KB
              if (accumulatedBlob.size >= MIN_BLOB_SIZE) {
                processAudio(accumulatedBlob);
                lastProcessedChunkIndexRef.current = totalChunks - 1; // Обновляем индекс последнего обработанного чанка
              }
            }
          }, PROCESSING_INTERVAL);
        };

        recorderRef.current.onstop = async () => {
          // Останавливаем периодическую обработку
          if (periodicProcessingTimerRef.current) {
            clearInterval(periodicProcessingTimerRef.current);
            periodicProcessingTimerRef.current = null;
          }

          const chunksCount = audioChunksRef.current.length;
          const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          
          console.log('[VAD:stop] Запись остановлена', {
            chunksCount,
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            recorderState: recorderRef.current?.state,
            lastProcessedChunkIndex: lastProcessedChunkIndexRef.current,
            timestamp: new Date().toISOString(),
          });

          // Обрабатываем финальный blob, если есть необработанные чанки
          const totalChunks = audioChunksRef.current.length;
          const processedChunks = lastProcessedChunkIndexRef.current + 1;
          
          if (totalChunks > processedChunks) {
            // Есть необработанные чанки - обрабатываем их
            const chunksToProcess = audioChunksRef.current.slice(0, totalChunks);
            const finalBlob = new Blob(chunksToProcess, { 
              type: recorderRef.current?.mimeType || 'audio/webm' 
            });
            
            console.log('[VAD:stop] Обработка финального blob с необработанными чанками', {
              blobSize: finalBlob.size,
              blobSizeKB: (finalBlob.size / 1024).toFixed(2),
              chunksCount: chunksToProcess.length,
              processedChunks,
              totalChunks,
              timestamp: new Date().toISOString(),
            });
            
            const MIN_FINAL_BLOB_SIZE = 2048; // 2KB
            if (finalBlob.size >= MIN_FINAL_BLOB_SIZE) {
              processAudio(finalBlob);
            }
          } else if (totalChunks === 1 && isFirstChunkRef.current) {
            // Если только один чанк и он не был обработан, обрабатываем его
            const finalBlob = new Blob(audioChunksRef.current, { 
              type: recorderRef.current?.mimeType || 'audio/webm' 
            });
            
            const MIN_FINAL_BLOB_SIZE = 2048; // 2KB
            if (finalBlob.size >= MIN_FINAL_BLOB_SIZE) {
              console.log('[VAD:stop] Обработка единственного чанка', {
                blobSize: finalBlob.size,
                blobSizeKB: (finalBlob.size / 1024).toFixed(2),
                timestamp: new Date().toISOString(),
              });
              processAudio(finalBlob);
            }
          } else {
            console.log('[VAD:stop] Все чанки уже обработаны, финальный blob не нужен', {
              totalChunks,
              processedChunks,
              timestamp: new Date().toISOString(),
            });
          }

          // Очищаем накопленные чанки и сбрасываем флаги
          audioChunksRef.current = [];
          isFirstChunkRef.current = true;
          lastProcessedChunkIndexRef.current = 0;

          // Сразу перезапускаем прослушивание, чтобы не пропустить речь во время обработки
          setTimeout(() => {
            safeRestartListening();
          }, 100);
        };

        // Не запускаем прослушивание автоматически - ждем нажатия "Start session"
      } catch (err) {
        console.error('Error initializing audio:', err);
        setError('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.');
      }
    };

    initRecording();

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (voiceActivityCheckRef.current) {
        cancelAnimationFrame(voiceActivityCheckRef.current);
      }
      if (periodicProcessingTimerRef.current) {
        clearInterval(periodicProcessingTimerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Инициализация VAD хука
  const vadRefs = {
    analyserRef,
    dataArrayRef,
    audioContextRef,
    recorderRef,
    mediaStreamRef,
    audioChunksRef,
    isRecordingRef,
    isListeningRef,
    isProcessingRef,
    isSessionActiveRef,
    voiceActivityCheckRef,
    silenceTimerRef,
    recordingStartTimeRef,
    recentAudioLevelsRef,
    isFirstChunkRef,
    lastProcessedChunkIndexRef,
    periodicProcessingTimerRef,
  };

  // Функция stopAndProcess для VAD хука (будет определена после создания vadFunctions)
  const stopAndProcessRef = useRef(null);

  // VAD функции из хука
  const vadFunctions = useVoiceActivityDetection(
    vadRefs,
    setIsListening,
    setIsRecording,
    () => stopAndProcessRef.current?.()
  );

  const {
    safeRestartListening,
    startListening,
    checkVoiceActivity,
    startRecording: vadStartRecording,
  } = vadFunctions;

  // Stop recording and process audio
  const stopAndProcess = useCallback(() => {
    console.log('[VAD:stopAndProcess] Попытка остановки записи', {
      hasRecorder: !!recorderRef.current,
      recorderState: recorderRef.current?.state,
      isRecording: isRecordingRef.current,
      isProcessing: isProcessingRef.current,
      isListening: isListeningRef.current,
      chunksCount: audioChunksRef.current.length,
      timestamp: new Date().toISOString(),
    });

    // Если запись уже остановлена, но состояние не синхронизировано - исправляем это
    if (!recorderRef.current || recorderRef.current.state !== 'recording') {
      // Синхронизируем состояния, даже если запись уже остановлена
      if (isRecordingRef.current || isListeningRef.current) {
        console.warn('[VAD:stopAndProcess] Запись уже остановлена, синхронизируем состояния', {
          hasRecorder: !!recorderRef.current,
          recorderState: recorderRef.current?.state,
          wasRecording: isRecordingRef.current,
          wasListening: isListeningRef.current,
        });
        
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        
        // Очищаем таймеры
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        
        if (voiceActivityCheckRef.current) {
          cancelAnimationFrame(voiceActivityCheckRef.current);
          voiceActivityCheckRef.current = null;
        }
        
        // Перезапускаем прослушивание, чтобы не пропустить речь
        setTimeout(() => {
          safeRestartListening();
        }, 100);
      }
      return;
    }

    // Проверяем минимальную длительность записи перед обработкой
    const { minRecordingDuration } = getVoiceSettings();
    const recordingDuration = recordingStartTimeRef.current 
      ? Date.now() - recordingStartTimeRef.current 
      : 0;
    
    if (recordingDuration < minRecordingDuration) {
      console.log('[VAD:stopAndProcess] Запись слишком короткая, пропускаем', {
        duration: recordingDuration,
        minDuration: minRecordingDuration,
        timestamp: new Date().toISOString(),
      });
      
      // Очищаем чанки и не обрабатываем
      audioChunksRef.current = [];
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsListening(false);
      isListeningRef.current = false;
      
      // Очищаем таймеры
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      if (voiceActivityCheckRef.current) {
        cancelAnimationFrame(voiceActivityCheckRef.current);
        voiceActivityCheckRef.current = null;
      }
      
      // Сбрасываем время начала записи
      recordingStartTimeRef.current = null;
      
      // Перезапускаем прослушивание
      setTimeout(() => {
        safeRestartListening();
      }, 100);
      return;
    }

    recorderRef.current.stop();
    setIsRecording(false);
    isRecordingRef.current = false; // Синхронное обновление ref
    setIsListening(false);
    isListeningRef.current = false; // Синхронное обновление ref

    console.log('[VAD:stopAndProcess] Запись остановлена, состояния обновлены', {
      isRecording: isRecordingRef.current,
      isListening: isListeningRef.current,
      recordingDuration: `${recordingDuration}ms`,
      timestamp: new Date().toISOString(),
    });

    // Финализируем буфер предложений - создаем карточку с оставшимися предложениями
    if (sentenceBufferRef.current && sentenceBufferRef.current.length > 0) {
      finalizeSentenceBuffer({
        sentenceBufferRef,
        setMessages,
        sessionIdRef,
      });
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      console.log('[VAD:stopAndProcess] Таймер тишины очищен');
    }

    if (voiceActivityCheckRef.current) {
      cancelAnimationFrame(voiceActivityCheckRef.current);
      voiceActivityCheckRef.current = null;
      console.log('[VAD:stopAndProcess] Цикл проверки голоса отменен');
    }
    
    // Сбрасываем время начала записи после успешной остановки
    recordingStartTimeRef.current = null;
  }, [recorderRef, audioChunksRef, isRecordingRef, isListeningRef, setIsRecording, setIsListening, silenceTimerRef, voiceActivityCheckRef, recordingStartTimeRef, safeRestartListening]);

  // Сохраняем ссылку на stopAndProcess для VAD хука
  stopAndProcessRef.current = stopAndProcess;

  // Force translation of current recording
  const handleForceTranslate = () => {
    if (isRecording && recorderRef.current && recorderRef.current.state === 'recording') {
      stopAndProcess();
    }
  };

  // Start session - resume listening for voice
  const handleStartSession = () => {
    console.log('[SESSION] Запуск сессии');
    setSessionState('active');
    
    // Сохраняем статус сессии
    if (sessionIdRef.current) {
      try {
        updateSession(sessionIdRef.current, { status: 'active' });
      } catch (err) {
        console.error('Ошибка при сохранении статуса сессии:', err);
      }
    }
    
    // Запускаем прослушивание, если медиа-стрим активен
    // Используем небольшую задержку, чтобы состояние успело обновиться
    setTimeout(() => {
      if (mediaStreamRef.current?.active) {
        safeRestartListening();
      } else {
        console.warn('[SESSION] MediaStream не активен, не можем запустить прослушивание');
      }
    }, 100);
  };

  // Stop session - pause listening for voice
  const handleStopSession = () => {
    console.log('[SESSION] Остановка сессии');
    setSessionState('stopped');
    
    // Сохраняем статус сессии
    if (sessionIdRef.current) {
      try {
        updateSession(sessionIdRef.current, { status: 'stopped' });
      } catch (err) {
        console.error('Ошибка при сохранении статуса сессии:', err);
      }
    }
    
    // Остановить прослушивание
    setIsListening(false);
    isListeningRef.current = false;
    
    // Отменить проверку голоса
    if (voiceActivityCheckRef.current) {
      cancelAnimationFrame(voiceActivityCheckRef.current);
      voiceActivityCheckRef.current = null;
    }
    
    // Очистить таймеры
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Если идет запись - остановить и обработать
    if (isRecording && recorderRef.current?.state === 'recording') {
      stopAndProcess();
    } else {
      // Если запись не идет, но есть предложения в буфере - финализируем их
      if (sentenceBufferRef.current && sentenceBufferRef.current.length > 0) {
        finalizeSentenceBuffer({
          sentenceBufferRef,
          setMessages,
          sessionIdRef,
        });
      }
    }
  };


  // Обработка аудио через сервис
  const processAudio = useCallback(async (audioBlob) => {
    if (transcriptionSource === 'local_worker' && transcriptionWorkerStatusRef.current !== 'ready') {
      setError('Локальная модель распознавания еще загружается.');
      return;
    }

    // Вызываем сервис обработки аудио
    await processAudioService(audioBlob, {
      setIsProcessing,
      isProcessingRef,
      setError,
      setMessages,
      sessionIdRef,
      textStreamRef,
      recentSentencesRef,
      sentenceBufferRef,
      transcriptionSource,
      transcriptionWorkerRef,
      safeRestartListening,
      isListeningRef,
      isRecordingRef,
    });
  }, [setIsProcessing, isProcessingRef, setError, setMessages, sessionIdRef, textStreamRef, recentSentencesRef, sentenceBufferRef, transcriptionSource, transcriptionWorkerRef, safeRestartListening, isListeningRef, isRecordingRef]);

  const handleReset = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm('Вы уверены, что хотите очистить все сообщения?');
      if (!confirmed) return;
    }
    setMessages([]);
    setError(null);
    textStreamRef.current = '';
    recentSentencesRef.current = [];
  };

  const handleCreateTestMessages = async () => {
    try {
      const result = await createTestMessages(sessionId, 10);
      if (result.success) {
        // Перезагружаем сообщения из сессии
        const session = getSession(sessionId);
        if (session && session.messages) {
          const loadedMessages = session.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(loadedMessages);
        }
        console.log('✅ Тестовые сообщения созданы!');
      }
    } catch (error) {
      console.error('Ошибка при создании тестовых сообщений:', error);
      setError('Не удалось создать тестовые сообщения: ' + error.message);
    }
  };

  const handleDeleteMessage = (messageId) => {
    // Показываем тост с информацией о сообщении
    const toastId = `${messageId}-${generateMessageId()}`; // Уникальный ID для тоста
    setDeleteToasts((prev) => [
      ...prev,
      {
        id: toastId,
        messageId,
        text: 'Сообщение будет удалено',
      },
    ]);
  };

  const handleCompleteDelete = useCallback((toastId) => {
    setDeleteToasts((prev) => {
      const toast = prev.find((t) => t.id === toastId);
      if (toast && toast.messageId && sessionIdRef.current) {
        try {
          // Удаляем сообщение из localStorage
          deleteMessageFromSession(sessionIdRef.current, toast.messageId);
          
          // Удаляем сообщение из UI
          setMessages((messages) => {
            return messages.filter((msg) => msg.id !== toast.messageId);
          });
        } catch (err) {
          console.error('Ошибка при удалении сообщения из сессии:', err);
          // Все равно удаляем из UI, даже если не удалось удалить из localStorage
          setMessages((messages) => {
            return messages.filter((msg) => msg.id !== toast.messageId);
          });
        }
        return prev.filter((t) => t.id !== toastId);
      }
      return prev;
    });
  }, []);

  const handleCancelDelete = useCallback((toastId) => {
    setDeleteToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // Handle language toggle
  const handleLanguageToggle = () => {
    const newLanguage = uiLanguage === 'en' ? 'ru' : 'en';
    setUiLanguage(newLanguage);
    localStorage.setItem('ui_language', newLanguage);
  };

  // Mobile swipe handlers
  const handleTouchStart = useCallback((e) => {
    // Проверяем, что мы на мобильном устройстве
    if (window.innerWidth >= 768) return; // md breakpoint
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.innerWidth >= 768) return;
    if (!touchStartX.current || !touchStartY.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    
    // Увеличиваем порог для активации горизонтального свайпа до 20px
    // Проверяем, что горизонтальное движение значительно больше вертикального
    const horizontalThreshold = 20;
    const verticalThreshold = 15;
    
    // Если уже начался вертикальный скролл, не активируем горизонтальный свайп
    if (Math.abs(deltaY) > verticalThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      // Вертикальный скролл - не обрабатываем как свайп
      isSwiping.current = false;
      return;
    }
    
    // Определяем, что это горизонтальный свайп (не вертикальный скролл)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > horizontalThreshold) {
      isSwiping.current = true;
      // Предотвращаем скролл страницы во время горизонтального свайпа
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (window.innerWidth >= 768) return;
    if (!touchStartX.current || !isSwiping.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      isSwiping.current = false;
      return;
    }
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const minSwipeDistance = 50; // Минимальное расстояние для активации свайпа
    
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Свайп вправо - переход к левой колонке
        setMobileActiveColumn(prev => {
          if (prev > 0) return prev - 1;
          return prev;
        });
      } else {
        // Свайп влево - переход к правой колонке
        setMobileActiveColumn(prev => {
          if (prev < 2) return prev + 1;
          return prev;
        });
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  }, []);

  // Handle settings button click - на мобильных переключает на колонку настроек
  const handleSettingsClick = () => {
    if (isMobile) {
      // На мобильных переключаем на колонку настроек (индекс 2)
      // Если уже на колонке настроек, возвращаемся к центру
      setMobileActiveColumn(prev => prev === 2 ? 1 : 2);
    } else {
      // На десктопе переключаем видимость сайдбара
      setIsSettingsSidebarOpen(!isSettingsSidebarOpen);
    }
  };

  // Check if API keys are set on mount
  useEffect(() => {
    const { openai, yandex, google } = getApiKeys();
    const translationModel = getTranslationModel();
    const transcriptionSource = getTranscriptionSource();
    
    // Проверяем OpenAI ключ только если используется OpenAI Whisper для распознавания
    if (transcriptionSource === 'openai_whisper' && !openai) {
      setIsSettingsOpen(true);
      return;
    }
    
    // Проверяем ключ в зависимости от выбранной модели перевода
    if (translationModel === 'google' && !google) {
      setIsSettingsOpen(true);
    } else if (translationModel === 'yandex' && !yandex) {
      setIsSettingsOpen(true);
    }
  }, []);

  // Track window size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // При переходе с мобильного на десктоп сбрасываем активную колонку
      if (window.innerWidth >= 768) {
        setMobileActiveColumn(1);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup touch event handlers for mobile swipe
  useEffect(() => {
    const container = document.querySelector('[data-mobile-swipe-container]');
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Get status indicator color and text
  const getStatusInfo = () => {
    if (!isSessionActive) {
      return { color: 'bg-gray-400', text: 'ПАУЗА', glow: '' };
    } else if (isRecording) {
      return { color: 'bg-red-500', text: 'ЗАПИСЬ', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]' };
    } else if (isListening) {
      return { color: 'bg-yellow-500', text: 'ПРОСЛУШИВАНИЕ', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.8)]' };
    } else {
      return { color: 'bg-emerald-500', text: 'АКТИВНА', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.8)]' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="h-[100dvh] text-slate-800 ui-mesh-bg antialiased selection:bg-blue-500/30 relative">
      {/* Decorative Blurs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-50/20 rounded-full blur-[100px] mix-blend-overlay"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-200/15 rounded-full blur-[120px] mix-blend-multiply"></div>
      </div>

      {/* Top Navigation Bar (Floating Pills) */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between z-50 px-4 pt-4">
          {/* Left Pill: Unified Back Action */}
          <button
            onClick={() => navigate('/')}
            className="ui-glass-panel-thick rounded-full pl-4 pr-4 h-12 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group"
            aria-label="Назад к сессиям"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 tracking-tight">RTOnline</span>
              <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color} ${statusInfo.glow}`}></div>
            </div>
          </button>

          {/* Right Side: Language Toggle and API Keys */}
          <div className="flex items-center gap-2">
            {/* Language Toggle Button */}
            <Button
              variant="pill"
              size="lg"
              onClick={handleLanguageToggle}
              aria-label="Переключить язык"
            >
              {uiLanguage === 'en' ? 'EN' : 'RU'}
            </Button>

            {/* API Keys Action */}
            <Button
              variant="pill"
              size="lg"
              icon={
                <div className="w-5 h-5 flex items-center justify-center text-slate-600 group-hover:text-slate-800 transition-colors flex-shrink-0">
                  <KeyIcon />
                </div>
              }
              onClick={() => setIsApiKeysOpen(true)}
              aria-label="API Ключи"
              className="px-0 gap-0 w-12 md:px-5 md:gap-2.5 md:w-auto flex items-center"
            >
              <span className="hidden md:inline">API Ключи</span>
            </Button>

            {/* Test Messages Button (Dev only) */}
            {import.meta.env.DEV && (
              <button
                onClick={handleCreateTestMessages}
                className="w-12 h-12 rounded-full ui-glass-panel-thick flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 group text-purple-600 hover:text-purple-800"
                aria-label="Создать тестовые сообщения"
                title="Создать 10 тестовых сообщений"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </button>
            )}

            {/* Settings Button - Circular */}
            <button
              onClick={handleSettingsClick}
              className={`w-12 h-12 rounded-full ui-glass-panel-thick flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 group ${
                (isMobile && mobileActiveColumn === 2) || (!isMobile && isSettingsSidebarOpen) ? 'bg-blue-500/20 ring-2 ring-blue-500/30' : ''
              }`}
              aria-label="Настройки"
            >
              <div className={`w-5 h-5 flex items-center justify-center transition-colors ${
                (isMobile && mobileActiveColumn === 2) || (!isMobile && isSettingsSidebarOpen) ? 'text-blue-600 group-hover:text-blue-800' : 'text-slate-600 group-hover:text-slate-800'
              }`}>
                <SettingsIcon />
              </div>
            </button>
          </div>
      </header>

      {/* Layout Container */}
      <div 
        className="absolute inset-0 z-10 w-auto h-auto min-h-0 overflow-x-visible overflow-y-auto flex flex-col gap-6 pt-0 pb-0"
        data-mobile-swipe-container
      >
        {/* Main Content Grid */}
        <main className="flex-1 min-h-0 h-full w-full">
          {/* Mobile: Swipeable horizontal container */}
          <div className="md:hidden flex h-full overflow-hidden relative">
            {/* Visual hints for swipe - left edge gradient */}
            {mobileActiveColumn > 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900/20 to-transparent pointer-events-none z-20"></div>
            )}
            {/* Visual hints for swipe - right edge gradient */}
            {mobileActiveColumn < 2 && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/20 to-transparent pointer-events-none z-20"></div>
            )}
            <div 
              className="flex h-full transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-${mobileActiveColumn * 100}vw)`
              }}
            >
              {/* Left Sidebar (History) - Mobile */}
              <aside className="w-screen flex-shrink-0 flex flex-col min-h-0 overflow-visible px-4 pt-20 pb-0 md:pt-5">
                <div className="ui-glass-panel-thick flex-1 min-h-0 rounded-3xl p-4 flex flex-col gap-2 md:mt-[60px] mb-4">
                  <SessionHistory 
                    currentSessionId={sessionId}
                    onEditSession={setEditingSession}
                    onDeleteSession={setDeletingSession}
                    onOpenSummary={setSummarySession}
                  />
                </div>
              </aside>

              {/* Center Translation Area - Mobile */}
              <section className="w-screen flex-shrink-0 flex flex-col gap-5 min-h-0 overflow-visible pt-20 md:pt-0">
                <div 
                  ref={messagesScrollContainerMobileRef}
                  className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-visible scrollbar-hidden pb-0 md:pb-0"
                >
                  <MessageFeed
                    messages={messages}
                    onDeleteMessage={handleDeleteMessage}
                    error={error}
                    isRecording={isRecording}
                    sentencesOnScreen={sentencesOnScreen}
                    showOriginal={showOriginal}
                  />
                </div>
              </section>

              {/* Right Sidebar (Settings) - Mobile */}
              <aside className="w-screen flex-shrink-0 flex-col min-h-0 overflow-visible px-4 pt-20 pb-5 flex">
                <SettingsSidebar />
              </aside>
            </div>
          </div>

          {/* Desktop: Original grid layout */}
          <div className="hidden md:grid md:grid-cols-12 flex-1 min-h-0 h-full overflow-visible">
            {/* Left Sidebar (History) - Desktop */}
            <aside className="md:col-span-3 lg:col-span-3 flex flex-col min-h-0 overflow-visible pl-4 pr-0 pt-5 pb-5">
              <div className="ui-glass-panel-thick flex-1 min-h-0 rounded-3xl p-4 flex flex-col gap-2 mt-[60px]">
                <SessionHistory 
                  currentSessionId={sessionId}
                  onEditSession={setEditingSession}
                  onDeleteSession={setDeletingSession}
                  onOpenSummary={setSummarySession}
                />
              </div>
            </aside>

            {/* Center Translation Area - Desktop */}
            <section className={`md:col-span-9 flex flex-col gap-5 min-h-0 overflow-visible transition-all duration-300 ${
              isSettingsSidebarOpen ? 'lg:col-span-6' : 'lg:col-span-9'
            }`}>
              <div 
                ref={messagesScrollContainerDesktopRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-visible scrollbar-hidden pb-0"
              >
                <MessageFeed
                  messages={messages}
                  onDeleteMessage={handleDeleteMessage}
                  error={error}
                  isRecording={isRecording}
                  sentencesOnScreen={sentencesOnScreen}
                  showOriginal={showOriginal}
                />
              </div>
            </section>

            {/* Right Sidebar (Controls/Properties) - Desktop */}
            <aside className={`flex-col min-h-0 overflow-visible pl-0 pr-4 pt-5 pb-5 transition-all duration-300 ${
              isSettingsSidebarOpen ? 'hidden lg:flex lg:col-span-3' : 'hidden'
            }`}>
              <SettingsSidebar />
            </aside>
          </div>
        </main>
      </div>

      {/* Bottom Floating Dock (Control Bar) */}
      {/* Скрываем на экране сессий (mobileActiveColumn === 0) и на экране настроек (mobileActiveColumn === 2) */}
      {(!isMobile || mobileActiveColumn === 1) && (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl px-3 py-2.5 rounded-full flex items-center gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-2 ring-slate-700/50 border border-slate-600/30 w-auto max-w-[calc(100vw-2rem)] justify-between transform transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {/* Status Pill */}
          <div className="pl-4 pr-4 flex items-center gap-2.5">
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${statusInfo.glow}`}></div>
              {isSessionActive && (
                <div className={`absolute inset-0 rounded-full ${statusInfo.color} animate-ping opacity-60`}></div>
              )}
            </div>
            <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">{statusInfo.text}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <button
                onClick={handleForceTranslate}
                className="h-10 px-5 rounded-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all duration-200 ease-out active:scale-95 flex items-center gap-2 font-semibold"
                aria-label="Принудительно перевести текущую фразу"
              >
                <span className="text-xs font-bold uppercase tracking-wide">Перевести</span>
              </button>
            )}
            {sessionState === 'idle' && (
              <button
                onClick={handleStartSession}
                className="group h-10 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all duration-200 ease-out active:scale-95 flex items-center gap-2 font-semibold"
                aria-label="Запустить сессию"
              >
                <PlayIcon />
                <span className="text-xs font-bold uppercase tracking-wide">Старт</span>
              </button>
            )}
            {sessionState === 'active' && (
              <button
                onClick={handleStopSession}
                className="group h-10 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-white border border-amber-400/50 shadow-lg hover:shadow-amber-500/30 transition-all duration-200 ease-out active:scale-95 flex items-center gap-2 font-semibold"
                aria-label="Остановить сессию"
              >
                <PauseIcon />
                <span className="text-xs font-bold uppercase tracking-wide">Пауза</span>
              </button>
            )}
            {sessionState === 'stopped' && (
              <button
                onClick={handleStartSession}
                className="group h-10 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all duration-200 ease-out active:scale-95 flex items-center gap-2 font-semibold"
                aria-label="Запустить сессию снова"
              >
                <PlayIcon />
                <span className="text-xs font-bold uppercase tracking-wide">Продолжить</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Settings modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* API Keys modal */}
      <ApiKeysModal isOpen={isApiKeysOpen} onClose={() => setIsApiKeysOpen(false)} />

      {/* Delete confirmation toasts */}
      {deleteToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast}
          onCancel={() => handleCancelDelete(toast.id)}
          onComplete={() => handleCompleteDelete(toast.id)}
          duration={3000}
          topOffset={index * 80}
        />
      ))}

      {/* Edit Session Drawer */}
      <EditSessionDrawer
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        session={editingSession}
        onSessionUpdated={() => {
          if (editingSession?.id === sessionId) {
            const updatedSession = getSession(sessionId);
            if (updatedSession) {
              setSessionName(updatedSession.name);
            }
          }
          setEditingSession(null);
        }}
      />

      {/* Delete Session Drawer */}
      <DeleteSessionDrawer
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        session={deletingSession}
        onConfirm={() => {
          if (!deletingSession) {
            setDeletingSession(null);
            return;
          }

          const sessionToDelete = deletingSession;
          const deletedSessionId = sessionToDelete.id;
          
          try {
            // Проверяем, что сессия существует перед удалением
            const existingSession = getSession(deletedSessionId);
            if (!existingSession) {
              throw new Error('Сессия не найдена. Возможно, она уже была удалена.');
            }

            // Выполняем удаление
            deleteSession(deletedSessionId);
            
            // Если удалили текущую сессию, перенаправляем на главную
            if (deletedSessionId === sessionId) {
              // Сбрасываем состояние перед навигацией
              setDeletingSession(null);
              setError(null);
              navigate('/');
            } else {
              // Обновляем список сессий - закрываем drawer
              setDeletingSession(null);
            }
          } catch (err) {
            console.error('Ошибка при удалении сессии:', err);
            const errorMessage = err.message || 'Не удалось удалить сессию. Попробуйте еще раз.';
            setError(errorMessage);
            
            // Показываем ошибку пользователю через toast/alert
            // Закрываем drawer только если это не критическая ошибка
            if (err.message?.includes('не найдена') || err.message?.includes('not found')) {
              // Сессия уже удалена - закрываем drawer
              setDeletingSession(null);
              setError(null);
            } else {
              // Оставляем drawer открытым, чтобы пользователь мог попробовать снова
              // или закрыть его вручную
            }
          }
        }}
      />

      {/* Summary Drawer (from header button or SessionHistory) */}
      {(isSummaryDrawerOpen || summarySession) && (
        <SummaryDrawer
          isOpen={isSummaryDrawerOpen || !!summarySession}
          onClose={() => {
            setIsSummaryDrawerOpen(false);
            setSummarySession(null);
          }}
          session={summarySession || (sessionId ? getSession(sessionId) : null)}
          onSummaryGenerated={() => {
            // Обновляем сообщения, если нужно
            if (sessionId) {
              const session = getSession(sessionId);
              if (session && session.messages) {
                const loadedMessages = session.messages.map(msg => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                }));
                setMessages(loadedMessages);
              }
            }
            setSummarySession(null);
          }}
        />
      )}
    </div>
  );
}

export default Translator;
