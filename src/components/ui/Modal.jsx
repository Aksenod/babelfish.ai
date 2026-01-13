import { useEffect, useRef } from 'react';
import GlassCard from './GlassCard';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
}) => {
  const modalRef = useRef(null);

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleTab = (e) => {
      if (!modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Size mappings
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
      <GlassCard
        variant="thick"
        rounded="xl"
        className={`${sizeClasses[size]} w-full mx-4 p-6 ${className}`}
      >
        {(title || showCloseButton) && (
          <div className="flex justify-between items-center mb-4">
            {title && (
              <h2 id="modal-title" className="text-2xl font-bold text-slate-800">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
                aria-label="Закрыть"
              >
                ×
              </button>
            )}
          </div>
        )}
        {children}
      </GlassCard>
      </div>
    </div>
  );
};

export default Modal;