/**
 * Сервис для обработки аудио
 * Инкапсулирует логику транскрибации, фильтрации и перевода аудио
 */

import { transcribeAudio, translateText } from '../utils/api';
import {
  getApiKeys,
  getTranslationModel,
  getFilterMeaninglessText,
  getFilterMeaninglessOptions,
  getSentenceDisplaySettings,
} from '../utils/settings';
import { isMeaningfulText } from '../utils/utils';
import { generateMessageId } from '../utils/messageIdGenerator';
import { addMessageToSession, updateMessageInSession } from '../utils/sessionManager';
import { extractCompleteSentences, dedupeSentences } from './textStreamService';

const WHISPER_SAMPLE_RATE = 16000;

/**
 * Создает сообщение и переводит его
 * @param {string} text - Текст для перевода (может содержать несколько предложений)
 * @param {string} translationModel - Модель перевода
 * @param {string} translationApiKey - API ключ для перевода
 * @param {Function} setMessages - Функция обновления сообщений
 * @param {Object} sessionIdRef - Ref с текущим sessionId
 * @returns {Promise<void>}
 */
const createAndTranslateMessage = async (text, translationModel, translationApiKey, setMessages, sessionIdRef) => {
  const messageId = generateMessageId();
  const newMessage = {
    id: messageId,
    original: text,
    translated: null,
    timestamp: new Date(),
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:createAndTranslateMessage',message:'Creating message card',data:{messageId,text,textLength:text.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  setMessages((prev) => {
    const newMessages = [...prev, newMessage];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:createAndTranslateMessage:setMessages',message:'setMessages callback - adding message',data:{messageId,prevCount:prev.length,newCount:newMessages.length,allMessageIds:newMessages.map(m=>m.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return newMessages;
  });

  if (sessionIdRef.current) {
    try {
      addMessageToSession(sessionIdRef.current, newMessage);
    } catch (err) {
      console.error('Error saving message to session:', err);
    }
  }

  console.log('[TRANSLATE:start] Начало перевода', {
    messageId,
    model: translationModel,
    text: text,
    textLength: text.length,
    timestamp: new Date().toISOString(),
  });

  try {
    const translatedText = await translateText(text, translationApiKey, translationModel);
    const updatedMessage = { translated: translatedText };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:createAndTranslateMessage:update',message:'Before update message with translation',data:{messageId,translatedText,translatedLength:translatedText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    setMessages((prev) => {
      const updatedMessages = prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, ...updatedMessage }
          : msg
      );
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:createAndTranslateMessage:update:setMessages',message:'setMessages callback - updating message',data:{messageId,prevCount:prev.length,updatedCount:updatedMessages.length,foundMessage:prev.find(m=>m.id===messageId)?true:false,allMessageIds:updatedMessages.map(m=>m.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return updatedMessages;
    });

    if (sessionIdRef.current) {
      try {
        updateMessageInSession(sessionIdRef.current, messageId, updatedMessage);
      } catch (err) {
        console.error('Error updating message in session:', err);
      }
    }
  } catch (err) {
    console.error('[TRANSLATE:error] Ошибка перевода', err);
  }
};

const decodeAudioToMono = async (audioBlob) => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
  } catch (error) {
    const fallbackContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: WHISPER_SAMPLE_RATE,
    });
    const freshBuffer = arrayBuffer.slice(0);
    const audioBuffer = await fallbackContext.decodeAudioData(freshBuffer);
    await fallbackContext.close();
    return audioBuffer.getChannelData(0);
  } finally {
    await audioContext.close();
  }
};

const transcribeAudioWithWorker = async (audioBlob, worker, language = 'en') => {
  if (!worker) {
    throw new Error('Transcription worker is not available');
  }

  const audio = await decodeAudioToMono(audioBlob);
  if (!audio || audio.length === 0) {
    return '';
  }

  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      if (event.data?.status === 'complete') {
        worker.removeEventListener('message', handleMessage);
        const output = event.data.output?.[0] || '';
        resolve(output);
      }
      if (event.data?.status === 'error') {
        worker.removeEventListener('message', handleMessage);
        reject(new Error(event.data?.message || 'Transcription worker error'));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      type: 'generate',
      data: { audio, language },
    });
  });
};

/**
 * Проверка валидности и энергии аудио перед обработкой
 * @param {Blob} audioBlob - Аудио blob для проверки
 * @returns {Promise<Object>} Результат проверки: { isValid, rms, avgAmplitude, hasEnoughEnergy, duration }
 */
export const checkAudioEnergy = async (audioBlob) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Проверяем, что массив не пустой
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.warn('[VAD:checkAudioEnergy] Пустой аудио буфер');
      await audioContext.close();
      return { isValid: false, hasEnoughEnergy: false, rms: 0, avgAmplitude: 0, duration: 0 };
    }
    
    let audioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      // Пробуем с копией буфера (на случай detached buffer)
      try {
        const freshBuffer = arrayBuffer.slice(0);
        const fallbackContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: WHISPER_SAMPLE_RATE,
        });
        audioBuffer = await fallbackContext.decodeAudioData(freshBuffer);
        await fallbackContext.close();
      } catch (fallbackError) {
        console.warn('[VAD:checkAudioEnergy] Не удалось декодировать аудио:', decodeError.message);
        await audioContext.close();
        return { isValid: false, hasEnoughEnergy: false, rms: 0, avgAmplitude: 0, duration: 0 };
      }
    }
    
    // Получаем данные канала
    const channelData = audioBuffer.getChannelData(0);
    
    // Проверяем, что есть данные
    if (!channelData || channelData.length === 0) {
      console.warn('[VAD:checkAudioEnergy] Нет данных в канале');
      await audioContext.close();
      return { isValid: false, hasEnoughEnergy: false, rms: 0, avgAmplitude: 0, duration: 0 };
    }
    
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
      isValid: true,
      rms,
      avgAmplitude,
      hasEnoughEnergy: rms >= minEnergyThreshold && avgAmplitude >= minAmplitudeThreshold,
      duration: audioBuffer.duration,
    };
  } catch (error) {
    console.warn('[VAD:checkAudioEnergy] Критическая ошибка проверки аудио:', error);
    // В случае критической ошибки помечаем чанк как невалидный
    return { isValid: false, hasEnoughEnergy: false, rms: 0, avgAmplitude: 0, duration: 0 };
  }
};

/**
 * Обрабатывает аудио: транскрибирует, фильтрует, извлекает предложения и переводит
 * @param {Blob} audioBlob - Аудио blob для обработки
 * @param {Object} dependencies - Зависимости для работы функции
 * @param {Function} dependencies.setIsProcessing - Функция установки состояния обработки
 * @param {Object} dependencies.isProcessingRef - Ref для синхронного доступа к состоянию обработки
 * @param {Function} dependencies.setError - Функция установки ошибки
 * @param {Function} dependencies.setMessages - Функция обновления сообщений
 * @param {Object} dependencies.sessionIdRef - Ref с текущим sessionId
 * @param {Object} dependencies.textStreamRef - Ref с буфером текста
 * @param {Object} dependencies.recentSentencesRef - Ref со списком последних предложений
 * @param {Object} dependencies.sentenceBufferRef - Ref с буфером предложений для группировки в карточки
 * @param {string} dependencies.transcriptionSource - Источник распознавания
 * @param {Object} dependencies.transcriptionWorkerRef - Ref на transcription worker
 * @param {Function} dependencies.safeRestartListening - Функция безопасного перезапуска прослушивания
 * @param {Object} dependencies.isListeningRef - Ref для синхронного доступа к состоянию прослушивания
 * @param {Object} dependencies.isRecordingRef - Ref для синхронного доступа к состоянию записи
 * @returns {Promise<void>}
 */
export const processAudio = async (audioBlob, dependencies) => {
  const {
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
  } = dependencies;

  const processStartTime = Date.now();
  
  console.log('[VAD:processAudio] Начало обработки аудио', {
    blobSize: audioBlob.size,
    blobSizeKB: (audioBlob.size / 1024).toFixed(2),
    isProcessingRef: isProcessingRef.current,
    isRecording: isRecordingRef.current,
    isListening: isListeningRef.current,
    timestamp: new Date().toISOString(),
  });

  // Проверяем валидность и энергию аудио перед обработкой
  const energyCheck = await checkAudioEnergy(audioBlob);
  console.log('[VAD:processAudio] Проверка валидности и энергии аудио', {
    isValid: energyCheck.isValid,
    rms: energyCheck.rms.toFixed(4),
    avgAmplitude: energyCheck.avgAmplitude.toFixed(4),
    hasEnoughEnergy: energyCheck.hasEnoughEnergy,
    duration: energyCheck.duration.toFixed(2),
    timestamp: new Date().toISOString(),
  });
  
  // Если чанк невалидный (не может быть декодирован), пропускаем обработку
  if (!energyCheck.isValid) {
    console.log('[FILTER:invalid] Аудио чанк невалидный (не может быть декодирован), пропускаем обработку', {
      blobSize: audioBlob.size,
      blobSizeKB: (audioBlob.size / 1024).toFixed(2),
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

    if (transcriptionSource !== 'local_worker' && !openai) {
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
      transcriptionSource,
      textStreamLength: textStreamRef.current?.length || 0,
      timestamp: new Date().toISOString(),
    });
    const transcribedText = transcriptionSource === 'local_worker'
      ? await transcribeAudioWithWorker(audioBlob, transcriptionWorkerRef?.current, 'en')
      : await transcribeAudio(audioBlob, openai);
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
      isProcessingRef.current = false;
      
      console.log('[SYNC:state] Состояние перед перезапуском (пустой текст)', {
        isProcessing: isProcessingRef.current,
        isRecording: isRecordingRef.current,
        isListening: isListeningRef.current,
        timestamp: new Date().toISOString(),
      });

      if (!isListeningRef.current && !isRecordingRef.current) {
        setTimeout(() => {
          safeRestartListening();
        }, 100);
      }
      return;
    }

    // Проверка на осмысленность текста (только если фильтр включен)
    const shouldFilterMeaningless = getFilterMeaninglessText();
    if (shouldFilterMeaningless) {
      const filterOptions = getFilterMeaninglessOptions();
      if (!isMeaningfulText(transcribedText, filterOptions)) {
        console.log('[FILTER:meaningless] Текст пропущен как бессмысленный или артефакт', {
          text: transcribedText,
          textLength: transcribedText.length,
          filterEnabled: shouldFilterMeaningless,
          filterOptions,
          timestamp: new Date().toISOString(),
        });

        setIsProcessing(false);
        isProcessingRef.current = false;

        console.log('[SYNC:state] Состояние перед перезапуском (бессмысленный текст)', {
          isProcessing: isProcessingRef.current,
          isRecording: isRecordingRef.current,
          isListening: isListeningRef.current,
          timestamp: new Date().toISOString(),
        });

        if (!isListeningRef.current && !isRecordingRef.current) {
          setTimeout(() => {
            safeRestartListening();
          }, 100);
        }
        return;
      }
    }
    const currentStream = textStreamRef.current?.length
      ? `${textStreamRef.current} ${transcribedText}`.trim()
      : transcribedText.trim();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:342',message:'Before extractCompleteSentences',data:{currentStream,textStreamLength:textStreamRef.current?.length||0,transcribedText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const { sentences, remainder } = extractCompleteSentences(currentStream);
    textStreamRef.current = remainder;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:346',message:'After extractCompleteSentences',data:{sentencesCount:sentences.length,sentences,remainder,remainderLength:remainder.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const uniqueSentences = dedupeSentences(sentences, recentSentencesRef);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:349',message:'After dedupeSentences',data:{uniqueSentencesCount:uniqueSentences.length,uniqueSentences,recentSentences:recentSentencesRef.current||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Получаем настройку количества предложений в карточке
    const { sentencesOnScreen } = getSentenceDisplaySettings();
    const sentencesPerCard = Number.isInteger(sentencesOnScreen) && sentencesOnScreen > 0 ? sentencesOnScreen : 1;

    const translationApiKey = translationModel === 'google' ? google : yandex;

    // Инициализируем буфер, если его нет
    if (!sentenceBufferRef.current) {
      sentenceBufferRef.current = [];
    }

    // Добавляем предложения в буфер
    for (const sentence of uniqueSentences) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:370',message:'Processing sentence for buffer',data:{sentence,sentenceLength:sentence.length,sentencesPerCard,bufferSize:sentenceBufferRef.current.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      if (shouldFilterMeaningless) {
        const filterOptions = getFilterMeaninglessOptions();
        const isMeaningful = isMeaningfulText(sentence, filterOptions);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:374',message:'Meaningful check',data:{sentence,isMeaningful,filterOptions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!isMeaningful) {
          continue;
        }
      }

      // Добавляем предложение в буфер
      sentenceBufferRef.current.push(sentence);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:383',message:'Sentence added to buffer',data:{sentence,bufferSize:sentenceBufferRef.current.length,sentencesPerCard},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Если буфер заполнен, создаем карточку
      if (sentenceBufferRef.current.length >= sentencesPerCard) {
        const sentencesToGroup = sentenceBufferRef.current.splice(0, sentencesPerCard);
        const combinedText = sentencesToGroup.join(' ');

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:390',message:'Creating message card from buffer',data:{sentencesCount:sentencesToGroup.length,combinedText,combinedTextLength:combinedText.length,sentencesPerCard,remainingInBuffer:sentenceBufferRef.current.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        await createAndTranslateMessage(combinedText, translationModel, translationApiKey, setMessages, sessionIdRef);
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'audioProcessingService.js:398',message:'After processing all sentences',data:{bufferSize:sentenceBufferRef.current.length,sentencesPerCard},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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
    isProcessingRef.current = false;
    
    console.log('[SYNC:state] Состояние после setIsProcessing(false)', {
      isProcessing: isProcessingRef.current,
      isRecording: isRecordingRef.current,
      isListening: isListeningRef.current,
      timestamp: new Date().toISOString(),
    });

    if (!isListeningRef.current && !isRecordingRef.current) {
      setTimeout(() => {
        safeRestartListening();
      }, 100);
    }
  }
};

/**
 * Финализирует буфер предложений - создает карточку из оставшихся предложений
 * @param {Object} params - Параметры функции
 * @param {Object} params.sentenceBufferRef - Ref с буфером предложений
 * @param {Function} params.setMessages - Функция обновления сообщений
 * @param {Object} params.sessionIdRef - Ref с текущим sessionId
 * @returns {Promise<void>}
 */
export const finalizeSentenceBuffer = async ({ sentenceBufferRef, setMessages, sessionIdRef }) => {
  if (!sentenceBufferRef.current || sentenceBufferRef.current.length === 0) {
    return;
  }

  const translationModel = getTranslationModel();
  const { openai, yandex, google } = getApiKeys();
  const translationApiKey = translationModel === 'google' ? google : yandex;

  // Создаем карточку из всех оставшихся предложений в буфере
  const sentencesToGroup = sentenceBufferRef.current.splice(0);
  const combinedText = sentencesToGroup.join(' ');

  console.log('[FINALIZE:buffer] Финализация буфера предложений', {
    sentencesCount: sentencesToGroup.length,
    combinedText,
    combinedTextLength: combinedText.length,
    timestamp: new Date().toISOString(),
  });

  await createAndTranslateMessage(combinedText, translationModel, translationApiKey, setMessages, sessionIdRef);
};
