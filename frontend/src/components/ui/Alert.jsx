import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANT_STYLES = {
  info: { icon: Info, className: 'ui-alert--info' },
  success: { icon: CheckCircle2, className: 'ui-alert--success' },
  warning: { icon: TriangleAlert, className: 'ui-alert--warning' },
  error: { icon: AlertCircle, className: 'ui-alert--error' },
};

const Alert = ({ variant = 'info', title, children, className }) => {
  const config = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const Icon = config.icon;

  return (
    <div role="alert" className={cn('ui-alert', config.className, className)}>
      <div className="ui-alert__row">
        <Icon size={18} className="ui-alert__icon" />
        <div>
          {title ? <p className="ui-alert__title">{title}</p> : null}
          {children ? <div className="ui-alert__content">{children}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default Alert;
