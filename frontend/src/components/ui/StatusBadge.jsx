import { cn } from '../../lib/cn';

const STATUS_CLASS_MAP = {
  new: 'ui-status-badge--info',
  info: 'ui-status-badge--info',
  pending: 'ui-status-badge--pending',
  in_progress: 'ui-status-badge--in-progress',
  approved: 'ui-status-badge--approved',
  success: 'ui-status-badge--success',
  completed: 'ui-status-badge--completed',
  rejected: 'ui-status-badge--rejected',
  declined: 'ui-status-badge--declined',
  failed: 'ui-status-badge--failed',
  inactive: 'ui-status-badge--inactive',
};

const normalizeStatus = (value) => String(value || 'info').trim().toLowerCase().replace(/\s+/g, '_');

const StatusBadge = ({ status = 'info', label, className, showDot = true }) => {
  const statusKey = normalizeStatus(status);
  const statusClass = STATUS_CLASS_MAP[statusKey] || 'ui-status-badge--info';

  return (
    <span className={cn('ui-status-badge', statusClass, className)}>
      {showDot ? <span className="ui-status-badge__dot" aria-hidden="true" /> : null}
      <span>{label || status}</span>
    </span>
  );
};

export default StatusBadge;
