import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { buildRequestContext } from '../utils/RequestContext.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';

const logger = new SystemLogger(pool);

const parseRequiredId = (value) => {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }

    return numericValue;
};

export const uploadDocument = async (req, res) => {
    try {
        const { employee_id, category_id, expiry_date } = req.body;
        const file = req.file;
        const employeeId = parseRequiredId(employee_id);
        const categoryId = parseRequiredId(category_id);

        if (!employeeId || !categoryId) {
            return sendError(res, 400, 'employee_id y category_id son obligatorios', req);
        }

        if (!file) {
            return sendError(res, 400, 'No se recibio archivo', req);
        }

        const [result] = await pool.query(
            'INSERT INTO employee_documents (employee_id, category_id, file_name, file_path, expiry_date) VALUES (?, ?, ?, ?, ?)',
            [employeeId, categoryId, file.originalname, file.path, expiry_date || null]
        );

        res.status(201).json({ id: result.insertId, message: 'Documento cargado correctamente' });

        await logger.business(req.authUser?.id, 'UPLOAD_EMPLOYEE_DOCUMENT', {
            document_id: result.insertId,
            employee_id: employeeId,
            category_id: categoryId,
            file_name: file.originalname,
            ...buildRequestContext(req),
        }, req.ip);

        return undefined;
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_UPLOAD_ERROR',
            message: 'Error al cargar documento',
            details: {
                employee_id: req.body?.employee_id || null,
                category_id: req.body?.category_id || null,
            },
        });
    }
};

export const getEmployeeDocuments = async (req, res) => {
    const employeeId = parseRequiredId(req.params.employeeId);
    if (!employeeId) {
        return sendError(res, 400, 'ID de empleado invalido', req);
    }

    try {
        const [rows] = await pool.query(`
            SELECT ed.*, dc.name as category_name 
            FROM employee_documents ed
            JOIN document_categories dc ON ed.category_id = dc.id
            WHERE ed.employee_id = ?
        `, [employeeId]);

        return res.json(rows);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENTS_FETCH_BY_EMPLOYEE_ERROR',
            message: 'Error al cargar documentos del empleado',
            details: { employee_id: employeeId },
        });
    }
};

export const getExpiryAlerts = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ed.*, e.first_name, e.last_name, dc.name as category_name
            FROM employee_documents ed
            JOIN employees e ON ed.employee_id = e.id
            JOIN document_categories dc ON ed.category_id = dc.id
            WHERE ed.expiry_date IS NOT NULL 
            AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
            ORDER BY ed.expiry_date ASC
        `);

        return res.json(rows);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_EXPIRY_ALERTS_ERROR',
            message: 'Error al cargar alertas de vencimiento',
        });
    }
};
