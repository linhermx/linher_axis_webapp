import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const alignClasses = {
  left: 'left-0',
  right: 'right-0',
};

const CustomMenu = ({
  label = 'Acciones',
  items = [],
  align = 'right',
  triggerClassName,
  menuClassName,
  className,
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();
  const buttonId = useId();

  const setMenuOpen = useCallback((nextValue) => {
    setOpen(nextValue);
    onOpenChange?.(nextValue);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setMenuOpen]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <Button
        id={buttonId}
        type="button"
        variant="secondary"
        className={cn('min-w-[120px] justify-between', triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setMenuOpen(!open)}
      >
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={cn('transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className={cn(
            'absolute top-[calc(100%+8px)] z-50 min-w-[200px] overflow-hidden rounded-md border border-ui-light-slate bg-ui-surface py-1 shadow-md',
            alignClasses[align] || alignClasses.right,
            menuClassName
          )}
        >
          {items.map((item) => (
            <button
              key={item.id || item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ui-text-main transition-colors hover:bg-ui-background',
                item.disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent'
              )}
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                setMenuOpen(false);
              }}
            >
              {item.icon ? <span className="text-ui-text-secondary">{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default CustomMenu;
