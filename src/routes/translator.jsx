import { useEffect, useRef, useState } from 'react';
import MessageFeed from '../components/MessageFeed';
import Settings from '../components/Settings';
import Toast from '../components/Toast';
import { transcribeAudio, translateText } from '../utils/api';
import { apiKeys as configApiKeys } from '../config/apiKeys';

function Translator() {
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false); // Состояние прослушивания (ожидание речи)
  const [deleteToast, setDeleteToast] = useState(null); // Состояние для тоста удаления

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
  const pendingFragmentsRef = useRef([]); // Буфер для фрагментов, ожидающих объединения
  const lastFragmentTimeRef = useRef(null); // Время последнего фрагмента

  // Load API keys from config file, .env file, or localStorage (in that order)
  const getApiKeys = () => ({
    openai: configApiKeys.openai || import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '',
    yandex: configApiKeys.yandex || import.meta.env.VITE_YANDEX_API_KEY || localStorage.getItem('yandex_api_key') || '',
    google: configApiKeys.google || import.meta.env.VITE_GOOGLE_API_KEY || localStorage.getItem('google_api_key') || '',
  });

  // Get translation model from localStorage
  const getTranslationModel = () => {
    return localStorage.getItem('translation_model') || 'yandex';
  };

  // Load voice detection settings from localStorage
  const getVoiceSettings = () => ({
    threshold: parseInt(localStorage.getItem('voice_threshold') || '30', 10),
    silenceDuration: parseInt(localStorage.getItem('silence_duration') || '3000', 10), // Увеличено до 3 секунд по умолчанию
  });

  // Получение задержки объединения фрагментов из localStorage
  const getMergeDelay = () => {
    return parseInt(localStorage.getItem('merge_delay') || '2500', 10);
  };

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

        // Start listening for voice activity
        startListening();
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

  // Safe restart helper function
  const safeRestartListening = () => {
    console.log('[VAD:restart] safeRestartListening вызвана', {
      mediaStreamActive: mediaStreamRef.current?.active,
      isRecording: isRecordingRef.current,
      isProcessing: isProcessingRef.current,
      isListening: isListeningRef.current,
      timestamp: new Date().toISOString(),
    });

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
      mediaStreamActive: mediaStreamRef.current?.active,
      timestamp: new Date().toISOString(),
    });

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
    if (!analyserRef.current || !dataArrayRef.current) {
      console.warn('[VAD:checkVoice] Пропуск проверки - нет analyser или dataArray', {
        hasAnalyser: !!analyserRef.current,
        hasDataArray: !!dataArrayRef.current,
      });
      return;
    }

    const { threshold, silenceDuration } = getVoiceSettings();
    const audioLevel = getAudioLevel();

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

    if (!isRecordingRef.current && audioLevel > threshold) {
      // Voice detected - start recording
      console.log('[VAD:checkVoice] Обнаружен голос - начало записи', {
        audioLevel: audioLevel.toFixed(2),
        threshold,
        timestamp: new Date().toISOString(),
      });
      startRecording();
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
    const shouldContinue = isListeningRef.current || isRecordingRef.current;
    
    if (shouldContinue) {
      // Используем requestAnimationFrame для плавной работы
      voiceActivityCheckRef.current = requestAnimationFrame(() => {
        // Используем setTimeout для контроля интервала проверки
        setTimeout(() => {
          // Проверяем, что состояние не изменилось перед следующим вызовом
          // Продолжаем проверку во время прослушивания или записи
          if (isListeningRef.current || isRecordingRef.current) {
            checkVoiceActivity();
          } else {
            console.log('[VAD:checkVoice] Состояние изменилось, цикл остановлен', {
              isListening: isListeningRef.current,
              isRecording: isRecordingRef.current,
              timestamp: new Date().toISOString(),
            });
          }
        }, CHECK_INTERVAL);
      });
    } else {
      // Если прослушивание не активно, но обработка идет - перезапускаем прослушивание
      // чтобы не пропустить речь пользователя во время обработки
      if (isProcessingRef.current && !isListeningRef.current) {
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

    recorderRef.current.stop();
    setIsRecording(false);
    isRecordingRef.current = false; // Синхронное обновление ref
    setIsListening(false);
    isListeningRef.current = false; // Синхронное обновление ref

    console.log('[VAD:stopAndProcess] Запись остановлена, состояния обновлены', {
      isRecording: isRecordingRef.current,
      isListening: isListeningRef.current,
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
  };

  // Force translation of current recording
  const handleForceTranslate = () => {
    if (isRecording && recorderRef.current && recorderRef.current.state === 'recording') {
      stopAndProcess();
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
        let messageUpdated = false;
        
        setMessages((prev) => {
          if (prev.length === 0) {
            // Если сообщений нет, создаем новое
            messageId = Date.now();
            console.log('[MERGE:message] Создание первого сообщения (буфер был пуст)', {
              messageId,
              text: finalText,
              timestamp: new Date().toISOString(),
            });
            return [...prev, {
              id: messageId,
              original: finalText,
              translated: null,
              timestamp: new Date(),
            }];
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
            messageUpdated = true;
            
            console.log('[MERGE:message] ✓ Обновление последнего сообщения', {
              messageId: lastMessage.id,
              oldText: lastMessage.original,
              newText: finalText,
              lastMessageAge: `${lastMessageAge}ms`,
              timestamp: new Date().toISOString(),
            });
            
            // Обновляем последнее сообщение объединенным текстом
            return prev.map((msg, index) => 
              index === prev.length - 1
                ? { ...msg, original: finalText }
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
            
            return [...prev, {
              id: messageId,
              original: finalText,
              translated: null,
              timestamp: new Date(),
            }];
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, translated: translatedText }
            : msg
        )
      );
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
    const message = messages.find((msg) => msg.id === messageId);
    setDeleteToast({
      messageId,
      text: 'Сообщение будет удалено',
    });
  };

  const handleCancelDelete = () => {
    setDeleteToast(null);
  };

  const handleCompleteDelete = () => {
    if (deleteToast) {
      setMessages((prev) => prev.filter((msg) => msg.id !== deleteToast.messageId));
      setDeleteToast(null);
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

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                Переводчик речи EN → RU
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Распознавание речи и перевод в реальном времени
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleReset}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label="Очистить все сообщения"
                disabled={messages.length === 0}
              >
                Очистить
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 sm:px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-xs sm:text-sm"
                aria-label="Открыть настройки"
              >
                <span className="sm:hidden">⚙️</span>
                <span className="hidden sm:inline">⚙️ Настройки</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-1 sm:p-2 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <MessageFeed messages={messages} onDeleteMessage={handleDeleteMessage} />
          </div>
          
          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-xs sm:text-sm" role="status" aria-live="polite">
            <div className="flex items-center space-x-2">
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true"></div>
                  <span className="text-gray-600">Запись...</span>
                </>
              ) : isListening ? (
                <>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" aria-hidden="true"></div>
                  <span className="text-gray-600">Ожидание речи...</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-gray-400 rounded-full" aria-hidden="true"></div>
                  <span className="text-gray-400">Остановлено</span>
                </>
              )}
            </div>
            {isProcessing && (
              <span className="text-blue-600 flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" aria-hidden="true"></span>
                Обработка...
              </span>
            )}
            {isRecording && (
              <button
                onClick={handleForceTranslate}
                className="px-3 sm:px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-xs sm:text-sm font-medium"
                aria-label="Принудительно перевести текущую фразу"
              >
                Перевести сейчас
              </button>
            )}
            {error && (
              <div className="flex-1 min-w-0">
                <span 
                  className="text-red-600 bg-red-50 px-2 py-1 rounded inline-block max-w-full break-words"
                  role="alert"
                >
                  {error}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Delete confirmation toast */}
      {deleteToast && (
        <Toast
          message={deleteToast}
          onCancel={handleCancelDelete}
          onComplete={handleCompleteDelete}
          duration={4000}
        />
      )}
    </div>
  );
}

export default Translator;
