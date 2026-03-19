import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';
import { createMicrosipSyncService } from '../services/MicrosipSyncService.js';

const logger = new SystemLogger(pool);
const microsipSyncService = createMicrosipSyncService({
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

export const getMicrosipHealth = async (req, res) => {
    try {
        const [latestSyncLog, connector] = await Promise.all([
            microsipSyncService.getLatestSyncLog(),
            microsipSyncService.getConnectorHealth(),
        ]);

        return res.json({
            connector,
            latest_sync_log: latestSyncLog,
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
