/**
 * Хук для Voice Activity Detection (VAD)
 * Инкапсулирует логику обнаружения голоса, начала/остановки записи и прослушивания
 */

import { useRef, useCallback } from 'react';
import { getVoiceSettings, getMaxRecordingDuration } from '../utils/settings';

// Интервал проверки активности голоса в мс
const CHECK_INTERVAL = 100;
const RECORDING_SLICE_MS = 1000;

/**
 * Хук для работы с Voice Activity Detection
 * @param {Object} refs - Refs для работы с аудио
 * @param {Object} refs.analyserRef - Ref для analyser
 * @param {Object} refs.dataArrayRef - Ref для dataArray
 * @param {Object} refs.audioContextRef - Ref для audioContext
 * @param {Object} refs.recorderRef - Ref для recorder
 * @param {Object} refs.mediaStreamRef - Ref для mediaStream
 * @param {Object} refs.audioChunksRef - Ref для audioChunks
 * @param {Object} refs.isRecordingRef - Ref для состояния записи
 * @param {Object} refs.isListeningRef - Ref для состояния прослушивания
 * @param {Object} refs.isProcessingRef - Ref для состояния обработки
 * @param {Object} refs.isSessionActiveRef - Ref для состояния активности сессии
 * @param {Object} refs.voiceActivityCheckRef - Ref для requestAnimationFrame
 * @param {Object} refs.silenceTimerRef - Ref для таймера тишины
 * @param {Object} refs.recordingStartTimeRef - Ref для времени начала записи
 * @param {Object} refs.recentAudioLevelsRef - Ref для истории уровней аудио
 * @param {Function} setIsListening - Функция установки состояния прослушивания
 * @param {Function} setIsRecording - Функция установки состояния записи
 * @param {Function} stopAndProcess - Функция остановки и обработки записи
 * @returns {Object} Объект с функциями VAD
 */
export const useVoiceActivityDetection = (
  refs,
  setIsListening,
  setIsRecording,
  stopAndProcess
) => {
  const {
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
  } = refs;

  /**
   * Вычисляет уровень аудио из данных analyser
   * @returns {number} Средний уровень аудио (0-255)
   */
  const getAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return 0;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    return sum / dataArrayRef.current.length;
  }, [analyserRef, dataArrayRef]);

  /**
   * Проверка частотных характеристик для определения речи
   * @returns {boolean} true, если сигнал похож на речь
   */
  const isVoiceLike = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !audioContextRef.current) return false;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    const { voiceFreqMin, voiceFreqMax, voiceEnergyRatio } = getVoiceSettings();
    
    // Получаем частотное разрешение
    const sampleRate = audioContextRef.current.sampleRate || 44100;
    const fftSize = analyserRef.current.fftSize;
    const frequencyResolution = sampleRate / fftSize;
    
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
  }, [analyserRef, dataArrayRef, audioContextRef]);

  /**
   * Проверка стабильности сигнала (речь более стабильна, чем щелчки)
   * @returns {boolean} true, если сигнал стабильный
   */
  const isStableSignal = useCallback(() => {
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
  }, [recentAudioLevelsRef]);

  /**
   * Безопасный перезапуск прослушивания
   * @returns {boolean} true, если перезапуск успешен
   */
  const safeRestartListening = useCallback(() => {
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
  }, [mediaStreamRef, isRecordingRef, isProcessingRef, isListeningRef, isSessionActiveRef, voiceActivityCheckRef]);

  /**
   * Начало прослушивания для обнаружения голоса
   */
  const startListening = useCallback(() => {
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
  }, [isSessionActiveRef, isRecordingRef, setIsListening, isListeningRef, voiceActivityCheckRef]);

  /**
   * Начало записи при обнаружении голоса
   */
  const startRecording = useCallback(() => {
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
    
    // Сбрасываем флаги для новой записи
    if (refs.isFirstChunkRef) {
      refs.isFirstChunkRef.current = true;
    }
    if (refs.lastProcessedChunkIndexRef) {
      refs.lastProcessedChunkIndexRef.current = 0;
    }
    if (refs.periodicProcessingTimerRef && refs.periodicProcessingTimerRef.current) {
      clearInterval(refs.periodicProcessingTimerRef.current);
      refs.periodicProcessingTimerRef.current = null;
    }
    // НЕ сбрасываем sentenceBufferRef - предложения должны накапливаться между записями
    // Буфер будет сброшен только при создании карточки или при финализации
    
    recorderRef.current.start(RECORDING_SLICE_MS);
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
  }, [recorderRef, audioChunksRef, recordingStartTimeRef, setIsRecording, isRecordingRef, setIsListening, isListeningRef, silenceTimerRef, refs]);

  /**
   * Проверка активности голоса (рекурсивная функция)
   */
  const checkVoiceActivity = useCallback(() => {
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

    const { threshold, silenceDuration, stabilityCheckSamples } = getVoiceSettings();
    const audioLevel = getAudioLevel();
    
    // Обновляем историю уровней для проверки стабильности
    recentAudioLevelsRef.current.push(audioLevel);
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

      // Проверяем максимальную длительность непрерывной записи,
      // чтобы автоматически резать длинную речь на части даже без тишины.
      if (recordingStartTimeRef.current) {
        const maxRecordingDuration = getMaxRecordingDuration();
        const recordingDuration = Date.now() - recordingStartTimeRef.current;

        if (recordingDuration >= maxRecordingDuration) {
          console.log('[VAD:checkVoice] Максимальная длительность записи достигнута - остановка записи', {
            recordingDuration,
            maxRecordingDuration,
            timestamp: new Date().toISOString(),
          });
          stopAndProcess();
          // Дальше проверку не продолжаем, пока не завершится обработка
          return;
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
  }, [
    isSessionActiveRef,
    analyserRef,
    dataArrayRef,
    getAudioLevel,
    recentAudioLevelsRef,
    isRecordingRef,
    isListeningRef,
    isProcessingRef,
    silenceTimerRef,
    recordingStartTimeRef,
    stopAndProcess,
    isVoiceLike,
    isStableSignal,
    startRecording,
    voiceActivityCheckRef,
    startListening,
  ]);

  return {
    getAudioLevel,
    isVoiceLike,
    isStableSignal,
    safeRestartListening,
    startListening,
    checkVoiceActivity,
    startRecording,
  };
};
