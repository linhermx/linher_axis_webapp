export const hasAnyPermission = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
};

export const hasAllPermissions = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true;
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return requiredPermissions.every((permission) => userPermissions.includes(permission));
};
