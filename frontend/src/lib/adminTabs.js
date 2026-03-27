import { hasAnyPermission } from './permissions';

export const ADMIN_TABS = [
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

export const getAvailableAdminTabs = (user) => (
  ADMIN_TABS.filter((tab) => hasAnyPermission(user, tab.permissions))
);

export const resolveAdminTab = (searchParams, availableTabs) => {
  const rawValue = searchParams?.get?.('tab') || '';
  const normalized = String(rawValue).trim();

  if (normalized && availableTabs.some((tab) => tab.key === normalized)) {
    return normalized;
  }

  return availableTabs[0]?.key || null;
};
