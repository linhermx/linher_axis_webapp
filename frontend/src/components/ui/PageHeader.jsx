import { cn } from '../../lib/cn';

const PageHeader = ({ title, subtitle, actions, className, children }) => {
  return (
    <header
      className={cn(
        'mb-2 flex flex-wrap items-start justify-between gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[1.8rem] font-extrabold tracking-[-0.02em] text-ui-dark-navy">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm text-ui-text-secondary">{subtitle}</p>}
        {children}
      </div>

      {actions && <div className="shrink-0 pt-1">{actions}</div>}
    </header>
  );
};

export default PageHeader;
