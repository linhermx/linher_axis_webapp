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
    <section
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-ui-light-slate bg-ui-surface px-6 py-10 text-center',
        className
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-ui-background text-brand-primary">
        <Info size={20} />
      </span>

      <h2 className="text-lg font-bold text-ui-dark-navy">{title}</h2>
      <p className="mt-2 max-w-[520px] text-sm text-ui-text-secondary">{description}</p>

      {actionLabel && typeof onAction === 'function' ? (
        <Button type="button" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
};

export default StatusView;
