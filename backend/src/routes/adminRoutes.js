import express from 'express';
import { getAuditLogs, getRoles, getPermissions } from '../controllers/adminController.js';
import {
    createAxisAccount,
    getAxisAccountByEmployeeId,
    getAxisAccountRoles,
    getAxisAccounts,
    resetAxisAccountPassword,
    updateAxisAccountRoles,
    updateAxisAccountStatus,
} from '../controllers/axisAccountController.js';
import {
    removeEmployeeProfilePhoto,
    uploadEmployeeProfilePhoto,
} from '../controllers/profilePhotoController.js';
import {
    getMicrosipHealth,
    getMicrosipEmployeesSnapshot,
    reconcileMicrosipLinks,
    getMicrosipSyncLogs,
    triggerMicrosipSync,
} from '../controllers/microsipController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacMiddleware.js';
import { uploadProfilePhoto } from '../middlewares/profilePhotoUpload.js';

const router = express.Router();

router.use(authenticateToken);

// Audit Logs (ADMIN or explicit permission)
router.get('/audit-logs', checkPermission('view_audit_logs'), getAuditLogs);

// Roles & Permissions management
router.get('/roles', checkPermission('view_audit_logs'), getRoles);
router.get('/permissions', checkPermission('view_audit_logs'), getPermissions);

// Axis accounts governance
router.get('/axis-accounts', checkPermission('manage_axis_accounts'), getAxisAccounts);
router.get('/axis-accounts/roles', checkPermission('manage_axis_accounts'), getAxisAccountRoles);
router.get('/axis-accounts/:employeeId', checkPermission('manage_axis_accounts'), getAxisAccountByEmployeeId);
router.post('/axis-accounts', checkPermission('manage_axis_accounts'), createAxisAccount);
router.patch('/axis-accounts/:employeeId/status', checkPermission('toggle_user_accounts'), updateAxisAccountStatus);
router.post('/axis-accounts/:employeeId/reset-password', checkPermission('reset_user_passwords'), resetAxisAccountPassword);
router.patch('/axis-accounts/:employeeId/roles', checkPermission('assign_system_roles'), updateAxisAccountRoles);
router.post('/axis-accounts/:employeeId/photo', checkPermission('manage_axis_accounts'), uploadProfilePhoto('photo'), uploadEmployeeProfilePhoto);
router.delete('/axis-accounts/:employeeId/photo', checkPermission('manage_axis_accounts'), removeEmployeeProfilePhoto);

// Microsip integration (MVP skeleton)
router.get('/microsip/health', checkPermission('view_audit_logs'), getMicrosipHealth);
router.get('/microsip/employees', checkPermission('view_audit_logs'), getMicrosipEmployeesSnapshot);
router.get('/microsip/sync-logs', checkPermission('view_audit_logs'), getMicrosipSyncLogs);
router.post('/microsip/sync', checkPermission(['sync_microsip', 'view_audit_logs']), triggerMicrosipSync);
router.post('/microsip/reconcile-links', checkPermission(['sync_microsip', 'view_audit_logs']), reconcileMicrosipLinks);

export default router;
