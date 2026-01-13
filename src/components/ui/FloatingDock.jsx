import StatusIndicator from './StatusIndicator';

const FloatingDock = ({
  status,
  children,
  className = '',
}) => {
  // Map status info to StatusIndicator props
  const getStatusProps = () => {
    if (!status) return { status: 'paused', pulse: false, glow: false };
    
    // Map status text to status type
    const statusMap = {
      'PAUSED': 'paused',
      'RECORDING': 'recording',
      'LISTENING': 'listening',
      'ACTIVE': 'active',
    };

    const statusType = statusMap[status.text] || 'active';
    const isActive = statusType !== 'paused';
    
    return {
      status: statusType,
      pulse: isActive,
      glow: !!status.glow,
    };
  };

  const statusProps = getStatusProps();

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className={`pointer-events-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl px-3 py-2.5 rounded-full flex items-center gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-2 ring-slate-700/50 border border-slate-600/30 w-auto max-w-[calc(100vw-2rem)] justify-between transform transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${className}`}>
        {/* Status Pill */}
        {status && (
          <div className="pl-4 pr-4 flex items-center gap-2.5">
            <StatusIndicator {...statusProps} size="md" />
            <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
              {status.text}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingDock;