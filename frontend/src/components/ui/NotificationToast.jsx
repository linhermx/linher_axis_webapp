import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const VARIANT_MAP = {
  info: { Icon: Info, className: 'ui-toast--info', role: 'status' },
  success: { Icon: CheckCircle2, className: 'ui-toast--success', role: 'status' },
  warning: { Icon: TriangleAlert, className: 'ui-toast--warning', role: 'alert' },
  error: { Icon: AlertCircle, className: 'ui-toast--error', role: 'alert' },
};

const NotificationToast = ({
  open,
  title,
  message,
  variant = 'info',
  duration = 4500,
  onClose,
  className,
  containerClassName,
}) => {
  const config = VARIANT_MAP[variant] || VARIANT_MAP.info;
  const { Icon } = config;

  useEffect(() => {
    if (!open || !onClose || duration <= 0) return undefined;

    const timer = window.setTimeout(() => onClose(), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose, open]);

  if (!open) return null;

  return (
    <div className={cn('ui-toast-container', containerClassName)}>
      <div role={config.role} className={cn('ui-toast', config.className, className)}>
        <Icon size={18} />

        <div className="ui-toast__body">
          {title ? <p className="ui-toast__title">{title}</p> : null}
          {message ? <p className="ui-toast__message">{message}</p> : null}
        </div>

        <Button
          type="button"
          variant="icon"
          size="sm"
          onClick={() => onClose?.()}
          aria-label="Cerrar notificacion"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
};

export default NotificationToast;
