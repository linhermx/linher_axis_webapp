import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const SIZE_CLASSES = {
  sm: 'ui-modal--sm',
  md: 'ui-modal--md',
  lg: 'ui-modal--lg',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container) => {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true'
  );
};

const ModalShell = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  className,
  initialFocusRef,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveRef.current = document.activeElement;

    const setInitialFocus = () => {
      const target =
        initialFocusRef?.current ||
        getFocusableElements(dialogRef.current)[0] ||
        dialogRef.current;

      target?.focus();
    };

    const timer = window.setTimeout(setInitialFocus, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveRef.current?.focus?.();
    };
  }, [initialFocusRef, isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn('ui-modal', SIZE_CLASSES[size] || SIZE_CLASSES.md, className)}
      >
        <header className="ui-modal__header">
          <div>
            {title ? <h2 id={titleId} className="ui-modal__title">{title}</h2> : null}
            {description ? <p id={descriptionId} className="ui-modal__description">{description}</p> : null}
          </div>

          <Button
            type="button"
            variant="icon"
            onClick={() => onClose?.()}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </Button>
        </header>

        <div className="ui-modal__body">{children}</div>

        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;
