import express from 'express';
import { getAuditLogs, getRoles, getPermissions } from '../controllers/adminController.js';
import {
    getMicrosipHealth,
    getMicrosipEmployeesSnapshot,
    reconcileMicrosipLinks,
    getMicrosipSyncLogs,
    triggerMicrosipSync,
} from '../controllers/microsipController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Audit Logs (ADMIN or explicit permission)
router.get('/audit-logs', checkPermission('view_audit_logs'), getAuditLogs);

// Roles & Permissions management
router.get('/roles', checkPermission('view_audit_logs'), getRoles);
router.get('/permissions', checkPermission('view_audit_logs'), getPermissions);

// Microsip integration (MVP skeleton)
router.get('/microsip/health', checkPermission('view_audit_logs'), getMicrosipHealth);
router.get('/microsip/employees', checkPermission('view_audit_logs'), getMicrosipEmployeesSnapshot);
router.get('/microsip/sync-logs', checkPermission('view_audit_logs'), getMicrosipSyncLogs);
router.post('/microsip/sync', checkPermission(['sync_microsip', 'view_audit_logs']), triggerMicrosipSync);
router.post('/microsip/reconcile-links', checkPermission(['sync_microsip', 'view_audit_logs']), reconcileMicrosipLinks);

export default router;
