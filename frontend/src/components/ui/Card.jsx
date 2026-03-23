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
      className={cn('ui-card ui-card--padded', className)}
      {...props}
    >
      {(title || subtitle || actions) ? (
        <header className={cn('ui-card__header', headerClassName)}>
          <div>
            {title ? <h2 className="ui-card__title">{title}</h2> : null}
            {subtitle ? <p className="ui-card__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}

      <div className={cn(bodyClassName)}>{children}</div>
    </Component>
  );
};

export default Card;
