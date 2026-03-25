const DEFAULT_LIMIT = 500;

const normalizeText = (value, fallback = null) => {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
};

const toInteger = (value, fallback = null) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
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

const buildInitialSummary = (options) => ({
    options,
    scanned: 0,
    already_linked: 0,
    linked_now: 0,
    would_link_now: 0,
    internal_employees_created: 0,
    would_create_internal_employees: 0,
    employee_jobs_created: 0,
    would_create_employee_jobs: 0,
    skipped_without_employee_number: 0,
    skipped_missing_internal_employee: 0,
    conflicts: 0,
    failures: 0,
    samples: {
        skipped_without_employee_number: [],
        missing_internal_employee: [],
        conflicts: [],
        failures: [],
    },
});

const pushSample = (bucket, sample, max = 20) => {
    if (!Array.isArray(bucket) || bucket.length >= max) {
        return;
    }

    bucket.push(sample);
};

export class MicrosipLinkReconciliationService {
    constructor({ db, logger = null }) {
        this.db = db;
        this.logger = logger;
        this.departmentCache = new Map();
        this.positionCache = new Map();
    }

    normalizeOptions(input = {}) {
        const limit = Math.min(Math.max(toInteger(input.limit, DEFAULT_LIMIT), 1), 5000);
        const dryRun = toBoolean(input.dry_run, true);
        const createMissingEmployees = toBoolean(input.create_missing_employees, true);
        const createMissingJobs = toBoolean(input.create_missing_jobs, true);

        return {
            dry_run: dryRun,
            create_missing_employees: createMissingEmployees,
            create_missing_jobs: createMissingJobs,
            limit,
        };
    }

    async listExtEmployees(limit) {
        const normalizedLimit = Math.min(Math.max(toInteger(limit, DEFAULT_LIMIT), 1), 5000);
        const [rows] = await this.db.query(
            `SELECT
                ext.id AS employee_ext_id,
                ext.microsip_employee_id,
                ext.employee_number,
                ext.first_name,
                ext.last_name,
                ext.hired_at,
                dep.name AS department_name,
                jt.name AS job_title_name,
                comp.salary_daily,
                link.id AS existing_link_id
             FROM ext_microsip_employee ext
             LEFT JOIN ext_microsip_department dep ON dep.id = ext.department_ext_id
             LEFT JOIN ext_microsip_job_title jt ON jt.id = ext.job_title_ext_id
             LEFT JOIN ext_microsip_employee_compensation comp ON comp.employee_ext_id = ext.id
             LEFT JOIN employee_microsip_links link ON link.microsip_employee_ext_id = ext.id
             ORDER BY ext.id ASC
             LIMIT ?`,
            [normalizedLimit]
        );

        return rows;
    }

    async findInternalEmployeeByInternalId(connection, internalId) {
        const [rows] = await connection.query(
            `SELECT id
             FROM employees
             WHERE internal_id = ?
             LIMIT 1`,
            [internalId]
        );

        return rows[0] ? Number(rows[0].id) : null;
    }

    async findExistingLinkByEmployeeId(connection, employeeId) {
        const [rows] = await connection.query(
            `SELECT id, microsip_employee_ext_id
             FROM employee_microsip_links
             WHERE employee_id = ?
             LIMIT 1`,
            [employeeId]
        );

        return rows[0] || null;
    }

    async findExistingLinkByExtId(connection, employeeExtId) {
        const [rows] = await connection.query(
            `SELECT id, employee_id
             FROM employee_microsip_links
             WHERE microsip_employee_ext_id = ?
             LIMIT 1`,
            [employeeExtId]
        );

        return rows[0] || null;
    }

    async ensureDepartmentId(connection, departmentName) {
        const normalizedName = normalizeText(departmentName);
        if (!normalizedName) {
            return null;
        }

        if (this.departmentCache.has(normalizedName)) {
            return this.departmentCache.get(normalizedName);
        }

        await connection.query(
            `INSERT INTO departments (name)
             VALUES (?)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [normalizedName]
        );

        const [idRows] = await connection.query('SELECT LAST_INSERT_ID() AS id');
        const departmentId = idRows[0] ? Number(idRows[0].id) : null;

        this.departmentCache.set(normalizedName, departmentId);
        return departmentId;
    }

    async ensurePositionId(connection, positionName) {
        const normalizedName = normalizeText(positionName);
        if (!normalizedName) {
            return null;
        }

        if (this.positionCache.has(normalizedName)) {
            return this.positionCache.get(normalizedName);
        }

        await connection.query(
            `INSERT INTO positions (name)
             VALUES (?)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [normalizedName]
        );

        const [idRows] = await connection.query('SELECT LAST_INSERT_ID() AS id');
        const positionId = idRows[0] ? Number(idRows[0].id) : null;

        this.positionCache.set(normalizedName, positionId);
        return positionId;
    }

    async createInternalEmployee(connection, extEmployee) {
        const internalId = normalizeText(extEmployee.employee_number);
        const [result] = await connection.query(
            `INSERT INTO employees (internal_id)
             VALUES (?)`,
            [internalId]
        );

        return Number(result.insertId);
    }

    async ensureActiveEmployeeJob(connection, employeeId, extEmployee) {
        const [existingRows] = await connection.query(
            `SELECT id
             FROM employee_jobs
             WHERE employee_id = ?
               AND current_job_flag = 1
             LIMIT 1`,
            [employeeId]
        );

        if (existingRows.length > 0) {
            return false;
        }

        const departmentId = await this.ensureDepartmentId(connection, extEmployee.department_name);
        const positionId = await this.ensurePositionId(connection, extEmployee.job_title_name);

        await connection.query(
            `INSERT INTO employee_jobs (
                employee_id,
                department_id,
                position_id,
                manager_id,
                start_date,
                end_date,
                schedule,
                salary,
                currency,
                current_job_flag
            ) VALUES (?, ?, ?, NULL, ?, NULL, NULL, ?, 'MXN', 1)`,
            [
                employeeId,
                departmentId,
                positionId,
                extEmployee.hired_at || null,
                extEmployee.salary_daily || null,
            ]
        );

        return true;
    }

    async linkEmployee(connection, employeeId, employeeExtId) {
        await connection.query(
            `INSERT INTO employee_microsip_links (
                employee_id,
                microsip_employee_ext_id,
                link_source,
                linked_at
            ) VALUES (?, ?, 'reconcile_employee_number', CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                employee_id = VALUES(employee_id),
                microsip_employee_ext_id = VALUES(microsip_employee_ext_id),
                link_source = VALUES(link_source),
                updated_at = CURRENT_TIMESTAMP`,
            [employeeId, employeeExtId]
        );

        // Keep canonical source in Microsip for linked employees.
        await connection.query(
            `DELETE FROM employee_axis_identity
             WHERE employee_id = ?`,
            [employeeId]
        );
    }

    async reconcileOneDryRun(summary, extEmployee, options) {
        if (extEmployee.existing_link_id) {
            summary.already_linked += 1;
            return;
        }

        const employeeNumber = normalizeText(extEmployee.employee_number);
        if (!employeeNumber) {
            summary.skipped_without_employee_number += 1;
            pushSample(summary.samples.skipped_without_employee_number, {
                microsip_employee_id: extEmployee.microsip_employee_id,
                employee_ext_id: extEmployee.employee_ext_id,
            });
            return;
        }

        const internalEmployeeId = await this.findInternalEmployeeByInternalId(this.db, employeeNumber);
        if (!internalEmployeeId) {
            if (!options.create_missing_employees) {
                summary.skipped_missing_internal_employee += 1;
                pushSample(summary.samples.missing_internal_employee, {
                    employee_number: employeeNumber,
                    microsip_employee_id: extEmployee.microsip_employee_id,
                });
                return;
            }

            summary.would_create_internal_employees += 1;
            if (options.create_missing_jobs) {
                summary.would_create_employee_jobs += 1;
            }
            summary.would_link_now += 1;
            return;
        }

        const existingEmployeeLink = await this.findExistingLinkByEmployeeId(this.db, internalEmployeeId);
        if (existingEmployeeLink && Number(existingEmployeeLink.microsip_employee_ext_id) !== Number(extEmployee.employee_ext_id)) {
            summary.conflicts += 1;
            pushSample(summary.samples.conflicts, {
                employee_id: internalEmployeeId,
                employee_number: employeeNumber,
                existing_ext_id: Number(existingEmployeeLink.microsip_employee_ext_id),
                attempted_ext_id: Number(extEmployee.employee_ext_id),
            });
            return;
        }

        summary.would_link_now += 1;
    }

    async reconcileOneApply(summary, extEmployee, options) {
        if (extEmployee.existing_link_id) {
            summary.already_linked += 1;
            return;
        }

        const employeeNumber = normalizeText(extEmployee.employee_number);
        if (!employeeNumber) {
            summary.skipped_without_employee_number += 1;
            pushSample(summary.samples.skipped_without_employee_number, {
                microsip_employee_id: extEmployee.microsip_employee_id,
                employee_ext_id: extEmployee.employee_ext_id,
            });
            return;
        }

        const connection = await this.db.getConnection();
        let transactionStarted = false;

        try {
            await connection.beginTransaction();
            transactionStarted = true;

            let internalEmployeeId = await this.findInternalEmployeeByInternalId(connection, employeeNumber);
            if (!internalEmployeeId) {
                if (!options.create_missing_employees) {
                    summary.skipped_missing_internal_employee += 1;
                    pushSample(summary.samples.missing_internal_employee, {
                        employee_number: employeeNumber,
                        microsip_employee_id: extEmployee.microsip_employee_id,
                    });
                    await connection.rollback();
                    return;
                }

                internalEmployeeId = await this.createInternalEmployee(connection, extEmployee);
                summary.internal_employees_created += 1;
            }

            const existingEmployeeLink = await this.findExistingLinkByEmployeeId(connection, internalEmployeeId);
            if (existingEmployeeLink && Number(existingEmployeeLink.microsip_employee_ext_id) !== Number(extEmployee.employee_ext_id)) {
                summary.conflicts += 1;
                pushSample(summary.samples.conflicts, {
                    employee_id: internalEmployeeId,
                    employee_number: employeeNumber,
                    existing_ext_id: Number(existingEmployeeLink.microsip_employee_ext_id),
                    attempted_ext_id: Number(extEmployee.employee_ext_id),
                });
                await connection.rollback();
                return;
            }

            const existingExtLink = await this.findExistingLinkByExtId(connection, Number(extEmployee.employee_ext_id));
            if (existingExtLink && Number(existingExtLink.employee_id) !== Number(internalEmployeeId)) {
                summary.conflicts += 1;
                pushSample(summary.samples.conflicts, {
                    employee_id: Number(existingExtLink.employee_id),
                    employee_number: employeeNumber,
                    existing_ext_id: Number(extEmployee.employee_ext_id),
                    attempted_employee_id: Number(internalEmployeeId),
                });
                await connection.rollback();
                return;
            }

            if (options.create_missing_jobs) {
                const jobCreated = await this.ensureActiveEmployeeJob(connection, internalEmployeeId, extEmployee);
                if (jobCreated) {
                    summary.employee_jobs_created += 1;
                }
            }

            await this.linkEmployee(connection, internalEmployeeId, Number(extEmployee.employee_ext_id));
            summary.linked_now += 1;

            await connection.commit();
            transactionStarted = false;
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }

            summary.failures += 1;
            pushSample(summary.samples.failures, {
                employee_number: employeeNumber,
                employee_ext_id: Number(extEmployee.employee_ext_id),
                message: normalizeText(error?.message, 'Error no especificado'),
            });
        } finally {
            connection.release();
        }
    }

    async reconcileLinks(rawOptions = {}) {
        const options = this.normalizeOptions(rawOptions);
        const summary = buildInitialSummary(options);
        const extEmployees = await this.listExtEmployees(options.limit);

        if (this.logger) {
            await this.logger.system(rawOptions.trigger_user_id || null, 'MICROSIP_LINK_RECONCILE_STARTED', {
                options,
                request_id: rawOptions.request_id || null,
            });
        }

        for (const extEmployee of extEmployees) {
            summary.scanned += 1;
            if (options.dry_run) {
                // eslint-disable-next-line no-await-in-loop
                await this.reconcileOneDryRun(summary, extEmployee, options);
            } else {
                // eslint-disable-next-line no-await-in-loop
                await this.reconcileOneApply(summary, extEmployee, options);
            }
        }

        if (this.logger) {
            await this.logger.system(rawOptions.trigger_user_id || null, 'MICROSIP_LINK_RECONCILE_FINISHED', {
                ...summary,
                request_id: rawOptions.request_id || null,
            });
        }

        return summary;
    }
}

export const createMicrosipLinkReconciliationService = (options) => new MicrosipLinkReconciliationService(options);
