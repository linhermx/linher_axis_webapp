import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';
import { createMicrosipSyncService } from '../services/MicrosipSyncService.js';
import { createMicrosipLinkReconciliationService } from '../services/MicrosipLinkReconciliationService.js';

const logger = new SystemLogger(pool);
const microsipSyncService = createMicrosipSyncService({
    db: pool,
    logger,
});
const microsipLinkReconciliationService = createMicrosipLinkReconciliationService({
    db: pool,
    logger,
});

const parseLimit = (value) => {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
        return 20;
    }

    return Math.min(numeric, 100);
};

const parseRetentionMonths = (value, fallback = 24) => {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) {
        return fallback;
    }

    return numeric;
};

const toBoolean = (value, fallback = false) => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return fallback;
};

export const getMicrosipHealth = async (req, res) => {
    try {
        const [latestSyncLog, connector] = await Promise.all([
            microsipSyncService.getLatestSyncLog(),
            microsipSyncService.getConnectorHealth(),
        ]);
        const payrollRetentionMonths = parseRetentionMonths(process.env.MICROSIP_PAYROLL_RETENTION_MONTHS, 24);

        return res.json({
            connector,
            latest_sync_log: latestSyncLog,
            retention_policy: {
                payroll_retention_months: payrollRetentionMonths,
                payroll_prune_enabled: payrollRetentionMonths !== 0,
                notes: payrollRetentionMonths === 0
                    ? 'La limpieza automatica de historial de pagos esta deshabilitada'
                    : `Se eliminan pagos con fecha menor a ${payrollRetentionMonths} meses`,
            },
        });
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        if (statusCode >= 400 && statusCode < 500) {
            return sendError(res, statusCode, error.message, req, { code: error.code || null });
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MICROSIP_HEALTH_ERROR',
            message: 'Error al consultar estado de integracion Microsip',
        });
    }
};

export const getMicrosipSyncLogs = async (req, res) => {
    try {
        const logs = await microsipSyncService.listSyncLogs(parseLimit(req.query.limit));
        return res.json({ data: logs });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MICROSIP_SYNC_LOGS_FETCH_ERROR',
            message: 'Error al consultar bitacora de sincronizacion Microsip',
        });
    }
};

export const getMicrosipEmployeesSnapshot = async (req, res) => {
    try {
        const rows = await microsipSyncService.listEmployeeSnapshots(parseLimit(req.query.limit));
        return res.json({ data: rows });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MICROSIP_EMPLOYEE_SNAPSHOT_FETCH_ERROR',
            message: 'Error al consultar snapshot de empleados Microsip',
        });
    }
};

export const triggerMicrosipSync = async (req, res) => {
    const syncType = req.body?.sync_type || 'full';

    try {
        const result = await microsipSyncService.runSync({
            syncType,
            triggerUserId: req.authUser?.id || null,
            requestId: req.requestId || null,
        });

        return res.status(200).json({
            message: 'Sincronizacion ejecutada',
            ...result,
        });
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        if (statusCode >= 400 && statusCode < 500) {
            return sendError(res, statusCode, error.message, req, { code: error.code || null });
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MICROSIP_SYNC_TRIGGER_ERROR',
            message: 'Error al ejecutar sincronizacion Microsip',
            details: { sync_type: syncType },
        });
    }
};

export const reconcileMicrosipLinks = async (req, res) => {
    try {
        const result = await microsipLinkReconciliationService.reconcileLinks({
            dry_run: toBoolean(req.body?.dry_run, true),
            create_missing_employees: toBoolean(req.body?.create_missing_employees, true),
            create_missing_jobs: toBoolean(req.body?.create_missing_jobs, true),
            limit: req.body?.limit || req.query?.limit || 500,
            trigger_user_id: req.authUser?.id || null,
            request_id: req.requestId || null,
        });

        return res.status(200).json({
            message: result.options?.dry_run
                ? 'Simulacion de conciliacion completada'
                : 'Conciliacion de enlaces completada',
            data: result,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MICROSIP_LINK_RECONCILE_ERROR',
            message: 'Error al conciliar enlaces internos con Microsip',
        });
    }
};
