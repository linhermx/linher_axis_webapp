import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANT_STYLES = {
  info: {
    icon: Info,
    className: 'border-status-info/30 bg-status-info/10 text-status-info',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-status-success/30 bg-status-success/10 text-status-success',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  },
  error: {
    icon: AlertCircle,
    className: 'border-status-error/30 bg-status-error/10 text-status-error',
  },
};

const Alert = ({ variant = 'info', title, children, className }) => {
  const config = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-4 py-3',
        config.className,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-[1px] shrink-0" />
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {children ? (
            <div className={cn('text-sm', title ? 'mt-1' : '')}>{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Alert;
