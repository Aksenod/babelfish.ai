import { forwardRef } from 'react';

const GlassCard = forwardRef(({
  variant = 'thick',
  rounded = 'xl',
  children,
  className = '',
  hover = false,
  ...props
}, ref) => {
  // Variant classes
  const variantClasses = {
    thick: 'ui-glass-panel-thick',
    thin: 'ui-glass-panel-thin',
    active: 'ui-glass-active',
  };

  // Rounded classes
  const roundedClasses = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  };

  const hoverClasses = hover
    ? 'transition-all hover:scale-[1.005] hover:shadow-lg'
    : '';

  const classes = `${variantClasses[variant]} ${roundedClasses[rounded]} ${hoverClasses} ${className}`.trim();

  return (
    <div
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;