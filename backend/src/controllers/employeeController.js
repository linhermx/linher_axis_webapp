import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { buildRequestContext } from '../utils/RequestContext.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';

const logger = new SystemLogger(pool);

const parseOptionalId = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }

    return numericValue;
};

const parseRequiredId = (value) => {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }

    return numericValue;
};

const normalizeText = (value) => String(value || '').trim();

export const getAllEmployees = async (req, res) => {
    try {
        const [employees] = await pool.query(`
            SELECT
                e.id,
                e.user_id,
                e.internal_id,
                COALESCE(NULLIF(TRIM(ext.first_name), ''), NULLIF(TRIM(ai.first_name), '')) AS first_name,
                COALESCE(NULLIF(TRIM(ext.last_name), ''), NULLIF(TRIM(ai.last_name), '')) AS last_name,
                COALESCE(personal.birth_date, ai.birth_date) AS birth_date,
                COALESCE(NULLIF(TRIM(personal.sex_code), ''), NULLIF(TRIM(ai.gender), '')) AS gender,
                ext.employment_status,
                ext.employee_number AS microsip_employee_number,
                CASE
                    WHEN ext.id IS NOT NULL THEN 'microsip'
                    WHEN ai.employee_id IS NOT NULL THEN 'axis_fallback'
                    ELSE 'axis_unresolved'
                END AS canonical_source,
                d.name AS department_name,
                p.name AS position_name,
                personal.sex_code AS sex_code,
                CASE
                    WHEN UPPER(TRIM(COALESCE(personal.sex_code, ai.gender, ''))) IN ('F', 'FEMENINO', 'FEMALE') THEN 'Femenino'
                    WHEN UPPER(TRIM(COALESCE(personal.sex_code, ai.gender, ''))) IN ('M', 'MASCULINO', 'MALE') THEN 'Masculino'
                    ELSE NULL
                END AS gender_label
            FROM employees e
            LEFT JOIN employee_jobs ej ON e.id = ej.employee_id AND ej.current_job_flag = 1
            LEFT JOIN departments d ON ej.department_id = d.id
            LEFT JOIN positions p ON ej.position_id = p.id
            LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
            LEFT JOIN ext_microsip_employee ext ON ext.id = eml.microsip_employee_ext_id
            LEFT JOIN ext_microsip_employee_personal personal ON personal.employee_ext_id = eml.microsip_employee_ext_id
            LEFT JOIN employee_axis_identity ai ON ai.employee_id = e.id
        `);
        return res.json(employees);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'EMPLOYEES_LIST_ERROR',
            message: 'Error al cargar empleados',
        });
    }
};

export const createEmployee = async (req, res) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        const internalId = normalizeText(req.body?.internal_id);
        const firstName = normalizeText(req.body?.first_name);
        const lastName = normalizeText(req.body?.last_name);

        if (!internalId || !firstName || !lastName) {
            return sendError(res, 400, 'internal_id, first_name y last_name son obligatorios', req);
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const {
            birth_date, gender,
            department_id, position_id, manager_id, start_date, schedule, salary
        } = req.body;

        const [empResult] = await connection.query(
            'INSERT INTO employees (internal_id) VALUES (?)',
            [internalId]
        );
        const employeeId = empResult.insertId;

        await connection.query(
            `INSERT INTO employee_axis_identity (employee_id, first_name, last_name, birth_date, gender)
             VALUES (?, ?, ?, ?, ?)`,
            [employeeId, firstName, lastName, birth_date || null, gender || null]
        );

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
                current_job_flag
            ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 1)`,
            [
                employeeId,
                parseOptionalId(department_id),
                parseOptionalId(position_id),
                parseOptionalId(manager_id),
                start_date || null,
                schedule || null,
                salary || null,
            ]
        );

        await connection.commit();
        transactionStarted = false;

        res.status(201).json({ id: employeeId, message: 'Empleado creado correctamente' });

        await logger.business(req.authUser?.id, 'CREATE_EMPLOYEE', {
            employee_id: employeeId,
            internal_id: internalId,
            first_name: firstName,
            last_name: lastName,
            ...buildRequestContext(req),
        }, req.ip);

        return undefined;
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        if (error?.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'El empleado ya existe con ese ID interno o usuario asociado', req);
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'EMPLOYEE_CREATE_ERROR',
            message: 'Error al crear empleado',
            details: { internal_id: req.body?.internal_id || null },
        });
    } finally {
        connection.release();
    }
};

export const getEmployeeById = async (req, res) => {
    const employeeId = parseRequiredId(req.params.id);
    if (!employeeId) {
        return sendError(res, 400, 'ID de empleado invalido', req);
    }

    try {
        const [rows] = await pool.query(`
            SELECT
                e.id,
                e.user_id,
                e.internal_id,
                COALESCE(NULLIF(TRIM(ext.first_name), ''), NULLIF(TRIM(ai.first_name), '')) AS first_name,
                COALESCE(NULLIF(TRIM(ext.last_name), ''), NULLIF(TRIM(ai.last_name), '')) AS last_name,
                COALESCE(personal.birth_date, ai.birth_date) AS birth_date,
                COALESCE(NULLIF(TRIM(personal.sex_code), ''), NULLIF(TRIM(ai.gender), '')) AS gender,
                ext.employment_status,
                ext.employee_number AS microsip_employee_number,
                ej.department_id,
                ej.position_id,
                ej.manager_id,
                ej.start_date,
                ej.end_date,
                ej.schedule,
                ej.salary,
                ej.currency
            FROM employees e
            LEFT JOIN employee_jobs ej ON e.id = ej.employee_id AND ej.current_job_flag = 1
            LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
            LEFT JOIN ext_microsip_employee ext ON ext.id = eml.microsip_employee_ext_id
            LEFT JOIN ext_microsip_employee_personal personal ON personal.employee_ext_id = eml.microsip_employee_ext_id
            LEFT JOIN employee_axis_identity ai ON ai.employee_id = e.id
            WHERE e.id = ?
        `, [employeeId]);

        if (rows.length === 0) {
            return sendError(res, 404, 'Empleado no encontrado', req);
        }

        return res.json(rows[0]);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'EMPLOYEE_FETCH_ERROR',
            message: 'Error al cargar empleado',
            details: { employee_id: employeeId },
        });
    }
};
