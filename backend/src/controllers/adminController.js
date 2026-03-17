import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { handleControllerError } from '../utils/ApiError.js';

const logger = new SystemLogger(pool);

export const getAuditLogs = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT al.*, u.email as user_email 
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
        `);

        return res.json(rows);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AUDIT_LOGS_FETCH_ERROR',
            message: 'Error al cargar bitacora de auditoria',
        });
    }
};

export const getRoles = async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT * FROM roles');
        return res.json(roles);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'ROLES_FETCH_ERROR',
            message: 'Error al cargar roles',
        });
    }
};

export const getPermissions = async (req, res) => {
    try {
        const [permissions] = await pool.query('SELECT * FROM permissions');
        return res.json(permissions);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'PERMISSIONS_FETCH_ERROR',
            message: 'Error al cargar permisos',
        });
    }
};
