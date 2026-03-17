import pool from '../config/db.js';

const normalizeToArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const getUserRoles = async (userId) => {
    const [rows] = await pool.query(
        `SELECT DISTINCT r.name
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = ?`,
        [userId]
    );

    return rows.map((row) => row.name);
};

const getUserPermissionsByCodes = async (userId, permissionCodes) => {
    if (!permissionCodes.length) return [];

    const placeholders = permissionCodes.map(() => '?').join(', ');
    const [rows] = await pool.query(
        `SELECT DISTINCT p.code
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = ?
           AND p.code IN (${placeholders})`,
        [userId, ...permissionCodes]
    );

    return rows.map((row) => row.code);
};

export const checkPermission = (permissionCodes, options = {}) => {
    const requiredCodes = normalizeToArray(permissionCodes);
    const allowedRoles = normalizeToArray(options.allowRoles || ['HR_ADMIN']);
    const requireAll = Boolean(options.requireAll);

    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const roleNames = await getUserRoles(userId);
            const allowedByRole = roleNames.some((role) => allowedRoles.includes(role));

            if (allowedByRole || requiredCodes.length === 0) {
                req.authz = {
                    roles: roleNames,
                    permissions: [],
                };
                return next();
            }

            const matchedPermissions = await getUserPermissionsByCodes(userId, requiredCodes);
            const isAuthorized = requireAll
                ? requiredCodes.every((code) => matchedPermissions.includes(code))
                : matchedPermissions.length > 0;

            if (!isAuthorized) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            }

            req.authz = {
                roles: roleNames,
                permissions: matchedPermissions,
            };

            next();
        } catch (error) {
            res.status(500).json({ message: 'Server error check permissions' });
        }
    };
};
