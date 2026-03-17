import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const VARIANT_MAP = {
  info: {
    Icon: Info,
    className: 'border-status-info/35 bg-status-info/10 text-status-info',
    role: 'status',
  },
  success: {
    Icon: CheckCircle2,
    className: 'border-status-success/35 bg-status-success/10 text-status-success',
    role: 'status',
  },
  warning: {
    Icon: TriangleAlert,
    className: 'border-status-warning/35 bg-status-warning/10 text-status-warning',
    role: 'alert',
  },
  error: {
    Icon: AlertCircle,
    className: 'border-status-error/35 bg-status-error/10 text-status-error',
    role: 'alert',
  },
};

const NotificationToast = ({
  open,
  title,
  message,
  variant = 'info',
  duration = 4500,
  onClose,
  className,
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
    <div className="pointer-events-none fixed right-4 top-4 z-[130]">
      <div
        role={config.role}
        className={cn(
          'pointer-events-auto flex min-w-[280px] max-w-[420px] items-start gap-3 rounded-lg border px-4 py-3 shadow-md',
          config.className,
          className
        )}
      >
        <Icon size={18} className="mt-0.5 shrink-0" />

        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {message ? <p className="mt-1 text-sm text-ui-text-main">{message}</p> : null}
        </div>

        <Button
          type="button"
          variant="icon"
          className="!h-8 !w-8 shrink-0 border-transparent bg-transparent text-current hover:bg-ui-background"
          onClick={() => onClose?.()}
          aria-label="Cerrar notificacion"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};

export default NotificationToast;
