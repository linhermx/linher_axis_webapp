import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container) => {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true'
  );
};

const DrawerShell = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  className,
  initialFocusRef,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const drawerRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveRef.current = document.activeElement;
    document.body.classList.add('ui-drawer-open');

    const setInitialFocus = () => {
      const target =
        initialFocusRef?.current
        || getFocusableElements(drawerRef.current)[0]
        || drawerRef.current;
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

      const focusableElements = getFocusableElements(drawerRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        drawerRef.current?.focus();
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
      document.body.classList.remove('ui-drawer-open');
      previousActiveRef.current?.focus?.();
    };
  }, [initialFocusRef, isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="ui-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn('ui-drawer', className)}
      >
        <header className="ui-drawer__header">
          <div>
            {title ? <h2 id={titleId} className="ui-drawer__title">{title}</h2> : null}
            {description ? <p id={descriptionId} className="ui-drawer__description">{description}</p> : null}
          </div>

          <Button
            type="button"
            variant="icon"
            aria-label="Cerrar panel"
            onClick={() => onClose?.()}
          >
            <X size={18} />
          </Button>
        </header>

        <div className="ui-drawer__body">{children}</div>

        {footer ? <footer className="ui-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body
  );
};

export default DrawerShell;
