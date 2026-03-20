import { cn } from '../../lib/cn';

const VARIANT_CLASSES = {
  primary:
    'bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover focus-visible:ring-brand-primary',
  secondary:
    'border border-ui-light-slate bg-ui-surface-subtle text-ui-dark-navy shadow-sm hover:bg-ui-surface focus-visible:ring-brand-primary',
  ghost: 'text-ui-slate hover:bg-ui-surface-subtle focus-visible:ring-brand-primary',
  danger:
    'bg-status-error text-white shadow-sm hover:opacity-90 focus-visible:ring-status-error',
  icon: 'h-[42px] w-[42px] border border-ui-light-slate bg-ui-surface-subtle p-0 text-ui-dark-navy shadow-sm hover:bg-ui-surface',
};

const SIZE_CLASSES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-[42px] px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

const Button = ({
  as: Component = 'button',
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) => {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const componentProps = Component === 'button' ? { type } : {};

  return (
    <Component
      className={cn(BASE_CLASSES, variantClass, sizeClass, className)}
      {...componentProps}
      {...props}
    />
  );
};

export default Button;
