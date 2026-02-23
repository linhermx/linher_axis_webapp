import pool from '../config/db.js';

export const logAction = async (userId, action, targetType, targetId, oldValue = null, newValue = null, ipAddress = '') => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, action, targetType, targetId, JSON.stringify(oldValue), JSON.stringify(newValue), ipAddress]
        );
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

export const getAuditLogs = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT al.*, u.email as user_email 
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
    }
};
