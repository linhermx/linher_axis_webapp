import { cn } from '../../lib/cn';

const PageHeader = ({ title, subtitle, actions, className, children }) => {
  return (
    <header className={cn('ui-page-header', className)}>
      <div className="ui-page-header__main">
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle ? <p className="ui-page-header__subtitle">{subtitle}</p> : null}
        {children}
      </div>

      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
};

export default PageHeader;
