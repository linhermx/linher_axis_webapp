import express from 'express';
import { getAuditLogs, getRoles, getPermissions } from '../controllers/adminController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Audit Logs (ADMIN or explicit permission)
router.get('/audit-logs', checkPermission('view_audit_logs'), getAuditLogs);

// Roles & Permissions management
router.get('/roles', checkPermission('view_audit_logs'), getRoles);
router.get('/permissions', checkPermission('view_audit_logs'), getPermissions);

export default router;
