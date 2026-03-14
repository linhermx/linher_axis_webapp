import { cn } from '../../lib/cn';

const PageHeader = ({ title, subtitle, actions, className, children }) => {
  return (
    <header
      className={cn(
        'mb-8 flex flex-wrap items-start justify-between gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-ui-dark-navy">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ui-text-secondary">{subtitle}</p>}
        {children}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
};

export default PageHeader;
