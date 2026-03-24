import { Info } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const StatusView = ({
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <section className={cn('ui-status-view', className)}>
      <span className="ui-status-view__icon">
        <Info size={20} />
      </span>

      <h2 className="ui-status-view__title">{title}</h2>
      <p className="ui-status-view__description">{description}</p>

      {actionLabel && typeof onAction === 'function' ? (
        <Button type="button" className="ui-status-view__action" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
};

export default StatusView;
