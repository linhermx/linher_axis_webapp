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
    <div className={cn('ui-field', containerClassName)}>
      {label ? (
        <label htmlFor={selectId} className={cn(srOnlyLabel ? 'ui-visually-hidden' : 'ui-field__label')}>
          {label}
          {required ? <span className="ui-field__required">*</span> : null}
        </label>
      ) : null}

      <div className="ui-select-wrap">
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
            'ui-select',
            disabled && 'is-disabled',
            error && 'ui-select--error',
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
              <option key={normalized.value} value={normalized.value} disabled={normalized.disabled}>
                {normalized.label}
              </option>
            );
          })}
        </select>

        <span className="ui-select__arrow">
          <ChevronDown size={16} />
        </span>
      </div>

      {error || helperText ? (
        <p id={descriptionId} className={cn('ui-field__hint', error ? 'ui-field__hint--error' : '')}>
          {error || helperText}
        </p>
      ) : null}
    </div>
  );
};

export default CustomSelect;
