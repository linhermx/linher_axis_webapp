import { useMemo, useState } from 'react';
import { StatusView } from '../components/ui';
import AccountsManager from '../components/admin/AccountsManager';
import MicrosipIntegrationPanel from '../components/admin/MicrosipIntegrationPanel';
import { useAuth } from '../hooks/useAuth';
import { hasAnyPermission } from '../lib/permissions';
import { cn } from '../lib/cn';

const TABS = [
  {
    key: 'axis_accounts',
    label: 'Cuentas AXIS',
    permissions: ['manage_axis_accounts'],
  },
  {
    key: 'microsip',
    label: 'Integración Microsip',
    permissions: ['view_audit_logs'],
  },
];

const MicrosipAdmin = () => {
  const { user } = useAuth();

  const availableTabs = useMemo(
    () => TABS.filter((tab) => hasAnyPermission(user, tab.permissions)),
    [user]
  );

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.key || 'axis_accounts');

  const selectedTab = useMemo(
    () => availableTabs.find((tab) => tab.key === activeTab) || availableTabs[0] || null,
    [activeTab, availableTabs]
  );

  if (availableTabs.length === 0) {
    return (
      <StatusView
        title="Acceso restringido"
        description="No cuentas con permisos para usar este módulo."
      />
    );
  }

  return (
    <section className="admin-module">
      <header className="admin-module__tabs-wrap" role="tablist" aria-label="Pestañas del módulo de administración">
        <nav className="employee-module-nav admin-module__tabs" aria-label="Navegación del módulo de administración">
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selectedTab?.key === tab.key}
              className={cn('employee-module-nav__item', 'admin-module__tab', selectedTab?.key === tab.key && 'is-active')}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {selectedTab?.key === 'axis_accounts' ? <AccountsManager /> : null}
      {selectedTab?.key === 'microsip' ? <MicrosipIntegrationPanel /> : null}
    </section>
  );
};

export default MicrosipAdmin;

