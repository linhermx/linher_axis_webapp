import { useId } from 'react';
import { cn } from '../../lib/cn';

const InputField = ({
  id,
  name,
  label,
  srOnlyLabel = false,
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

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label
          htmlFor={fieldId}
          className={cn(
            'block text-sm font-semibold text-ui-text-main',
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
            'h-11 w-full rounded-md border border-ui-light-slate bg-ui-background px-3 text-sm text-ui-text-main outline-none transition-colors placeholder:text-ui-text-secondary focus:border-brand-primary focus:bg-ui-surface focus:ring-2 focus:ring-brand-primary',
            leftIcon && 'pl-10',
            error &&
              'border-status-error bg-red-50 focus:border-status-error focus:ring-status-error',
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
