import { useEffect, useState } from 'react';

export default function Toast({ message, onCancel, onComplete, duration = 4000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration / 1000);

  useEffect(() => {
    // Анимация появления
    setIsVisible(true);

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
        onComplete();
      }, 300); // Ждем завершения анимации исчезновения
    }, duration);

    return () => {
      clearTimeout(deleteTimer);
      clearInterval(countdownInterval);
    };
  }, [duration, onComplete]);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 300); // Ждем завершения анимации исчезновения
  };

  if (!message) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-4 min-w-[280px] max-w-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-800 font-medium">
              {message.text || 'Сообщение будет удалено'}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${(timeLeft / (duration / 1000)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {Math.ceil(timeLeft)}с
              </span>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
            aria-label="Отменить удаление"
          >
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
}
