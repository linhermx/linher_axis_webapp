import { useId } from 'react';
import { cn } from '../../lib/cn';

const InputField = ({
  id,
  name,
  label,
  srOnlyLabel = false,
  variant = 'default',
  containerClassName,
  labelClassName,
  inputClassName,
  leftIcon,
  error,
  helperText,
  required = false,
  ...props
}) => {
  const generatedId = useId();
  const fieldId = id || name || generatedId;
  const hasDescription = Boolean(error || helperText);
  const descriptionId = hasDescription ? `${fieldId}-description` : undefined;
  const variantClassName = variant === 'toolbar' ? 'bg-ui-surface' : 'bg-ui-background';

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label
          htmlFor={fieldId}
          className={cn(
            'form-label',
            srOnlyLabel && 'sr-only',
            labelClassName
          )}
        >
          {label}
          {required && <span className="ml-1 text-status-error">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-ui-text-secondary">
            {leftIcon}
          </span>
        )}

        <input
          id={fieldId}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          className={cn(
            'form-field w-full',
            variantClassName,
            leftIcon && 'pl-10',
            error && 'border-status-error',
            inputClassName
          )}
          required={required}
          {...props}
        />
      </div>

      {hasDescription && (
        <p
          id={descriptionId}
          className={cn(
            'text-xs',
            error ? 'text-status-error' : 'text-ui-text-secondary'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default InputField;
