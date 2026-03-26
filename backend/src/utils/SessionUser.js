import { normalizeRoleName, toCanonicalRoleList } from './RolePolicy.js';

const normalizePermission = (value) => String(value || '').trim().toLowerCase();

const uniqueValues = (values = []) => Array.from(new Set(values.filter(Boolean)));

export const getUserSessionById = async (db, userId) => {
    const [userRows] = await db.query(
        `SELECT
            u.id,
            u.email,
            u.status,
            u.must_change_password,
            e.id AS employee_id,
            COALESCE(NULLIF(TRIM(ext.first_name), ''), NULLIF(TRIM(ai.first_name), '')) AS first_name,
            COALESCE(NULLIF(TRIM(ext.last_name), ''), NULLIF(TRIM(ai.last_name), '')) AS last_name
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id
         LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
         LEFT JOIN ext_microsip_employee ext ON ext.id = eml.microsip_employee_ext_id
         LEFT JOIN employee_axis_identity ai ON ai.employee_id = e.id
         WHERE u.id = ?
         LIMIT 1`,
        [userId]
    );

    const user = userRows[0];
    if (!user) {
        return null;
    }

    const [roleRows] = await db.query(
        `SELECT r.id, r.name
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = ?
         ORDER BY FIELD(UPPER(TRIM(r.name)), 'ADMIN', 'RRHH', 'SUPERVISOR', 'RECLUTADOR', 'EMPLEADO'), r.id ASC`,
        [userId]
    );

    const [permissionRows] = await db.query(
        `SELECT DISTINCT p.code
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = ?
         ORDER BY p.code ASC`,
        [userId]
    );

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const fallbackName = typeof user.email === 'string' ? user.email.split('@')[0] : 'Usuario';
    const roles = toCanonicalRoleList(roleRows.map((row) => row.name));
    const primaryRole = normalizeRoleName(roleRows[0]?.name);
    const permissions = uniqueValues(permissionRows.map((row) => normalizePermission(row.code)));

    return {
        id: user.id,
        employee_id: user.employee_id ?? null,
        name: fullName || fallbackName || 'Usuario',
        email: user.email,
        photo_path: null,
        role_id: roleRows[0]?.id ?? null,
        role_name: primaryRole || null,
        roles,
        permissions,
        status: user.status,
        must_change_password: Boolean(Number(user.must_change_password || 0)),
    };
};

export const normalizePermissionCode = normalizePermission;
