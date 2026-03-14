import { cn } from '../../lib/cn';

const Card = ({
  as: Component = 'section',
  title,
  subtitle,
  actions,
  className,
  headerClassName,
  bodyClassName,
  children,
  ...props
}) => {
  return (
    <Component
      className={cn(
        'rounded-lg border border-ui-light-slate bg-ui-surface p-6 shadow-sm',
        className
      )}
      {...props}
    >
      {(title || subtitle || actions) && (
        <header className={cn('mb-5 flex items-start justify-between gap-4', headerClassName)}>
          <div className="min-w-0">
            {title && <h2 className="text-lg font-extrabold text-ui-dark-navy">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-ui-text-secondary">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}

      <div className={cn(bodyClassName)}>{children}</div>
    </Component>
  );
};

export default Card;
