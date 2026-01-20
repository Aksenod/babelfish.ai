import { forwardRef } from 'react';

const Button = forwardRef(({
  variant = 'floating',
  color = 'blue',
  size = 'md',
  icon,
  children,
  className = '',
  disabled = false,
  ...props
}, ref) => {
  // Size mappings for text buttons (without fixed width)
  const textSizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  };
  
  // Size mappings for icon buttons (with fixed width)
  const iconSizeClasses = {
    sm: 'h-8 w-8 px-3 text-xs',
    md: 'h-10 w-10 px-5 text-sm',
    lg: 'h-12 w-12 px-6 text-base',
  };

  // Color mappings for floating variant
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400/50 shadow-lg hover:shadow-blue-500/30',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400/50 shadow-lg hover:shadow-amber-500/30',
    slate: 'bg-slate-700/80 hover:bg-slate-600 text-white border-slate-500/50 shadow-md',
    red: 'bg-red-500 hover:bg-red-600 text-white border-red-400/50 shadow-lg hover:shadow-red-500/30',
    purple: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-400/50 shadow-lg hover:shadow-purple-500/30',
    gray: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200',
  };

  // Variant-specific classes
  const variantClasses = {
    pill: `ui-glass-panel-thick rounded-full text-slate-800 hover:text-slate-900 transition-all hover:scale-[1.02] active:scale-95 group flex items-center justify-center ${textSizeClasses[size]}`,
    floating: `rounded-full ${colorClasses[color]} transition-all duration-200 ease-out active:scale-95 flex items-center gap-2 font-semibold ${textSizeClasses[size]}`,
    icon: `rounded-full ${colorClasses[color]} transition-all duration-200 ease-out active:scale-95 flex items-center justify-center ${iconSizeClasses[size]}`,
  };

  const baseClasses = 'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';
  const classes = `${variantClasses[variant]} ${baseClasses} ${className}`.trim();

  if (variant === 'pill') {
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled}
        {...props}
      >
        {icon && <div className="flex items-center justify-center">{icon}</div>}
        {children && (
          <span className="text-sm font-bold tracking-wide uppercase opacity-80 group-hover:opacity-100">
            {children}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled}
        {...props}
      >
        {icon}
      </button>
    );
  }

  // Floating variant (default)
  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children && (
        <span className="text-sm font-bold uppercase tracking-wide">
          {children}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;