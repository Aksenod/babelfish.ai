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
import { transcribeAudio, translateText } from '../utils/api';
import { getSession, addMessageToSession, updateMessageInSession, updateSession, deleteSession } from '../utils/sessionManager';
import { isMeaningfulText, hasCompleteSentences } from '../utils/utils';

// Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
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

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
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
  const pendingFragmentsRef = useRef([]); // Буфер для фрагментов, ожидающих объединения
  const lastFragmentTimeRef = useRef(null); // Время последнего фрагмента
  const recentAudioLevelsRef = useRef([]); // История уровней аудио для проверки стабильности
  const recordingStartTimeRef = useRef(null); // Время начала записи
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isSwiping = useRef(false);

  // Load API keys from localStorage only (для безопасности - ключи не попадают в бандл)
  // В dev режиме можно использовать .env файл через Settings компонент
  const getApiKeys = () => {
    // Всегда используем только localStorage - ключи не попадают в production бандл
    // Пользователь вводит ключи через Settings и они сохраняются в localStorage
    return {
      openai: localStorage.getItem('openai_api_key') || '',
      yandex: localStorage.getItem('yandex_api_key') || '',
      google: localStorage.getItem('google_api_key') || '',
    };
  };

  // Get translation model from localStorage
  const getTranslationModel = () => {
    return localStorage.getItem('translation_model') || 'yandex';
  };

  // Load voice detection settings from localStorage
  const getVoiceSettings = () => ({
    threshold: parseInt(localStorage.getItem('voice_threshold') || '30', 10),
    silenceDuration: parseInt(localStorage.getItem('silence_duration') || '3000', 10),
    minRecordingDuration: parseInt(localStorage.getItem('min_recording_duration') || '300', 10),
    voiceFreqMin: parseInt(localStorage.getItem('voice_freq_min') || '85', 10),
    voiceFreqMax: parseInt(localStorage.getItem('voice_freq_max') || '4000', 10),
    stabilityCheckSamples: parseInt(localStorage.getItem('stability_check_samples') || '3', 10),
    voiceEnergyRatio: parseFloat(localStorage.getItem('voice_energy_ratio') || '0.3', 10),
    stabilityCoefficient: parseFloat(localStorage.getItem('stability_coefficient') || '0.8', 10),
  });

  // Получение задержки объединения фрагментов из localStorage
  const getMergeDelay = () => {
    return parseInt(localStorage.getItem('merge_delay') || '2500', 10);
  };

  // Проверка условия автоматической отправки на перевод
  // Возвращает true, если текст >= 300 символов И есть законченные предложения
  const shouldAutoTranslate = (text) => {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    
    // Проверяем длину текста (все символы, включая пробелы и знаки препинания)
    if (trimmed.length < 300) {
      return false;
    }

    // Проверяем наличие законченных предложений
    return hasCompleteSentences(trimmed);
  };

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
        setMessages(loadedMessages);
      } else {
        // Add demo messages if session is empty
        const now = new Date();
        const demoMessages = [
          {
            id: Date.now() - 5000,
            original: "How do you spell Zavutedo? How?",
            translated: "Как пишется Завутедо? Как?",
            timestamp: new Date(now.getTime() - 300000)
          },
          {
            id: Date.now() - 4000,
            original: "Can you imagine making 10 of these programs and doing it on every 1000?",
            translated: "Можете ли вы представить, что нужно создать 10 таких программ и делать это с каждой 1000?",
            timestamp: new Date(now.getTime() - 180000)
          },
          {
            id: Date.now() - 3000,
            original: "More than a thousand subscribers would be great.",
            translated: "Было бы здорово иметь больше тысячи подписчиков.",
            timestamp: new Date(now.getTime() - 180000)
          },
          {
            id: Date.now() - 2000,
            original: "One and all your videos, you have a lot of money. In short, there are so many different videos from me...",
            translated: "Все ваши видео без исключения приносят вам много денег. Короче говоря, у меня очень много разных видео...",
            timestamp: new Date(now.getTime() - 180000)
          },
          {
            id: Date.now() - 1000,
            original: "I think that was not so good, I should've shook my head.",
            translated: "Я думаю, это было не очень хорошо, мне следовало покачать головой.",
            timestamp: new Date(now.getTime() - 120000)
          },
          {
            id: Date.now() - 500,
            original: "The weather today is absolutely beautiful, perfect for a walk in the park.",
            translated: "Погода сегодня просто прекрасная, идеально подходит для прогулки в парке.",
            timestamp: new Date(now.getTime() - 60000)
          },
          {
            id: Date.now() - 250,
            original: "Could you please help me understand this complex algorithm?",
            translated: "Не могли бы вы помочь мне понять этот сложный алгоритм?",
            timestamp: new Date(now.getTime() - 30000)
          }
        ];
        setMessages(demoMessages);
      }
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
            audioChunksRef.current.push(event.data);
            console.log('[VAD:chunk] Получен аудио чанк', {
              chunkSize: event.data.size,
              chunkSizeKB: (event.data.size / 1024).toFixed(2),
              totalChunks: audioChunksRef.current.length,
              totalSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
              totalSizeKB: (audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) / 1024).toFixed(2),
              timestamp: new Date().toISOString(),
            });
          }
        };

        recorderRef.current.onstop = async () => {
          const chunksCount = audioChunksRef.current.length;
          const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          
          console.log('[VAD:stop] Запись остановлена', {
            chunksCount,
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            recorderState: recorderRef.current?.state,
            timestamp: new Date().toISOString(),
          });

          if (audioChunksRef.current.length === 0) {
            console.warn('[VAD:stop] Нет аудио чанков для обработки');
            // Перезапускаем прослушивание даже если нет чанков, чтобы не пропустить речь
            setTimeout(() => {
              safeRestartListening();
            }, 100);
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
          audioChunksRef.current = [];

          console.log('[VAD:stop] Создан audioBlob', {
            blobSize: audioBlob.size,
            blobSizeKB: (audioBlob.size / 1024).toFixed(2),
            blobSizeMB: (audioBlob.size / (1024 * 1024)).toFixed(2),
            mimeType: supportedMimeType,
            timestamp: new Date().toISOString(),
          });

          // Сразу перезапускаем прослушивание, чтобы не пропустить речь во время обработки
          setTimeout(() => {
            safeRestartListening();
          }, 100);

          // Обрабатываем аудио асинхронно (не блокируя прослушивание)
          processAudio(audioBlob);
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
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voice Activity Detection parameters
  const CHECK_INTERVAL = 100; // Интервал проверки активности голоса в мс

  // Calculate audio level from analyser data
  const getAudioLevel = () => {
    if (!analyserRef.current || !dataArrayRef.current) return 0;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    return sum / dataArrayRef.current.length;
  };

  // Проверка частотных характеристик для определения речи
  const isVoiceLike = () => {
    if (!analyserRef.current || !dataArrayRef.current || !audioContextRef.current) return false;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    const { voiceFreqMin, voiceFreqMax, voiceEnergyRatio } = getVoiceSettings();
    
    // Получаем частотное разрешение
    const sampleRate = audioContextRef.current.sampleRate || 44100;
    const fftSize = analyserRef.current.fftSize;
    const frequencyResolution = sampleRate / fftSize;
    
    // Определяем индексы частот для речевого диапазона
    const voiceMinIndex = Math.floor(voiceFreqMin / frequencyResolution);
    const voiceMaxIndex = Math.floor(voiceFreqMax / frequencyResolution);
    
    // Вычисляем энергию в речевом диапазоне
    let voiceEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const freq = i * frequencyResolution;
      const energy = dataArrayRef.current[i];
      totalEnergy += energy;
      
      if (freq >= voiceFreqMin && freq <= voiceFreqMax) {
        voiceEnergy += energy;
      }
    }
    
    // Если общая энергия слишком мала, это не речь
    if (totalEnergy < 5) {
      return false;
    }
    
    // Доля энергии в речевом диапазоне должна быть значительной
    const calculatedRatio = voiceEnergy / totalEnergy;
    return calculatedRatio >= voiceEnergyRatio;
  };

  // Проверка стабильности сигнала (речь более стабильна, чем щелчки)
  const isStableSignal = () => {
    const { stabilityCheckSamples, stabilityCoefficient } = getVoiceSettings();
    
    if (recentAudioLevelsRef.current.length < stabilityCheckSamples) {
      return false;
    }
    
    const levels = recentAudioLevelsRef.current.slice(-stabilityCheckSamples);
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const variance = levels.reduce((sum, level) => sum + Math.pow(level - avg, 2), 0) / levels.length;
    const stdDev = Math.sqrt(variance);
    
    // Для речи стандартное отклонение относительно невелико
    // Для коротких щелчков клавиатуры - очень большое
    const coefficientOfVariation = avg > 0 ? stdDev / avg : Infinity;
    
    // Коэффициент вариации для речи обычно < 0.5, для щелчков > 1.0
    return coefficientOfVariation < stabilityCoefficient;
  };

  // Safe restart helper function
  const safeRestartListening = () => {
    console.log('[VAD:restart] safeRestartListening вызвана', {
      mediaStreamActive: mediaStreamRef.current?.active,
      isRecording: isRecordingRef.current,
      isProcessing: isProcessingRef.current,
      isListening: isListeningRef.current,
      isSessionActive: isSessionActiveRef.current,
      timestamp: new Date().toISOString(),
    });

    // Проверяем, активна ли сессия
    if (!isSessionActiveRef.current) {
      console.log('[VAD:restart] Сессия не активна, перезапуск невозможен');
      return false;
    }

    // Проверяем все условия перед перезапуском
    if (!mediaStreamRef.current?.active) {
      console.warn('[VAD:restart] MediaStream не активен, перезапуск невозможен');
      return false;
    }

    // Разрешаем перезапуск даже во время обработки, чтобы не пропускать речь пользователя
    if (isRecordingRef.current) {
      console.warn('[VAD:restart] Запись активна, перезапуск невозможен');
      return false;
    }

    // Отменяем предыдущий цикл проверки, если он есть
    if (voiceActivityCheckRef.current) {
      cancelAnimationFrame(voiceActivityCheckRef.current);
      voiceActivityCheckRef.current = null;
      console.log('[VAD:restart] Предыдущий цикл проверки отменен');
    }

    // Небольшая задержка перед перезапуском, чтобы избежать захвата остатков предыдущей записи
    setTimeout(() => {
      startListening();
    }, 100);
    return true;
  };

  // Start listening for voice activity (waiting for speech to begin)
  const startListening = () => {
    console.log('[VAD:startListening] Попытка запуска прослушивания', {
      isRecording: isRecordingRef.current,
      isProcessing: isProcessingRef.current,
      isListening: isListeningRef.current,
      isSessionActive: isSessionActiveRef.current,
      mediaStreamActive: mediaStreamRef.current?.active,
      timestamp: new Date().toISOString(),
    });

    // Проверяем, активна ли сессия
    if (!isSessionActiveRef.current) {
      console.log('[VAD:startListening] Прослушивание не запущено - сессия не активна');
      return;
    }

    // Разрешаем прослушивание даже во время обработки, чтобы не пропускать речь пользователя
    if (isRecordingRef.current) {
      console.warn('[VAD:startListening] Прослушивание не запущено - активна запись', {
        isRecording: isRecordingRef.current,
      });
      return;
    }

    setIsListening(true);
    isListeningRef.current = true; // Синхронное обновление ref
    console.log('[VAD:startListening] Прослушивание запущено', {
      timestamp: new Date().toISOString(),
    });
    
    // Гарантируем запуск цикла проверки
    // Отменяем предыдущий цикл, если он есть
    if (voiceActivityCheckRef.current) {
      cancelAnimationFrame(voiceActivityCheckRef.current);
      voiceActivityCheckRef.current = null;
    }
    
    // Запускаем новый цикл
    checkVoiceActivity();
  };

  // Check for voice activity continuously
  const checkVoiceActivity = () => {
    // Проверяем, активна ли сессия
    if (!isSessionActiveRef.current) {
      console.log('[VAD:checkVoice] Проверка пропущена - сессия не активна');
      return;
    }

    if (!analyserRef.current || !dataArrayRef.current) {
      console.warn('[VAD:checkVoice] Пропуск проверки - нет analyser или dataArray', {
        hasAnalyser: !!analyserRef.current,
        hasDataArray: !!dataArrayRef.current,
      });
      return;
    }

    const { threshold, silenceDuration } = getVoiceSettings();
    const audioLevel = getAudioLevel();
    
    // Обновляем историю уровней для проверки стабильности
    recentAudioLevelsRef.current.push(audioLevel);
    const { stabilityCheckSamples } = getVoiceSettings();
    if (recentAudioLevelsRef.current.length > stabilityCheckSamples * 2) {
      recentAudioLevelsRef.current.shift(); // Держим только последние N значений
    }

    // Логируем только периодически, чтобы не засорять консоль
    const shouldLog = Math.random() < 0.01; // Логируем ~1% проверок
    if (shouldLog) {
      console.log('[VAD:checkVoice] Проверка активности голоса', {
        audioLevel: audioLevel.toFixed(2),
        threshold,
        isRecording: isRecordingRef.current,
        isListening: isListeningRef.current,
        isProcessing: isProcessingRef.current,
        hasSilenceTimer: !!silenceTimerRef.current,
      });
    }

    // Улучшенная проверка начала записи с более строгими требованиями
    if (!isRecordingRef.current && audioLevel > threshold) {
      // Дополнительные проверки для фильтрации звуков клавиатуры и посторонних звуков
      const hasVoiceLikeFrequencies = isVoiceLike();
      const isStable = isStableSignal();
      
      // Требуем ОБА условия для начала записи:
      // 1. Сигнал должен иметь речевые частоты ИЛИ быть стабильным
      // 2. Дополнительно: уровень должен быть достаточно высоким (не просто шум)
      const minEnergyForRecording = threshold * 1.5; // Требуем уровень выше порога на 50%
      const hasEnoughEnergy = audioLevel >= minEnergyForRecording;
      
      // Для начала записи требуем:
      // - Речевые частоты ИЛИ стабильный сигнал
      // - Достаточный уровень энергии (не просто фоновый шум)
      // - Стабильность проверяется только если есть достаточно истории
      const canStartRecording = hasEnoughEnergy && 
        (hasVoiceLikeFrequencies || (isStable && recentAudioLevelsRef.current.length >= stabilityCheckSamples));
      
      if (canStartRecording) {
        console.log('[VAD:checkVoice] Обнаружен голос - начало записи', {
          audioLevel: audioLevel.toFixed(2),
          threshold,
          minEnergyForRecording: minEnergyForRecording.toFixed(2),
          hasVoiceLikeFrequencies,
          isStable,
          hasEnoughEnergy,
          timestamp: new Date().toISOString(),
        });
        startRecording();
      } else {
        // Логируем пропущенные события для отладки
        if (Math.random() < 0.1) { // Логируем ~10% пропущенных событий
          console.log('[VAD:checkVoice] Звук пропущен (не похож на речь или недостаточная энергия)', {
            audioLevel: audioLevel.toFixed(2),
            threshold,
            minEnergyForRecording: minEnergyForRecording.toFixed(2),
            hasVoiceLikeFrequencies,
            isStable,
            hasEnoughEnergy,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (isRecordingRef.current) {
      // Already recording - check for silence
      if (audioLevel < threshold) {
        // Silence detected - start/update silence timer
        if (!silenceTimerRef.current) {
          console.log('[VAD:checkVoice] Обнаружена тишина - запуск таймера', {
            audioLevel: audioLevel.toFixed(2),
            threshold,
            silenceDuration,
            timestamp: new Date().toISOString(),
          });
          silenceTimerRef.current = setTimeout(() => {
            // Silence duration exceeded - stop recording
            console.log('[VAD:checkVoice] Длительность тишины превышена - остановка записи', {
              silenceDuration,
              timestamp: new Date().toISOString(),
            });
            stopAndProcess();
          }, silenceDuration);
        }
      } else {
        // Voice still active - clear silence timer
        if (silenceTimerRef.current) {
          console.log('[VAD:checkVoice] Голос активен - очистка таймера тишины', {
            audioLevel: audioLevel.toFixed(2),
            threshold,
            timestamp: new Date().toISOString(),
          });
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
    }

    // Continue checking - продолжаем во время прослушивания или записи
    // Также продолжаем во время обработки, чтобы не пропускать новую речь пользователя
    // Но только если сессия активна
    const shouldContinue = isSessionActiveRef.current && (isListeningRef.current || isRecordingRef.current);
    
    if (shouldContinue) {
      // Используем requestAnimationFrame для плавной работы
      voiceActivityCheckRef.current = requestAnimationFrame(() => {
        // Используем setTimeout для контроля интервала проверки
        setTimeout(() => {
          // Проверяем, что состояние не изменилось перед следующим вызовом
          // Продолжаем проверку во время прослушивания или записи, если сессия активна
          if (isSessionActiveRef.current && (isListeningRef.current || isRecordingRef.current)) {
            checkVoiceActivity();
          } else {
            console.log('[VAD:checkVoice] Состояние изменилось, цикл остановлен', {
              isSessionActive: isSessionActiveRef.current,
              isListening: isListeningRef.current,
              isRecording: isRecordingRef.current,
              timestamp: new Date().toISOString(),
            });
          }
        }, CHECK_INTERVAL);
      });
    } else {
      // Если прослушивание не активно, но обработка идет и сессия активна - перезапускаем прослушивание
      // чтобы не пропустить речь пользователя во время обработки
      if (isSessionActiveRef.current && isProcessingRef.current && !isListeningRef.current) {
        console.log('[VAD:checkVoice] Обработка идет, перезапускаем прослушивание', {
          isProcessing: isProcessingRef.current,
          isListening: isListeningRef.current,
          timestamp: new Date().toISOString(),
        });
        startListening();
        return;
      }
      
      console.log('[VAD:checkVoice] Цикл проверки остановлен', {
        isListening: isListeningRef.current,
        isRecording: isRecordingRef.current,
        timestamp: new Date().toISOString(),
      });
      
      // Очищаем ref, если цикл остановлен
      if (voiceActivityCheckRef.current) {
        cancelAnimationFrame(voiceActivityCheckRef.current);
        voiceActivityCheckRef.current = null;
      }
    }
  };

  // Start recording when voice is detected
  const startRecording = () => {
    console.log('[VAD:startRecording] Попытка начала записи', {
      hasRecorder: !!recorderRef.current,
      recorderState: recorderRef.current?.state,
      timestamp: new Date().toISOString(),
    });

    if (!recorderRef.current || recorderRef.current.state === 'recording') {
      console.warn('[VAD:startRecording] Запись не может быть начата', {
        hasRecorder: !!recorderRef.current,
        recorderState: recorderRef.current?.state,
      });
      return;
    }

    audioChunksRef.current = [];
    recordingStartTimeRef.current = Date.now(); // Устанавливаем время начала записи
    recorderRef.current.start();
    setIsRecording(true);
    isRecordingRef.current = true; // Синхронное обновление ref
    setIsListening(false);
    isListeningRef.current = false; // Синхронное обновление ref

    console.log('[SYNC:state] Состояние после начала записи', {
      isRecording: isRecordingRef.current,
      isListening: isListeningRef.current,
      recorderState: recorderRef.current?.state,
      timestamp: new Date().toISOString(),
    });

    // Clear any existing silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      console.log('[VAD:startRecording] Таймер тишины очищен');
    }
  };

  // Stop recording and process audio
  const stopAndProcess = () => {
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
  };

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
    }
  };

  // Save and exit session
  const handleSaveAndExit = () => {
    // Session is already saved automatically when messages are added/updated
    navigate('/');
  };

  // Проверка энергии аудио перед обработкой
  const checkAudioEnergy = async (audioBlob) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Получаем данные канала
      const channelData = audioBuffer.getChannelData(0);
      
      // Вычисляем RMS (Root Mean Square) - среднюю энергию сигнала
      let sumSquares = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquares += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sumSquares / channelData.length);
      
      // Вычисляем среднюю амплитуду
      let sumAmplitude = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumAmplitude += Math.abs(channelData[i]);
      }
      const avgAmplitude = sumAmplitude / channelData.length;
      
      // Проверяем, что аудио не слишком тихое (порог для минимальной энергии)
      const minEnergyThreshold = 0.01; // Минимальный RMS для обработки
      const minAmplitudeThreshold = 0.005; // Минимальная средняя амплитуда
      
      await audioContext.close();
      
      return {
        rms,
        avgAmplitude,
        hasEnoughEnergy: rms >= minEnergyThreshold && avgAmplitude >= minAmplitudeThreshold,
        duration: audioBuffer.duration,
      };
    } catch (error) {
      console.warn('[VAD:checkAudioEnergy] Ошибка проверки энергии аудио:', error);
      // В случае ошибки разрешаем обработку (лучше обработать, чем пропустить речь)
      return { hasEnoughEnergy: true, rms: 0, avgAmplitude: 0, duration: 0 };
    }
  };

  const processAudio = async (audioBlob) => {
    const processStartTime = Date.now();
    
    console.log('[VAD:processAudio] Начало обработки аудио', {
      blobSize: audioBlob.size,
      blobSizeKB: (audioBlob.size / 1024).toFixed(2),
      isProcessing,
      isProcessingRef: isProcessingRef.current,
      isRecording: isRecordingRef.current,
      isListening: isListeningRef.current,
      timestamp: new Date().toISOString(),
    });

    // Проверяем энергию аудио перед обработкой
    const energyCheck = await checkAudioEnergy(audioBlob);
    console.log('[VAD:processAudio] Проверка энергии аудио', {
      rms: energyCheck.rms.toFixed(4),
      avgAmplitude: energyCheck.avgAmplitude.toFixed(4),
      hasEnoughEnergy: energyCheck.hasEnoughEnergy,
      duration: energyCheck.duration.toFixed(2),
      timestamp: new Date().toISOString(),
    });
    
    // Если аудио слишком тихое, пропускаем обработку
    if (!energyCheck.hasEnoughEnergy) {
      console.log('[FILTER:energy] Аудио слишком тихое, пропускаем обработку', {
        rms: energyCheck.rms.toFixed(4),
        avgAmplitude: energyCheck.avgAmplitude.toFixed(4),
        duration: energyCheck.duration.toFixed(2),
        timestamp: new Date().toISOString(),
      });
      
      // Перезапускаем прослушивание
      if (!isListeningRef.current && !isRecordingRef.current) {
        setTimeout(() => {
          safeRestartListening();
        }, 100);
      }
      return;
    }

    // Разрешаем параллельную обработку, чтобы не блокировать запись новой речи
    // Флаг isProcessing будет true если идет хотя бы одна обработка
    setIsProcessing(true);
    isProcessingRef.current = true; // Синхронное обновление ref
    setError(null);

    console.log('[SYNC:state] Состояние после setIsProcessing(true)', {
      isProcessing: isProcessingRef.current,
      isRecording: isRecordingRef.current,
      isListening: isListeningRef.current,
      timestamp: new Date().toISOString(),
    });

    try {
      const { openai, yandex, google } = getApiKeys();
      const translationModel = getTranslationModel();

      if (!openai) {
        throw new Error('OpenAI API ключ не настроен. Откройте настройки.');
      }

      // Проверяем ключ в зависимости от выбранной модели перевода
      if (translationModel === 'google' && !google) {
        throw new Error('Google Translate API ключ не настроен. Откройте настройки.');
      } else if (translationModel === 'yandex' && !yandex) {
        throw new Error('Яндекс.Переводчик API ключ не настроен. Откройте настройки.');
      }

      // Step 1: Transcribe audio
      console.log('[VAD:processAudio] Начало распознавания речи', {
        bufferState: {
          fragmentsCount: pendingFragmentsRef.current.length,
          fragments: pendingFragmentsRef.current.map(f => ({
            text: f.text,
            age: Date.now() - f.timestamp,
          })),
          lastFragmentTime: lastFragmentTimeRef.current 
            ? Date.now() - lastFragmentTimeRef.current 
            : null,
        },
        timestamp: new Date().toISOString(),
      });
      const transcribedText = await transcribeAudio(audioBlob, openai);
      console.log('[VAD:processAudio] Распознавание завершено', {
        transcribedText,
        textLength: transcribedText.length,
        timestamp: new Date().toISOString(),
      });

      // Явный лог распознанного текста
      console.log('[RECOGNITION] ========================================');
      console.log('[RECOGNITION] Распознанный текст из аудио:');
      console.log('[RECOGNITION]', transcribedText);
      console.log('[RECOGNITION] Длина текста:', transcribedText.length, 'символов');
      console.log('[RECOGNITION] ========================================');

      if (!transcribedText || transcribedText.trim().length === 0) {
        console.warn('[VAD:processAudio] Пустой результат распознавания');
        setIsProcessing(false);
        isProcessingRef.current = false; // Синхронное обновление ref
        
        console.log('[SYNC:state] Состояние перед перезапуском (пустой текст)', {
          isProcessing: isProcessingRef.current,
          isRecording: isRecordingRef.current,
          isListening: isListeningRef.current,
          mediaStreamActive: mediaStreamRef.current?.active,
          timestamp: new Date().toISOString(),
        });

        // Прослушивание уже должно быть перезапущено из onstop обработчика
        // Но если по какой-то причине не перезапустилось - делаем это здесь
        if (!isListeningRef.current && !isRecordingRef.current) {
          setTimeout(() => {
            safeRestartListening();
          }, 100);
        }
        return;
      }

      // Проверка на осмысленность текста
      if (!isMeaningfulText(transcribedText)) {
        console.log('[FILTER:meaningless] Текст пропущен как бессмысленный или артефакт', {
          text: transcribedText,
          textLength: transcribedText.length,
          timestamp: new Date().toISOString(),
        });
        setIsProcessing(false);
        isProcessingRef.current = false;
        
        // Очищаем буфер фрагментов, так как текущий фрагмент бессмысленный
        if (pendingFragmentsRef.current.length > 0) {
          console.log('[FILTER:meaningless] Очистка буфера фрагментов', {
            clearedFragments: pendingFragmentsRef.current.length,
            timestamp: new Date().toISOString(),
          });
          pendingFragmentsRef.current = [];
          lastFragmentTimeRef.current = null;
        }
        
        console.log('[SYNC:state] Состояние перед перезапуском (бессмысленный текст)', {
          isProcessing: isProcessingRef.current,
          isRecording: isRecordingRef.current,
          isListening: isListeningRef.current,
          mediaStreamActive: mediaStreamRef.current?.active,
          timestamp: new Date().toISOString(),
        });

        if (!isListeningRef.current && !isRecordingRef.current) {
          setTimeout(() => {
            safeRestartListening();
          }, 100);
        }
        return;
      }

      // Проверяем, нужно ли объединить с предыдущими фрагментами
      const currentTime = Date.now();
      const timeSinceLastFragment = lastFragmentTimeRef.current 
        ? currentTime - lastFragmentTimeRef.current 
        : Infinity;
      
      const mergeWindow = getMergeDelay();
      
      console.log('[MERGE:check] Проверка условий объединения', {
        timeSinceLastFragment: timeSinceLastFragment === Infinity ? 'first_fragment' : `${timeSinceLastFragment}ms`,
        mergeWindow: `${mergeWindow}ms`,
        bufferSize: pendingFragmentsRef.current.length,
        bufferContents: pendingFragmentsRef.current.map((f, i) => ({
          index: i,
          text: f.text,
          age: `${currentTime - f.timestamp}ms`,
        })),
        currentText: transcribedText,
        canMerge: timeSinceLastFragment <= mergeWindow && pendingFragmentsRef.current.length > 0,
        timestamp: new Date().toISOString(),
      });
      
      let finalText = transcribedText.trim();
      let shouldMerge = false;
      let shouldAutoTranslateFlag = false;

      // Если есть недавние фрагменты (в пределах окна объединения)
      if (timeSinceLastFragment <= mergeWindow && pendingFragmentsRef.current.length > 0) {
        shouldMerge = true;
        // Объединяем все фрагменты из буфера с текущим текстом
        const previousTexts = pendingFragmentsRef.current.map(f => f.text).join(' ');
        finalText = `${previousTexts} ${finalText}`.trim();
        
        console.log('[MERGE:merge] Объединение фрагментов', {
          previousFragments: pendingFragmentsRef.current.length,
          previousTexts,
          currentText: transcribedText,
          finalText,
          timeSinceLastFragment: `${timeSinceLastFragment}ms`,
          mergeWindow: `${mergeWindow}ms`,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Если прошло больше времени или буфер пуст, добавляем текущий фрагмент в буфер
        const reason = timeSinceLastFragment === Infinity 
          ? 'first_fragment' 
          : timeSinceLastFragment > mergeWindow 
            ? 'timeout' 
            : 'empty_buffer';
        
        pendingFragmentsRef.current.push({
          text: transcribedText.trim(),
          timestamp: currentTime,
        });
        
        console.log('[MERGE:buffer] Фрагмент добавлен в буфер', {
          reason,
          fragmentText: transcribedText,
          bufferSize: pendingFragmentsRef.current.length,
          timeSinceLastFragment: timeSinceLastFragment === Infinity ? 'first' : `${timeSinceLastFragment}ms`,
          bufferContents: pendingFragmentsRef.current.map((f, i) => ({
            index: i,
            text: f.text,
            age: `${currentTime - f.timestamp}ms`,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // НОВАЯ ПРОВЕРКА: автоматическая отправка при 300+ символов с законченными предложениями
      // Проверяем после добавления или объединения фрагментов
      if (!shouldMerge) {
        // Если не было объединения, проверяем весь буфер (включая только что добавленный фрагмент)
        // Буфер уже содержит текущий фрагмент, так что просто объединяем все
        const allFragmentsText = pendingFragmentsRef.current.map(f => f.text).join(' ');
        const combinedTextForCheck = allFragmentsText.trim();
        
        if (shouldAutoTranslate(combinedTextForCheck)) {
          console.log('[AUTO:translate] Условие автоматической отправки выполнено', {
            textLength: combinedTextForCheck.length,
            hasCompleteSentences: hasCompleteSentences(combinedTextForCheck),
            bufferSize: pendingFragmentsRef.current.length,
            combinedText: combinedTextForCheck.substring(0, 100) + '...',
            timestamp: new Date().toISOString(),
          });
          
          // Устанавливаем флаги для автоматической отправки
          shouldAutoTranslateFlag = true;
          shouldMerge = true; // Используем существующую логику объединения
          finalText = combinedTextForCheck;
          
          // Очищаем буфер, так как отправляем на перевод
          console.log('[AUTO:buffer] Очистка буфера после автоматической отправки', {
            clearedFragments: pendingFragmentsRef.current.length,
            timestamp: new Date().toISOString(),
          });
          pendingFragmentsRef.current = [];
        }
      } else {
        // Если было объединение, проверяем объединенный текст
        // (это уже будет обработано дальше в коде, но логируем для отладки)
        if (shouldAutoTranslate(finalText)) {
          console.log('[AUTO:translate] Условие автоматической отправки выполнено (после объединения)', {
            textLength: finalText.length,
            hasCompleteSentences: hasCompleteSentences(finalText),
            timestamp: new Date().toISOString(),
          });
          
          shouldAutoTranslateFlag = true;
        }
      }

      // Обновляем время последнего фрагмента
      lastFragmentTimeRef.current = currentTime;

      // Логируем финальный текст (после объединения, если было)
      if (shouldMerge) {
        console.log('[RECOGNITION] Финальный текст (после объединения фрагментов):');
        console.log('[RECOGNITION]', finalText);
        console.log('[RECOGNITION] Длина финального текста:', finalText.length, 'символов');
      }

      // Определяем messageId и создаем/обновляем сообщение
      let messageId;
      
      if (shouldMerge) {
        console.log('[MERGE:message] Попытка обновить/создать сообщение для объединенного текста', {
          finalText,
          timestamp: new Date().toISOString(),
        });
        
        // Пытаемся обновить последнее сообщение, если оно еще не переведено
        
        setMessages((prev) => {
          if (prev.length === 0) {
            // Если сообщений нет, создаем новое
            messageId = Date.now();
            console.log('[MERGE:message] Создание первого сообщения (буфер был пуст)', {
              messageId,
              text: finalText,
              timestamp: new Date().toISOString(),
            });
            const newMessage = {
              id: messageId,
              original: finalText,
              translated: null,
              timestamp: new Date(),
            };
            // Save to session
            if (sessionIdRef.current) {
              try {
                addMessageToSession(sessionIdRef.current, newMessage);
              } catch (err) {
                console.error('Error saving message to session:', err);
              }
            }
            return [...prev, newMessage];
          }
          
          const lastMessage = prev[prev.length - 1];
          const lastMessageAge = currentTime - lastMessage.timestamp.getTime();
          const mergeWindow = getMergeDelay();
          
          console.log('[MERGE:message] Проверка последнего сообщения', {
            lastMessageId: lastMessage.id,
            lastMessageText: lastMessage.original,
            lastMessageHasTranslation: lastMessage.translated !== null,
            lastMessageAge: `${lastMessageAge}ms`,
            mergeWindow: `${mergeWindow}ms`,
            canUpdate: lastMessage.translated === null && lastMessageAge <= mergeWindow,
            timestamp: new Date().toISOString(),
          });
          
          // Обновляем последнее сообщение, если:
          // 1. Оно еще не переведено (translated === null)
          // 2. Оно было создано недавно (в пределах окна объединения)
          if (lastMessage.translated === null && lastMessageAge <= mergeWindow) {
            messageId = lastMessage.id;
            
            console.log('[MERGE:message] ✓ Обновление последнего сообщения', {
              messageId: lastMessage.id,
              oldText: lastMessage.original,
              newText: finalText,
              lastMessageAge: `${lastMessageAge}ms`,
              timestamp: new Date().toISOString(),
            });
            
            // Обновляем последнее сообщение объединенным текстом
            const updatedMessage = { ...lastMessage, original: finalText };
            // Update in session
            if (sessionIdRef.current) {
              try {
                // Передаем полное сообщение, чтобы если его нет - создать с правильными данными
                updateMessageInSession(sessionIdRef.current, messageId, {
                  original: finalText,
                  translated: lastMessage.translated,
                  timestamp: lastMessage.timestamp instanceof Date 
                    ? lastMessage.timestamp.getTime() 
                    : lastMessage.timestamp
                });
              } catch (err) {
                console.error('Error updating message in session:', err);
                // Если обновление не удалось, попробуем добавить сообщение заново
                try {
                  addMessageToSession(sessionIdRef.current, updatedMessage);
                } catch (addErr) {
                  console.error('Error adding message to session:', addErr);
                }
              }
            }
            return prev.map((msg, index) => 
              index === prev.length - 1
                ? updatedMessage
                : msg
            );
          } else {
            // Если последнее сообщение уже переведено или прошло много времени,
            // создаем новое сообщение
            messageId = Date.now();
            
            const reason = lastMessage.translated !== null 
              ? 'already_translated' 
              : lastMessageAge > mergeWindow 
                ? 'too_old' 
                : 'unknown';
            
            console.log('[MERGE:message] ✗ Нельзя обновить последнее сообщение, создаем новое', {
              reason,
              lastMessageId: lastMessage.id,
              hasTranslation: lastMessage.translated !== null,
              lastMessageAge: `${lastMessageAge}ms`,
              mergeWindow: `${mergeWindow}ms`,
              newMessageId: messageId,
              newText: finalText,
              timestamp: new Date().toISOString(),
            });
            
            const newMessage = {
              id: messageId,
              original: finalText,
              translated: null,
              timestamp: new Date(),
            };
            // Save to session
            if (sessionIdRef.current) {
              try {
                addMessageToSession(sessionIdRef.current, newMessage);
              } catch (err) {
                console.error('Error saving message to session:', err);
              }
            }
            return [...prev, newMessage];
          }
        });
        
        // Очищаем буфер, так как мы объединили фрагменты
        console.log('[MERGE:buffer] Очистка буфера после объединения', {
          clearedFragments: pendingFragmentsRef.current.length,
          timestamp: new Date().toISOString(),
        });
        pendingFragmentsRef.current = [];
      } else {
        // Если не объединяем, создаем новое сообщение
        // Очищаем буфер, так как прошло слишком много времени для объединения
        const clearedFragments = pendingFragmentsRef.current.length;
        console.log('[MERGE:buffer] Очистка буфера (слишком много времени прошло)', {
          clearedFragments,
          bufferContents: pendingFragmentsRef.current.map((f, i) => ({
            index: i,
            text: f.text,
            age: `${currentTime - f.timestamp}ms`,
          })),
          timestamp: new Date().toISOString(),
        });
        pendingFragmentsRef.current = [];
        
        messageId = Date.now();
        const newMessage = {
          id: messageId,
          original: finalText,
          translated: null,
          timestamp: new Date(),
        };
        
        // Save to session
        if (sessionIdRef.current) {
          try {
            addMessageToSession(sessionIdRef.current, newMessage);
          } catch (err) {
            console.error('Error saving message to session:', err);
          }
        }
        
        setMessages((prev) => [...prev, newMessage]);
        console.log('[MERGE:message] Новое сообщение создано (без объединения)', { 
          messageId, 
          original: finalText,
          reason: 'no_merge',
          timestamp: new Date().toISOString(),
        });
      }

      // Step 2: Translate text (используем объединенный текст, если было объединение)
      // Сохраняем информацию о количестве фрагментов для лога
      const fragmentsCount = shouldMerge 
        ? (pendingFragmentsRef.current.length > 0 ? pendingFragmentsRef.current.length + 1 : 1)
        : 1;
      
      console.log('[TRANSLATE:start] Начало перевода', { 
        messageId,
        model: translationModel,
        text: finalText,
        textLength: finalText.length,
        isMerged: shouldMerge,
        originalFragments: fragmentsCount,
        timestamp: new Date().toISOString(),
      });
      const translationApiKey = translationModel === 'google' ? google : yandex;
      const translatedText = await translateText(finalText, translationApiKey, translationModel);
      console.log('[VAD:processAudio] Перевод завершен', {
        translatedText,
        textLength: translatedText.length,
        model: translationModel,
      });

      // Явный лог перевода
      console.log('[TRANSLATION] ========================================');
      console.log('[TRANSLATION] Оригинальный текст (EN):');
      console.log('[TRANSLATION]', finalText);
      console.log('[TRANSLATION] ---');
      console.log('[TRANSLATION] Переведенный текст (RU):');
      console.log('[TRANSLATION]', translatedText);
      console.log('[TRANSLATION] ---');
      console.log('[TRANSLATION] Модель перевода:', translationModel);
      console.log('[TRANSLATION] Длина оригинала:', finalText.length, 'символов');
      console.log('[TRANSLATION] Длина перевода:', translatedText.length, 'символов');
      console.log('[TRANSLATION] ========================================');

      // Update message with translation
      const updatedMessage = { translated: translatedText };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, ...updatedMessage }
            : msg
        )
      );
      
      // Save translation to session
      if (sessionIdRef.current) {
        try {
          updateMessageInSession(sessionIdRef.current, messageId, updatedMessage);
        } catch (err) {
          console.error('Error updating message in session:', err);
        }
      }
      console.log('[TRANSLATE:complete] Сообщение обновлено переводом', { 
        messageId,
        original: finalText,
        translated: translatedText,
        originalLength: finalText.length,
        translatedLength: translatedText.length,
        timestamp: new Date().toISOString(),
      });

      const processDuration = Date.now() - processStartTime;
      console.log('[VAD:processAudio] Обработка завершена успешно', {
        duration: processDuration,
        durationSeconds: (processDuration / 1000).toFixed(2),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[VAD:processAudio] Ошибка обработки', {
        error: err.message,
        stack: err.stack,
        duration: Date.now() - processStartTime,
        timestamp: new Date().toISOString(),
      });
      setError(err.message || 'Ошибка при обработке аудио');
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false; // Синхронное обновление ref
      
      console.log('[SYNC:state] Состояние после setIsProcessing(false)', {
        isProcessing: isProcessingRef.current,
        isRecording: isRecordingRef.current,
        isListening: isListeningRef.current,
        timestamp: new Date().toISOString(),
      });

      // Прослушивание уже должно быть перезапущено из onstop обработчика сразу после остановки записи
      // Но если по какой-то причине не перезапустилось - делаем это здесь
      if (!isListeningRef.current && !isRecordingRef.current) {
        setTimeout(() => {
          safeRestartListening();
        }, 100);
      }
    }
  };

  const handleReset = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm('Вы уверены, что хотите очистить все сообщения?');
      if (!confirmed) return;
    }
    setMessages([]);
    setError(null);
  };

  const handleDeleteMessage = (messageId) => {
    // Показываем тост с информацией о сообщении
    const toastId = `${messageId}-${Date.now()}`; // Уникальный ID для тоста
    setDeleteToasts((prev) => [
      ...prev,
      {
        id: toastId,
        messageId,
        text: 'Сообщение будет удалено',
      },
    ]);
  };

  const handleCompleteDelete = (toastId) => {
    setDeleteToasts((prev) => {
      const toast = prev.find((t) => t.id === toastId);
      if (toast) {
        setMessages((messages) => {
          const updated = messages.filter((msg) => msg.id !== toast.messageId);
          // TODO: Remove message from session in localStorage
          // For now, we'll just remove from UI
          return updated;
        });
        return prev.filter((t) => t.id !== toastId);
      }
      return prev;
    });
  };

  const handleCancelDelete = (toastId) => {
    setDeleteToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

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
    
    // Определяем, что это горизонтальный свайп (не вертикальный скролл)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
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
    
    if (!openai) {
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

            {/* Settings Button - Circular */}
            <button
              onClick={handleSettingsClick}
              className={`w-12 h-12 rounded-full ui-glass-panel-thick flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 group ${
                (isMobile && mobileActiveColumn === 2) || (!isMobile && isSettingsSidebarOpen) ? 'bg-blue-500/20 ring-2 ring-blue-500/30' : ''
              }`}
              aria-label="Настройки"
            >
              <div className={`w-5 h-5 flex items-center justify-center transition-colors ${
                isSettingsSidebarOpen ? 'text-blue-600 group-hover:text-blue-800' : 'text-slate-600 group-hover:text-slate-800'
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
            <div 
              className="flex h-full transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-${mobileActiveColumn * 100}%)`,
                width: '300%'
              }}
            >
              {/* Left Sidebar (History) - Mobile */}
              <aside className="w-1/3 flex-shrink-0 flex flex-col min-h-0 overflow-visible pl-4 pr-0 pt-5 pb-5">
                <div className="ui-glass-panel-thick flex-1 min-h-0 rounded-3xl p-4 flex flex-col gap-2 mt-[60px]">
                  <SessionHistory 
                    currentSessionId={sessionId}
                    onEditSession={setEditingSession}
                    onDeleteSession={setDeletingSession}
                    onOpenSummary={setSummarySession}
                  />
                </div>
              </aside>

              {/* Center Translation Area - Mobile */}
              <section className="w-1/3 flex-shrink-0 flex flex-col gap-5 min-h-0 overflow-visible">
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-visible scrollbar-hidden pb-0">
                  <MessageFeed messages={messages} onDeleteMessage={handleDeleteMessage} error={error} isRecording={isRecording} />
                </div>
              </section>

              {/* Right Sidebar (Settings) - Mobile */}
              <aside className="w-1/3 flex-shrink-0 flex-col min-h-0 overflow-visible pl-0 pr-4 pt-5 pb-5 flex">
                <div className="ui-glass-panel-thick flex-1 min-h-0 rounded-3xl p-4 flex flex-col gap-2 mt-[60px]">
                  <SettingsSidebar />
                </div>
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
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-visible scrollbar-hidden pb-0">
                <MessageFeed messages={messages} onDeleteMessage={handleDeleteMessage} error={error} isRecording={isRecording} />
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
              <>
                <button
                  onClick={handleSaveAndExit}
                  className="h-10 w-10 rounded-full bg-slate-700/80 hover:bg-slate-600 text-white flex items-center justify-center transition-all duration-200 ease-out active:scale-95 border border-slate-500/50 shadow-md"
                  aria-label="Сохранить и выйти"
                >
                  <SaveIcon />
                </button>
                <button
                  onClick={handleStartSession}
                  className="group h-10 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all duration-200 ease-out active:scale-95 flex items-center gap-2 font-semibold"
                  aria-label="Запустить сессию снова"
                >
                  <PlayIcon />
                  <span className="text-xs font-bold uppercase tracking-wide">Продолжить</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

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
          if (deletingSession) {
            try {
              deleteSession(deletingSession.id);
              // Если удалили текущую сессию, перенаправляем на главную
              if (deletingSession.id === sessionId) {
                navigate('/');
              } else {
                // Обновляем список сессий
                setDeletingSession(null);
              }
            } catch (err) {
              console.error('Ошибка при удалении сессии:', err);
              setError(err.message || 'Ошибка при удалении сессии');
              setDeletingSession(null);
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
