import { forwardRef } from 'react';

const Select = forwardRef(({
  variant = 'glass',
  children,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'w-full px-3 py-2 focus:outline-none transition-all';
  
  const variantClasses = {
    glass: 'ui-glass-panel-thin rounded-xl border border-white/40 text-sm text-slate-800 bg-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
    default: 'border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

  return (
    <select
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export default Select;