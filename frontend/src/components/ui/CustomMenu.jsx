import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const alignClasses = {
  left: 'ui-menu__panel--left',
  right: 'ui-menu__panel--right',
};

const CustomMenu = ({
  label = 'Acciones',
  ariaLabel = '',
  items = [],
  align = 'right',
  iconOnly = false,
  showChevron = true,
  triggerVariant = 'secondary',
  triggerIcon = null,
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
    <div ref={containerRef} className={cn('ui-menu', className)}>
      <Button
        id={buttonId}
        type="button"
        variant={triggerVariant}
        className={cn(triggerClassName)}
        aria-label={ariaLabel || (iconOnly ? label : undefined)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setMenuOpen(!open)}
      >
        {triggerIcon ? <span aria-hidden="true">{triggerIcon}</span> : null}
        {!iconOnly ? <span>{label}</span> : null}
        {showChevron ? <ChevronDown size={16} aria-hidden="true" /> : null}
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className={cn('ui-menu__panel', alignClasses[align] || alignClasses.right, menuClassName)}
        >
          {items.map((item) => (
            <button
              key={item.id || item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className="ui-menu__item"
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                setMenuOpen(false);
              }}
            >
              {item.icon ? <span>{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default CustomMenu;
