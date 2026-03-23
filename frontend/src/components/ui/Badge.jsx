import { cn } from '../../lib/cn';

const VARIANT_CLASSES = {
  neutral: 'ui-badge--neutral',
  success: 'ui-badge--success',
  warning: 'ui-badge--warning',
  danger: 'ui-badge--danger',
  info: 'ui-badge--info',
};

const Badge = ({ className, variant = 'neutral', children, ...props }) => {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;

  return (
    <span className={cn('ui-badge', variantClass, className)} {...props}>
      {children}
    </span>
  );
};

export default Badge;
