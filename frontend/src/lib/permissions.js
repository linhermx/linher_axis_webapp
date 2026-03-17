const normalizePermission = (value) => String(value || '').trim().toLowerCase();
const normalizeRoleName = (value) => String(value || '').trim().toUpperCase();

const getNormalizedUserPermissions = (user) => (
  Array.isArray(user?.permissions)
    ? user.permissions.map(normalizePermission).filter(Boolean)
    : []
);

export const isAdminUser = (user) => (
  normalizeRoleName(user?.role_name) === 'ADMIN'
  || Number(user?.role_id) === 1
);

export const hasAnyPermission = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;
  if (isAdminUser(user)) return true;

  const userPermissions = getNormalizedUserPermissions(user);
  const expectedPermissions = requiredPermissions.map(normalizePermission).filter(Boolean);
  return expectedPermissions.some((permission) => userPermissions.includes(permission));
};

export const hasAllPermissions = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;
  if (isAdminUser(user)) return true;

  const userPermissions = getNormalizedUserPermissions(user);
  const expectedPermissions = requiredPermissions.map(normalizePermission).filter(Boolean);
  return expectedPermissions.every((permission) => userPermissions.includes(permission));
};
