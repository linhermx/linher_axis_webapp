const normalizePermission = (value) => String(value || '').trim().toLowerCase();

const uniqueValues = (values = []) => Array.from(new Set(values.filter(Boolean)));

export const getUserSessionById = async (db, userId) => {
    const [userRows] = await db.query(
        `SELECT u.id, u.email, u.status, e.id AS employee_id, e.first_name, e.last_name
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id
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
         ORDER BY r.id ASC`,
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
    const roles = roleRows.map((row) => row.name);
    const permissions = uniqueValues(permissionRows.map((row) => normalizePermission(row.code)));

    return {
        id: user.id,
        employee_id: user.employee_id ?? null,
        name: fullName || fallbackName || 'Usuario',
        email: user.email,
        photo_path: null,
        role_id: roleRows[0]?.id ?? null,
        role_name: roleRows[0]?.name ?? null,
        roles,
        permissions,
        status: user.status,
    };
};

export const normalizePermissionCode = normalizePermission;
