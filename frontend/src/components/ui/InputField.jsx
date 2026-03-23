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

  return (
    <div className={cn('ui-field', containerClassName)}>
      {label ? (
        <label
          htmlFor={fieldId}
          className={cn(srOnlyLabel ? 'ui-visually-hidden' : 'ui-field__label', labelClassName)}
        >
          {label}
          {required ? <span className="ui-field__required">*</span> : null}
        </label>
      ) : null}

      <div className="ui-field__control">
        {leftIcon ? <span className="ui-field__icon">{leftIcon}</span> : null}

        <input
          id={fieldId}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          className={cn(
            'ui-input',
            variant === 'toolbar' && 'ui-input--toolbar',
            leftIcon && 'ui-input--with-icon',
            error && 'ui-input--error',
            inputClassName
          )}
          required={required}
          {...props}
        />
      </div>

      {hasDescription ? (
        <p
          id={descriptionId}
          className={cn('ui-field__hint', error ? 'ui-field__hint--error' : '')}
        >
          {error || helperText}
        </p>
      ) : null}
    </div>
  );
};

export default InputField;
