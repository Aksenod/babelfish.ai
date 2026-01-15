import { useEffect, useState, useRef } from 'react';
import GlassCard from './ui/GlassCard';
import Button from './ui/Button';

export default function Toast({ message, onCancel, onComplete, duration = 3000, topOffset = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration / 1000);
  
  // Используем ref для хранения актуальных функций, чтобы не перезапускать таймер при их изменении
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  
  // Обновляем ref при изменении пропсов, но не перезапускаем таймер
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCancelRef.current = onCancel;
  }, [onComplete, onCancel]);

  useEffect(() => {
    // Анимация появления
    setIsVisible(true);
    
    // Инициализируем время заново при монтировании
    setTimeLeft(duration / 1000);

    // Таймер обратного отсчета
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    // Таймер для автоматического удаления
    const deleteTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onCompleteRef.current();
      }, 300); // Ждем завершения анимации исчезновения
    }, duration);

    return () => {
      clearTimeout(deleteTimer);
      clearInterval(countdownInterval);
    };
    // Зависимости только от duration, чтобы таймер запускался только при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancelRef.current();
    }, 300); // Ждем завершения анимации исчезновения
  };

  if (!message) return null;

  return (
    <div
      className={`fixed left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      style={{ top: `${16 + topOffset}px` }}
      role="alert"
      aria-live="assertive"
    >
      <GlassCard variant="thick" rounded="xl" className="p-4 min-w-[280px] max-w-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-slate-800 font-medium">
              {message.text || 'Сообщение будет удалено'}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-200/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-100 rounded-full"
                  style={{ width: `${(timeLeft / (duration / 1000)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {Math.ceil(timeLeft)}с
              </span>
            </div>
          </div>
          <Button
            variant="floating"
            color="blue"
            size="sm"
            onClick={handleCancel}
            className="whitespace-nowrap !w-auto"
            aria-label="Отменить удаление"
          >
            Отменить
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
