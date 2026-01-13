const StatusIndicator = ({
  status = 'active',
  size = 'md',
  pulse = false,
  glow = false,
  className = '',
}) => {
  // Status color mappings
  const statusColors = {
    active: 'bg-emerald-500',
    recording: 'bg-red-500',
    listening: 'bg-yellow-500',
    paused: 'bg-gray-400',
  };

  // Status glow mappings
  const statusGlows = {
    active: 'shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    recording: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]',
    listening: 'shadow-[0_0_8px_rgba(234,179,8,0.8)]',
    paused: '',
  };

  // Size mappings
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  const colorClass = statusColors[status] || statusColors.active;
  const glowClass = glow ? (statusGlows[status] || '') : '';
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const classes = `rounded-full ${colorClass} ${glowClass} ${sizeClass} ${className}`.trim();

  if (pulse) {
    return (
      <div className="relative">
        <div className={classes}></div>
        <div className={`absolute inset-0 rounded-full ${colorClass} animate-ping opacity-60`}></div>
      </div>
    );
  }

  return <div className={classes}></div>;
};

export default StatusIndicator;