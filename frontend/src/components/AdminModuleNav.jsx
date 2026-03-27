import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAvailableAdminTabs, resolveAdminTab } from '../lib/adminTabs';
import { cn } from '../lib/cn';

const AdminModuleNav = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const availableTabs = useMemo(
    () => getAvailableAdminTabs(user),
    [user]
  );

  const activeTab = useMemo(
    () => resolveAdminTab(searchParams, availableTabs),
    [searchParams, availableTabs]
  );

  if (availableTabs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Vistas del módulo de administración" className="employee-module-nav">
      {availableTabs.map((tab) => (
        <Link
          key={tab.key}
          to={`/admin?tab=${tab.key}`}
          className={cn('employee-module-nav__item', activeTab === tab.key && 'is-active')}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
};

export default AdminModuleNav;
