import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

const normalizeOption = (option) => {
  if (typeof option === 'string' || typeof option === 'number') {
    return { value: String(option), label: String(option) };
  }

  return {
    value: String(option.value),
    label: option.label,
    disabled: Boolean(option.disabled),
  };
};

const CustomSelect = ({
  id,
  name,
  label,
  srOnlyLabel = false,
  ariaLabel,
  options = [],
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  className,
  containerClassName,
}) => {
  const generatedId = useId();
  const selectId = id || name || generatedId;
  const descriptionId = error || helperText ? `${selectId}-description` : undefined;
  const resolvedAriaLabel = label ? undefined : ariaLabel || name || 'Selector';

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label ? (
        <label
          htmlFor={selectId}
          className={cn(srOnlyLabel ? 'sr-only' : 'form-label')}
        >
          {label}
          {required ? <span className="ml-1 text-status-error">*</span> : null}
        </label>
      ) : null}

      <div className="form-select-container">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-label={resolvedAriaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          className={cn(
            'form-field pr-10',
            disabled && 'cursor-not-allowed opacity-70',
            error && 'border-status-error',
            className
          )}
        >
          {placeholder ? (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          ) : null}

          {options.map((option) => {
            const normalized = normalizeOption(option);
            return (
              <option
                key={normalized.value}
                value={normalized.value}
                disabled={normalized.disabled}
              >
                {normalized.label}
              </option>
            );
          })}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-ui-text-secondary">
          <ChevronDown size={16} />
        </span>
      </div>

      {error || helperText ? (
        <p
          id={descriptionId}
          className={cn('text-xs', error ? 'text-status-error' : 'text-ui-text-secondary')}
        >
          {error || helperText}
        </p>
      ) : null}
    </div>
  );
};

export default CustomSelect;
