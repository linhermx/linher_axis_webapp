import { isAdminUser, normalizeRoleName, toCanonicalRoleList } from '../utils/RolePolicy.js';

const normalizeToArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const normalizePermissionCode = (value) => String(value || '').trim().toLowerCase();

const toSet = (values, normalizer) => new Set(
    normalizeToArray(values)
        .map(normalizer)
        .filter(Boolean)
);

export const checkPermission = (permissionCodes, options = {}) => {
    const requiredCodes = toSet(permissionCodes, normalizePermissionCode);
    const allowedRoles = toSet(options.allowRoles || ['ADMIN'], normalizeRoleName);
    const requireAll = Boolean(options.requireAll);

    return (req, res, next) => {
        try {
            const user = req.authUser;
            if (!user) {
                return res.status(401).json({ message: 'Autenticacion requerida' });
            }

            const userRoles = new Set(toCanonicalRoleList([user?.role_name, ...(user?.roles || [])]));
            const userPermissions = toSet(user.permissions || [], normalizePermissionCode);
            const hasAllowedRole = Array.from(userRoles).some((role) => allowedRoles.has(role));

            if (isAdminUser(user) || hasAllowedRole || requiredCodes.size === 0) {
                req.authz = {
                    roles: Array.from(userRoles),
                    permissions: Array.from(userPermissions),
                };

                return next();
            }

            const matchedPermissions = Array.from(requiredCodes).filter((code) => userPermissions.has(code));
            const isAuthorized = requireAll
                ? matchedPermissions.length === requiredCodes.size
                : matchedPermissions.length > 0;

            if (!isAuthorized) {
                return res.status(403).json({ message: 'No autorizado para esta accion' });
            }

            req.authz = {
                roles: Array.from(userRoles),
                permissions: matchedPermissions,
            };

            return next();
        } catch (error) {
            return res.status(500).json({ message: 'Error al validar permisos' });
        }
    };
};
