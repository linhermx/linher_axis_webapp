import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatusView } from '../components/ui';
import AccountsManager from '../components/admin/AccountsManager';
import MicrosipIntegrationPanel from '../components/admin/MicrosipIntegrationPanel';
import { useAuth } from '../hooks/useAuth';
import { getAvailableAdminTabs, resolveAdminTab } from '../lib/adminTabs';

const MicrosipAdmin = () => {
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
    return (
      <StatusView
        title="Acceso restringido"
        description="No cuentas con permisos para usar este módulo."
      />
    );
  }

  const selectedTab = availableTabs.find((tab) => tab.key === activeTab) || availableTabs[0] || null;

  return (
    <section className="admin-module">
      {selectedTab?.key === 'axis_accounts' ? <AccountsManager /> : null}
      {selectedTab?.key === 'microsip' ? <MicrosipIntegrationPanel /> : null}
    </section>
  );
};

export default MicrosipAdmin;
