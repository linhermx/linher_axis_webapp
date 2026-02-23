import pool from '../config/db.js';

export const checkPermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            const query = `
                SELECT p.code 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ? AND p.code = ?
            `;

            const [rows] = await pool.query(query, [userId, permissionCode]);

            if (rows.length === 0) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: 'Server error check permissions' });
        }
    };
};
