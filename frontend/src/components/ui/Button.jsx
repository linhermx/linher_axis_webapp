import { cn } from '../../lib/cn';

const VARIANT_CLASSES = {
  primary: 'ui-button--primary',
  secondary: 'ui-button--secondary',
  ghost: 'ui-button--ghost',
  danger: 'ui-button--danger',
  icon: 'ui-button--icon',
};

const SIZE_CLASSES = {
  sm: 'ui-button--sm',
  md: 'ui-button--md',
  lg: 'ui-button--lg',
};

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
      className={cn('ui-button', variantClass, sizeClass, className)}
      {...componentProps}
      {...props}
    />
  );
};

export default Button;
