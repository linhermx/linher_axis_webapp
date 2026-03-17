import { cn } from '../../lib/cn';

const STATUS_CLASS_MAP = {
  new: 'border-status-info/35 bg-status-info/10 text-status-info',
  info: 'border-status-info/35 bg-status-info/10 text-status-info',
  pending: 'border-status-warning/35 bg-status-warning/10 text-status-warning',
  in_progress: 'border-status-warning/35 bg-status-warning/10 text-status-warning',
  approved: 'border-status-success/35 bg-status-success/10 text-status-success',
  success: 'border-status-success/35 bg-status-success/10 text-status-success',
  completed: 'border-status-success/35 bg-status-success/10 text-status-success',
  rejected: 'border-status-error/35 bg-status-error/10 text-status-error',
  declined: 'border-status-error/35 bg-status-error/10 text-status-error',
  failed: 'border-status-error/35 bg-status-error/10 text-status-error',
  inactive: 'border-ui-light-slate bg-ui-background text-ui-text-secondary',
};

const normalizeStatus = (value) => String(value || 'info').trim().toLowerCase().replace(/\s+/g, '_');

const StatusBadge = ({ status = 'info', label, className, showDot = true }) => {
  const statusKey = normalizeStatus(status);
  const statusClass = STATUS_CLASS_MAP[statusKey] || 'border-ui-light-slate bg-ui-background text-ui-text-main';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        statusClass,
        className
      )}
    >
      {showDot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      <span>{label || status}</span>
    </span>
  );
};

export default StatusBadge;
