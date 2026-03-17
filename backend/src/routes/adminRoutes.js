import express from 'express';
import { getAuditLogs } from '../controllers/adminController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';
import pool from '../config/db.js';

const router = express.Router();

router.use(authenticateToken);

// Audit Logs (HR_ADMIN only or specific permission)
router.get('/audit-logs', checkPermission('VIEW_AUDIT_LOGS'), getAuditLogs);

// Roles & Permissions management
router.get('/roles', checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT * FROM roles');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching roles' });
    }
});

router.get('/permissions', checkPermission('VIEW_AUDIT_LOGS'), async (req, res) => {
    try {
        const [permissions] = await pool.query('SELECT * FROM permissions');
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching permissions' });
    }
});

export default router;
