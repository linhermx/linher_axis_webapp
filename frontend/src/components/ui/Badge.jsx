import { cn } from '../../lib/cn';

const VARIANT_CLASSES = {
  neutral: 'bg-ui-background text-ui-slate',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
};

const Badge = ({ className, variant = 'neutral', children, ...props }) => {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
