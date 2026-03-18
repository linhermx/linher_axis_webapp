import { createMicrosipConnectorService } from './MicrosipConnectorService.js';

const ALLOWED_SYNC_TYPES = new Set(['full', 'departments', 'job_titles', 'employees']);

const toInteger = (value, fallback = null) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return fallback;
    }

    return parsed;
};

const normalizeText = (value, fallback = null) => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const normalizeBoolean = (value, fallback = true) => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    if (value === true || value === 1) {
        return true;
    }

    if (value === false || value === 0) {
        return false;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'active'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'n', 'inactive'].includes(normalized)) {
        return false;
    }

    return fallback;
};

const normalizeDate = (value) => {
    const normalized = String(value || '').trim();
    return normalized || null;
};

const ensureSyncType = (value) => {
    const syncType = normalizeText(value, 'full')?.toLowerCase();
    if (!ALLOWED_SYNC_TYPES.has(syncType)) {
        const error = new Error('Tipo de sincronizacion no soportado');
        error.statusCode = 400;
        error.code = 'MICROSIP_SYNC_TYPE_INVALID';
        throw error;
    }

    return syncType;
};

const toArray = (value) => {
    if (Array.isArray(value)) {
        return value;
    }

    return [];
};

const buildLookupKeys = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return [];
    }

    return [normalized, normalized.toUpperCase(), normalized.toLowerCase()];
};

const normalizeDepartmentPayload = (source) => ({
    microsip_department_id: normalizeText(
        source?.microsip_department_id
        || source?.department_id
        || source?.id
    ),
    name: normalizeText(source?.name || source?.department_name, 'Sin nombre'),
    is_active: normalizeBoolean(source?.is_active ?? source?.active, true),
});

const normalizeJobTitlePayload = (source) => ({
    microsip_job_title_id: normalizeText(
        source?.microsip_job_title_id
        || source?.job_title_id
        || source?.position_id
        || source?.id
    ),
    name: normalizeText(source?.name || source?.job_title_name || source?.position_name, 'Sin nombre'),
    is_active: normalizeBoolean(source?.is_active ?? source?.active, true),
});

const normalizeEmployeePayload = (source) => ({
    microsip_employee_id: normalizeText(source?.microsip_employee_id || source?.employee_id || source?.id),
    employee_number: normalizeText(source?.employee_number || source?.employee_code || source?.code),
    first_name: normalizeText(source?.first_name || source?.name, 'Sin nombre'),
    last_name: normalizeText(source?.last_name || source?.paternal_last_name, ''),
    department_code: normalizeText(
        source?.department_id
        || source?.microsip_department_id
        || source?.department_code
    ),
    job_title_code: normalizeText(
        source?.job_title_id
        || source?.microsip_job_title_id
        || source?.position_id
        || source?.job_title_code
    ),
    employment_status: normalizeText(source?.employment_status || source?.status || 'active'),
    hired_at: normalizeDate(source?.hired_at || source?.hire_date),
    terminated_at: normalizeDate(source?.terminated_at || source?.termination_date),
    source_payload: source,
});

export class MicrosipSyncService {
    constructor({
        db,
        connector = createMicrosipConnectorService(),
        logger = null,
    }) {
        this.db = db;
        this.connector = connector;
        this.logger = logger;
        this.statusIdCache = new Map();
        this.departmentCache = new Map();
        this.jobTitleCache = new Map();
    }

    async getStatusId(statusCode) {
        const normalizedCode = normalizeText(statusCode)?.toLowerCase();
        if (!normalizedCode) {
            throw new Error('Status code requerido para ext_microsip_sync_log');
        }

        if (this.statusIdCache.has(normalizedCode)) {
            return this.statusIdCache.get(normalizedCode);
        }

        const [rows] = await this.db.query(
            'SELECT id FROM ref_sync_status WHERE code = ? LIMIT 1',
            [normalizedCode]
        );

        if (!rows.length) {
            throw new Error(`No existe ref_sync_status para code="${normalizedCode}"`);
        }

        const statusId = Number(rows[0].id);
        this.statusIdCache.set(normalizedCode, statusId);
        return statusId;
    }

    async hasRunningSync(syncType) {
        const [rows] = await this.db.query(
            `SELECT sl.id
             FROM ext_microsip_sync_log sl
             JOIN ref_sync_status rs ON rs.id = sl.status_id
             WHERE sl.sync_type = ?
               AND rs.code = 'running'
             ORDER BY sl.id DESC
             LIMIT 1`,
            [syncType]
        );

        return rows.length > 0;
    }

    async createSyncLog(syncType, userId) {
        const runningStatusId = await this.getStatusId('running');
        const [result] = await this.db.query(
            `INSERT INTO ext_microsip_sync_log (
                sync_type,
                status_id,
                records_total,
                records_processed,
                records_failed,
                created_by_user_id
            ) VALUES (?, ?, 0, 0, 0, ?)`,
            [syncType, runningStatusId, userId || null]
        );

        return Number(result.insertId);
    }

    async updateSyncLog(logId, {
        statusCode,
        recordsTotal,
        recordsProcessed,
        recordsFailed,
        message,
    }) {
        const statusId = await this.getStatusId(statusCode);

        await this.db.query(
            `UPDATE ext_microsip_sync_log
             SET status_id = ?,
                 finished_at = CURRENT_TIMESTAMP,
                 records_total = ?,
                 records_processed = ?,
                 records_failed = ?,
                 message = ?
             WHERE id = ?`,
            [
                statusId,
                recordsTotal,
                recordsProcessed,
                recordsFailed,
                message || null,
                logId,
            ]
        );
    }

    async getLatestSyncLog() {
        const [rows] = await this.db.query(
            `SELECT
                sl.id,
                sl.sync_type,
                rs.code AS status_code,
                rs.label AS status_label,
                sl.started_at,
                sl.finished_at,
                sl.records_total,
                sl.records_processed,
                sl.records_failed,
                sl.message,
                sl.created_by_user_id
             FROM ext_microsip_sync_log sl
             JOIN ref_sync_status rs ON rs.id = sl.status_id
             ORDER BY sl.id DESC
             LIMIT 1`
        );

        return rows[0] || null;
    }

    async listSyncLogs(limit = 20) {
        const normalizedLimit = Math.min(Math.max(toInteger(limit, 20), 1), 100);
        const [rows] = await this.db.query(
            `SELECT
                sl.id,
                sl.sync_type,
                rs.code AS status_code,
                rs.label AS status_label,
                sl.started_at,
                sl.finished_at,
                sl.records_total,
                sl.records_processed,
                sl.records_failed,
                sl.message,
                sl.created_by_user_id
             FROM ext_microsip_sync_log sl
             JOIN ref_sync_status rs ON rs.id = sl.status_id
             ORDER BY sl.id DESC
             LIMIT ?`,
            [normalizedLimit]
        );

        return rows;
    }

    async getConnectorHealth() {
        const profile = this.connector.getConnectionProfile();
        if (!profile.enabled) {
            return {
                ok: false,
                mode: 'disabled',
                profile,
                message: 'Integracion Microsip deshabilitada en entorno actual',
            };
        }

        const connectorHealth = await this.connector.healthCheck();
        return {
            ...connectorHealth,
            mode: 'enabled',
        };
    }

    async resolveDepartmentExtId(microsipDepartmentId) {
        const lookupKeys = buildLookupKeys(microsipDepartmentId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.departmentCache.has(key)) {
                return this.departmentCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id, microsip_department_id
             FROM ext_microsip_department
             WHERE microsip_department_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.departmentCache.set(key, extId));
        return extId;
    }

    async resolveJobTitleExtId(microsipJobTitleId) {
        const lookupKeys = buildLookupKeys(microsipJobTitleId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.jobTitleCache.has(key)) {
                return this.jobTitleCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id, microsip_job_title_id
             FROM ext_microsip_job_title
             WHERE microsip_job_title_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.jobTitleCache.set(key, extId));
        return extId;
    }

    async upsertDepartment(payload) {
        const normalized = normalizeDepartmentPayload(payload);
        if (!normalized.microsip_department_id) {
            throw new Error('Departamento sin microsip_department_id');
        }

        await this.db.query(
            `INSERT INTO ext_microsip_department (
                microsip_department_id,
                name,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_department_id,
                normalized.name,
                normalized.is_active ? 1 : 0,
            ]
        );
    }

    async upsertJobTitle(payload) {
        const normalized = normalizeJobTitlePayload(payload);
        if (!normalized.microsip_job_title_id) {
            throw new Error('Puesto sin microsip_job_title_id');
        }

        await this.db.query(
            `INSERT INTO ext_microsip_job_title (
                microsip_job_title_id,
                name,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_job_title_id,
                normalized.name,
                normalized.is_active ? 1 : 0,
            ]
        );
    }

    async upsertEmployee(payload) {
        const normalized = normalizeEmployeePayload(payload);
        if (!normalized.microsip_employee_id) {
            throw new Error('Empleado sin microsip_employee_id');
        }

        const departmentExtId = await this.resolveDepartmentExtId(normalized.department_code);
        const jobTitleExtId = await this.resolveJobTitleExtId(normalized.job_title_code);

        await this.db.query(
            `INSERT INTO ext_microsip_employee (
                microsip_employee_id,
                employee_number,
                first_name,
                last_name,
                department_ext_id,
                job_title_ext_id,
                employment_status,
                hired_at,
                terminated_at,
                source_payload,
                synced_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                employee_number = VALUES(employee_number),
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                department_ext_id = VALUES(department_ext_id),
                job_title_ext_id = VALUES(job_title_ext_id),
                employment_status = VALUES(employment_status),
                hired_at = VALUES(hired_at),
                terminated_at = VALUES(terminated_at),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_employee_id,
                normalized.employee_number,
                normalized.first_name,
                normalized.last_name,
                departmentExtId,
                jobTitleExtId,
                normalized.employment_status,
                normalized.hired_at,
                normalized.terminated_at,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async processCollection(items, upsertFn) {
        let total = 0;
        let processed = 0;
        let failed = 0;

        for (const item of toArray(items)) {
            total += 1;
            try {
                // eslint-disable-next-line no-await-in-loop
                await upsertFn.call(this, item);
                processed += 1;
            } catch {
                failed += 1;
            }
        }

        return { total, processed, failed };
    }

    mergeCounters(base, delta) {
        return {
            total: base.total + delta.total,
            processed: base.processed + delta.processed,
            failed: base.failed + delta.failed,
        };
    }

    async syncDepartments(context = {}) {
        const data = await this.connector.exportDepartments(context);
        return this.processCollection(data, this.upsertDepartment);
    }

    async syncJobTitles(context = {}) {
        const data = await this.connector.exportJobTitles(context);
        return this.processCollection(data, this.upsertJobTitle);
    }

    async syncEmployees(context = {}) {
        const data = await this.connector.exportEmployees(context);
        return this.processCollection(data, this.upsertEmployee);
    }

    async runSync({
        syncType = 'full',
        triggerUserId = null,
        requestId = null,
    }) {
        const normalizedSyncType = ensureSyncType(syncType);
        const running = await this.hasRunningSync(normalizedSyncType);
        if (running) {
            const conflictError = new Error('Ya existe una sincronizacion en progreso para ese tipo');
            conflictError.statusCode = 409;
            conflictError.code = 'MICROSIP_SYNC_ALREADY_RUNNING';
            throw conflictError;
        }

        const logId = await this.createSyncLog(normalizedSyncType, triggerUserId);
        let counters = { total: 0, processed: 0, failed: 0 };

        try {
            if (this.logger) {
                await this.logger.system(triggerUserId, 'MICROSIP_SYNC_STARTED', {
                    sync_type: normalizedSyncType,
                    sync_log_id: logId,
                    request_id: requestId || null,
                });
            }

            if (normalizedSyncType === 'full' || normalizedSyncType === 'departments') {
                const result = await this.syncDepartments({ request_id: requestId });
                counters = this.mergeCounters(counters, result);
            }

            if (normalizedSyncType === 'full' || normalizedSyncType === 'job_titles') {
                const result = await this.syncJobTitles({ request_id: requestId });
                counters = this.mergeCounters(counters, result);
            }

            if (normalizedSyncType === 'full' || normalizedSyncType === 'employees') {
                const result = await this.syncEmployees({ request_id: requestId });
                counters = this.mergeCounters(counters, result);
            }

            const statusCode = counters.failed > 0 ? 'failed' : 'success';
            const message = counters.failed > 0
                ? 'Sincronizacion finalizada con errores parciales'
                : 'Sincronizacion finalizada correctamente';

            await this.updateSyncLog(logId, {
                statusCode,
                recordsTotal: counters.total,
                recordsProcessed: counters.processed,
                recordsFailed: counters.failed,
                message,
            });

            if (this.logger) {
                await this.logger.system(triggerUserId, 'MICROSIP_SYNC_FINISHED', {
                    sync_type: normalizedSyncType,
                    sync_log_id: logId,
                    ...counters,
                    status_code: statusCode,
                    request_id: requestId || null,
                });
            }

            return {
                sync_log_id: logId,
                sync_type: normalizedSyncType,
                status: statusCode,
                ...counters,
            };
        } catch (error) {
            await this.updateSyncLog(logId, {
                statusCode: 'failed',
                recordsTotal: counters.total,
                recordsProcessed: counters.processed,
                recordsFailed: counters.failed + 1,
                message: error?.message || 'Error inesperado durante sincronizacion',
            });

            if (this.logger) {
                await this.logger.error(triggerUserId, 'MICROSIP_SYNC_ERROR', {
                    sync_type: normalizedSyncType,
                    sync_log_id: logId,
                    ...counters,
                    request_id: requestId || null,
                    error: error?.message || null,
                    code: error?.code || null,
                });
            }

            throw error;
        }
    }
}

export const createMicrosipSyncService = (options) => new MicrosipSyncService(options);
