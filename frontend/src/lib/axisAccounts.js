const normalizeText = (value) => String(value || '').trim();

const normalizeRole = (value) => normalizeText(value).toUpperCase();

export const AXIS_ROLE_LABELS = Object.freeze({
  ADMIN: 'Administrador',
  RRHH: 'RRHH',
  SUPERVISOR: 'Supervisor',
  RECLUTADOR: 'Reclutador',
  EMPLEADO: 'Empleado',
});

export const ACCOUNT_STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Todas las cuentas' },
  { value: 'with_account', label: 'Con cuenta' },
  { value: 'without_account', label: 'Sin cuenta' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
]);

export const toRoleLabel = (roleName) => (
  AXIS_ROLE_LABELS[normalizeRole(roleName)] || normalizeText(roleName) || 'Sin rol'
);

export const getRoleBadgeVariant = (roleName) => {
  const normalizedRole = normalizeRole(roleName);

  if (normalizedRole === 'ADMIN') return 'danger';
  if (normalizedRole === 'RRHH') return 'warning';
  if (normalizedRole === 'SUPERVISOR') return 'success';
  if (normalizedRole === 'RECLUTADOR') return 'info';
  return 'neutral';
};

export const getRoleSortWeight = (roleName) => {
  const normalizedRole = normalizeRole(roleName);
  if (normalizedRole === 'ADMIN') return 1;
  if (normalizedRole === 'RRHH') return 2;
  if (normalizedRole === 'SUPERVISOR') return 3;
  if (normalizedRole === 'RECLUTADOR') return 4;
  if (normalizedRole === 'EMPLEADO') return 5;
  return 99;
};

export const normalizeRoleList = (roles = []) => (
  Array.from(new Set((Array.isArray(roles) ? roles : [roles])
    .map((role) => normalizeRole(role))
    .filter(Boolean)))
    .sort((left, right) => getRoleSortWeight(left) - getRoleSortWeight(right))
);

export const getAccountStatusMeta = (statusValue) => {
  const normalizedStatus = normalizeText(statusValue).toLowerCase();
  if (normalizedStatus === 'inactive') {
    return { status: 'inactive', label: 'Inactiva' };
  }
  return { status: 'approved', label: 'Activa' };
};

export const formatLastSession = (value) => {
  if (!value) return 'Sin sesión';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'Sin sesión';

  return parsedDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
};

export const getRoleFilterOptions = (roleCatalog = []) => {
  const normalizedRoles = Array.from(
    new Set((Array.isArray(roleCatalog) ? roleCatalog : [])
      .map((role) => normalizeRole(role?.name))
      .filter(Boolean))
  ).sort((left, right) => getRoleSortWeight(left) - getRoleSortWeight(right));

  return [
    { value: 'all', label: 'Todos los roles' },
    ...normalizedRoles.map((roleName) => ({
      value: roleName,
      label: toRoleLabel(roleName),
    })),
  ];
};
