import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { buildRequestContext } from '../utils/RequestContext.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';

const logger = new SystemLogger(pool);

const DOCUMENT_STATUS = Object.freeze({
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
});

const REVIEW_STATUS_SET = new Set([DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.REJECTED]);

const parseRequiredId = (value) => {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return null;
    }

    return numericValue;
};

const parseOptionalId = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return parseRequiredId(value);
};

const normalizeStatusCode = (value, fallback = null) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || fallback;
};

const normalizeText = (value, fallback = null) => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const hasPermission = (authUser, permissionCode) => (
    Array.isArray(authUser?.permissions)
    && authUser.permissions.some((code) => String(code || '').trim().toLowerCase() === permissionCode)
);

const canAccessAnyEmployeeDocument = (authUser) => (
    hasPermission(authUser, 'validate_documents')
    || hasPermission(authUser, 'view_employees')
    || hasPermission(authUser, 'manage_documents')
);

const resolveAuthEmployeeId = (authUser) => parseOptionalId(authUser?.employee_id);

const resolveComputedStatusSql = () => `
    CASE
      WHEN ed.status_code = 'rejected' THEN 'rejected'
      WHEN ed.status_code IN ('pending', 'approved')
        AND ed.expiry_date IS NOT NULL
        AND ed.expiry_date < CURDATE() THEN 'expired'
      ELSE ed.status_code
    END
`;

const listCategories = async () => {
    const [rows] = await pool.query(
        `SELECT id, name
         FROM document_categories
         ORDER BY name ASC`
    );

    return rows;
};

const getDocumentById = async (documentId) => {
    const [rows] = await pool.query(
        `SELECT
            ed.id,
            ed.employee_id,
            ed.category_id,
            ed.file_name,
            ed.file_path,
            ed.expiry_date,
            ed.status_code,
            ed.review_note,
            ed.reviewed_by_user_id,
            ed.reviewed_at,
            ed.uploaded_by_user_id,
            ed.created_at,
            ed.updated_at,
            dc.name AS category_name,
            e.internal_id AS employee_internal_id,
            CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
            reviewer.email AS reviewed_by_email,
            uploader.email AS uploaded_by_email
         FROM employee_documents ed
         JOIN document_categories dc ON dc.id = ed.category_id
         JOIN employees e ON e.id = ed.employee_id
         LEFT JOIN users reviewer ON reviewer.id = ed.reviewed_by_user_id
         LEFT JOIN users uploader ON uploader.id = ed.uploaded_by_user_id
         WHERE ed.id = ?
         LIMIT 1`,
        [documentId]
    );

    return rows[0] || null;
};

const mapDocumentRow = (row) => ({
    id: row.id,
    employee_id: row.employee_id,
    employee_internal_id: row.employee_internal_id,
    employee_name: row.employee_name,
    category_id: row.category_id,
    category_name: row.category_name,
    file_name: row.file_name,
    file_path: row.file_path,
    expiry_date: row.expiry_date,
    status_code: row.status_code,
    effective_status_code: row.effective_status_code || row.status_code,
    review_note: row.review_note,
    reviewed_by_user_id: row.reviewed_by_user_id,
    reviewed_by_email: row.reviewed_by_email || null,
    reviewed_at: row.reviewed_at,
    uploaded_by_user_id: row.uploaded_by_user_id,
    uploaded_by_email: row.uploaded_by_email || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

const buildCategorySummary = (categories, documents) => {
    const latestByCategory = new Map();

    for (const document of documents) {
        const current = latestByCategory.get(document.category_id);
        if (!current) {
            latestByCategory.set(document.category_id, document);
            continue;
        }

        const currentDate = new Date(current.created_at || 0).getTime();
        const candidateDate = new Date(document.created_at || 0).getTime();
        if (candidateDate >= currentDate) {
            latestByCategory.set(document.category_id, document);
        }
    }

    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        latest_document: latestByCategory.get(category.id) || null,
    }));
};

export const listDocumentCategories = async (req, res) => {
    try {
        const categories = await listCategories();
        return res.json({ data: categories });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_CATEGORIES_FETCH_ERROR',
            message: 'Error al cargar categorias de documentos',
        });
    }
};

export const uploadMyDocument = async (req, res) => {
    const employeeId = resolveAuthEmployeeId(req.authUser);
    if (!employeeId) {
        return sendError(res, 400, 'No existe empleado asociado a la sesion', req);
    }

    const categoryId = parseRequiredId(req.body?.category_id);
    const file = req.file;
    const expiryDate = normalizeText(req.body?.expiry_date);
    const normalizedExpiryDate = expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ? expiryDate : null;

    if (!categoryId) {
        return sendError(res, 400, 'category_id es obligatorio', req);
    }

    if (!file) {
        return sendError(res, 400, 'No se recibio archivo', req);
    }

    try {
        const [categoryRows] = await pool.query(
            'SELECT id FROM document_categories WHERE id = ? LIMIT 1',
            [categoryId]
        );

        if (!categoryRows.length) {
            return sendError(res, 404, 'Categoria de documento no encontrada', req);
        }

        const [result] = await pool.query(
            `INSERT INTO employee_documents (
                employee_id,
                category_id,
                file_name,
                file_path,
                expiry_date,
                status_code,
                uploaded_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                employeeId,
                categoryId,
                file.originalname,
                file.path,
                normalizedExpiryDate,
                DOCUMENT_STATUS.PENDING,
                req.authUser?.id || null,
            ]
        );

        const createdDocument = await getDocumentById(result.insertId);

        await logger.business(req.authUser?.id, 'UPLOAD_SELF_SERVICE_DOCUMENT', {
            document_id: result.insertId,
            employee_id: employeeId,
            category_id: categoryId,
            file_name: file.originalname,
            ...buildRequestContext(req),
        }, req.ip);

        return res.status(201).json({
            message: 'Documento cargado correctamente',
            data: createdDocument ? mapDocumentRow(createdDocument) : null,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_UPLOAD_SELF_SERVICE_ERROR',
            message: 'Error al cargar documento',
            details: {
                employee_id: employeeId,
                category_id: categoryId,
            },
        });
    }
};

export const getMyDocuments = async (req, res) => {
    const employeeId = resolveAuthEmployeeId(req.authUser);
    if (!employeeId) {
        return sendError(res, 400, 'No existe empleado asociado a la sesion', req);
    }

    try {
        const [documents] = await pool.query(
            `SELECT
                ed.*,
                dc.name AS category_name,
                reviewer.email AS reviewed_by_email,
                uploader.email AS uploaded_by_email,
                ${resolveComputedStatusSql()} AS effective_status_code
             FROM employee_documents ed
             JOIN document_categories dc ON ed.category_id = dc.id
             LEFT JOIN users reviewer ON reviewer.id = ed.reviewed_by_user_id
             LEFT JOIN users uploader ON uploader.id = ed.uploaded_by_user_id
             WHERE ed.employee_id = ?
             ORDER BY ed.created_at DESC, ed.id DESC`,
            [employeeId]
        );

        const categories = await listCategories();
        const mappedDocuments = documents.map(mapDocumentRow);
        const categorySummary = buildCategorySummary(categories, mappedDocuments);

        const metrics = mappedDocuments.reduce((acc, document) => {
            acc.total += 1;
            const key = normalizeStatusCode(document.effective_status_code, DOCUMENT_STATUS.PENDING);
            acc.by_status[key] = (acc.by_status[key] || 0) + 1;
            return acc;
        }, {
            total: 0,
            by_status: {
                [DOCUMENT_STATUS.PENDING]: 0,
                [DOCUMENT_STATUS.APPROVED]: 0,
                [DOCUMENT_STATUS.REJECTED]: 0,
                [DOCUMENT_STATUS.EXPIRED]: 0,
            },
        });

        return res.json({
            data: {
                employee_id: employeeId,
                categories: categorySummary,
                documents: mappedDocuments,
                metrics,
            },
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MY_DOCUMENTS_FETCH_ERROR',
            message: 'Error al cargar Mis Documentos',
            details: { employee_id: employeeId },
        });
    }
};

export const getEmployeeDocuments = async (req, res) => {
    const employeeId = parseRequiredId(req.params.employeeId);
    if (!employeeId) {
        return sendError(res, 400, 'ID de empleado invalido', req);
    }

    try {
        const [rows] = await pool.query(
            `SELECT
                ed.*,
                dc.name AS category_name,
                reviewer.email AS reviewed_by_email,
                uploader.email AS uploaded_by_email,
                ${resolveComputedStatusSql()} AS effective_status_code
             FROM employee_documents ed
             JOIN document_categories dc ON ed.category_id = dc.id
             LEFT JOIN users reviewer ON reviewer.id = ed.reviewed_by_user_id
             LEFT JOIN users uploader ON uploader.id = ed.uploaded_by_user_id
             WHERE ed.employee_id = ?
             ORDER BY ed.created_at DESC, ed.id DESC`,
            [employeeId]
        );

        return res.json({
            data: rows.map(mapDocumentRow),
            meta: { employee_id: employeeId },
        });
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

export const getValidationQueue = async (req, res) => {
    const statusFilter = normalizeStatusCode(req.query.status);
    const employeeIdFilter = parseOptionalId(req.query.employee_id);
    const categoryIdFilter = parseOptionalId(req.query.category_id);
    const expiringInDays = parseOptionalId(req.query.expiring_in_days);

    const whereClauses = [];
    const queryParams = [];
    const computedStatusSql = resolveComputedStatusSql();

    if (statusFilter) {
        whereClauses.push(`${computedStatusSql} = ?`);
        queryParams.push(statusFilter);
    }

    if (employeeIdFilter) {
        whereClauses.push('ed.employee_id = ?');
        queryParams.push(employeeIdFilter);
    }

    if (categoryIdFilter) {
        whereClauses.push('ed.category_id = ?');
        queryParams.push(categoryIdFilter);
    }

    if (expiringInDays) {
        whereClauses.push('ed.expiry_date IS NOT NULL');
        whereClauses.push('ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)');
        queryParams.push(expiringInDays);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    try {
        const [rows] = await pool.query(
            `SELECT
                ed.*,
                dc.name AS category_name,
                e.internal_id AS employee_internal_id,
                CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
                reviewer.email AS reviewed_by_email,
                uploader.email AS uploaded_by_email,
                ${computedStatusSql} AS effective_status_code
             FROM employee_documents ed
             JOIN document_categories dc ON ed.category_id = dc.id
             JOIN employees e ON e.id = ed.employee_id
             LEFT JOIN users reviewer ON reviewer.id = ed.reviewed_by_user_id
             LEFT JOIN users uploader ON uploader.id = ed.uploaded_by_user_id
             ${whereSql}
             ORDER BY
                CASE ${computedStatusSql}
                  WHEN 'pending' THEN 0
                  WHEN 'expired' THEN 1
                  WHEN 'rejected' THEN 2
                  ELSE 3
                END ASC,
                ed.created_at DESC,
                ed.id DESC`,
            queryParams
        );

        const mapped = rows.map(mapDocumentRow);
        return res.json({
            data: mapped,
            meta: {
                total: mapped.length,
                filters: {
                    status: statusFilter || null,
                    employee_id: employeeIdFilter,
                    category_id: categoryIdFilter,
                    expiring_in_days: expiringInDays,
                },
            },
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_VALIDATION_QUEUE_FETCH_ERROR',
            message: 'Error al cargar bandeja de validacion documental',
            details: {
                status_filter: statusFilter || null,
                employee_id: employeeIdFilter,
                category_id: categoryIdFilter,
            },
        });
    }
};

export const reviewEmployeeDocument = async (req, res) => {
    const documentId = parseRequiredId(req.params.documentId);
    if (!documentId) {
        return sendError(res, 400, 'ID de documento invalido', req);
    }

    const nextStatus = normalizeStatusCode(req.body?.status_code);
    if (!REVIEW_STATUS_SET.has(nextStatus)) {
        return sendError(res, 400, 'status_code invalido. Usa approved o rejected', req);
    }

    const reviewNote = normalizeText(req.body?.review_note);

    try {
        const existing = await getDocumentById(documentId);
        if (!existing) {
            return sendError(res, 404, 'Documento no encontrado', req);
        }

        await pool.query(
            `UPDATE employee_documents
             SET status_code = ?,
                 review_note = ?,
                 reviewed_by_user_id = ?,
                 reviewed_at = NOW()
             WHERE id = ?`,
            [nextStatus, reviewNote, req.authUser?.id || null, documentId]
        );

        const updated = await getDocumentById(documentId);
        const mapped = updated ? mapDocumentRow(updated) : null;

        await logger.business(req.authUser?.id, 'REVIEW_EMPLOYEE_DOCUMENT', {
            document_id: documentId,
            employee_id: existing.employee_id,
            previous_status_code: existing.status_code,
            status_code: nextStatus,
            review_note: reviewNote,
            ...buildRequestContext(req),
        }, req.ip);

        await logger.business(req.authUser?.id, 'NOTIFY_DOCUMENT_STATUS_CHANGE', {
            employee_id: existing.employee_id,
            document_id: documentId,
            status_code: nextStatus,
            review_note: reviewNote,
            notification_channel: 'in_app_pending',
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Revision de documento aplicada',
            data: mapped,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_REVIEW_ERROR',
            message: 'Error al revisar documento',
            details: {
                document_id: documentId,
                status_code: nextStatus,
            },
        });
    }
};

export const downloadDocument = async (req, res) => {
    const documentId = parseRequiredId(req.params.documentId);
    if (!documentId) {
        return sendError(res, 400, 'ID de documento invalido', req);
    }

    try {
        const document = await getDocumentById(documentId);
        if (!document) {
            return sendError(res, 404, 'Documento no encontrado', req);
        }

        const authEmployeeId = resolveAuthEmployeeId(req.authUser);
        const canAccessAny = canAccessAnyEmployeeDocument(req.authUser);
        const isOwner = authEmployeeId && Number(document.employee_id) === Number(authEmployeeId);

        if (!canAccessAny && !isOwner) {
            return sendError(res, 403, 'No autorizado para descargar este documento', req);
        }

        const absolutePath = path.resolve(document.file_path);
        if (!fs.existsSync(absolutePath)) {
            return sendError(res, 404, 'Archivo no disponible en almacenamiento', req);
        }

        await logger.business(req.authUser?.id, 'DOWNLOAD_EMPLOYEE_DOCUMENT', {
            document_id: documentId,
            employee_id: document.employee_id,
            file_name: document.file_name,
            ...buildRequestContext(req),
        }, req.ip);

        return res.download(absolutePath, document.file_name);
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_DOWNLOAD_ERROR',
            message: 'Error al descargar documento',
            details: { document_id: documentId },
        });
    }
};

export const getExpiryAlerts = async (req, res) => {
    const days = parseOptionalId(req.query.days) || 90;

    try {
        const [rows] = await pool.query(
            `SELECT
                ed.*,
                dc.name AS category_name,
                e.internal_id AS employee_internal_id,
                CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
                ${resolveComputedStatusSql()} AS effective_status_code
             FROM employee_documents ed
             JOIN employees e ON e.id = ed.employee_id
             JOIN document_categories dc ON dc.id = ed.category_id
             WHERE ed.expiry_date IS NOT NULL
               AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
               AND ed.status_code <> 'rejected'
             ORDER BY ed.expiry_date ASC, ed.id DESC`,
            [days]
        );

        return res.json({
            data: rows.map(mapDocumentRow),
            meta: { days },
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'DOCUMENT_EXPIRY_ALERTS_ERROR',
            message: 'Error al cargar alertas de vencimiento',
            details: { days },
        });
    }
};
