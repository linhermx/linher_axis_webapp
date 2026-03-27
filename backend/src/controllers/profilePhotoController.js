import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { buildRequestContext } from '../utils/RequestContext.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';

const logger = new SystemLogger(pool);

const PHOTO_EXTENSION_MAP = Object.freeze({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
});

const getUploadsRootPath = () => path.resolve(
    process.env.UPLOADS_STORAGE_PATH
    || process.env.DOCS_STORAGE_PATH
    || './src/uploads'
);

const toNumericId = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const normalizeText = (value, fallback = null) => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const toSafeStoredPath = (value) => String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');

const buildPhotoUrl = (req, storedPath) => {
    const normalizedStoredPath = toSafeStoredPath(storedPath);
    if (!normalizedStoredPath) {
        return null;
    }

    if (/^https?:\/\//i.test(normalizedStoredPath) || normalizedStoredPath.startsWith('data:')) {
        return normalizedStoredPath;
    }

    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
        ? forwardedProtoHeader[0]
        : String(forwardedProtoHeader || '').split(',')[0];
    const protocol = normalizeText(forwardedProto) || req.protocol || 'http';
    const host = req.get('host');

    if (!host) {
        return `/${normalizedStoredPath}`;
    }

    return `${protocol}://${host}/${normalizedStoredPath}`;
};

const resolveStoredPhotoAbsolutePath = (storedPath) => {
    const normalizedStoredPath = toSafeStoredPath(storedPath);
    if (!normalizedStoredPath) {
        return null;
    }

    const uploadsRootPath = getUploadsRootPath();
    const normalizedPrefix = 'uploads/';
    if (!normalizedStoredPath.startsWith(normalizedPrefix)) {
        return null;
    }

    const relativeToRoot = normalizedStoredPath.slice(normalizedPrefix.length);
    const absolutePath = path.resolve(uploadsRootPath, relativeToRoot);
    const safeRoot = path.resolve(uploadsRootPath);

    if (!absolutePath.startsWith(safeRoot)) {
        return null;
    }

    return absolutePath;
};

const removeStoredPhotoFile = async (storedPath) => {
    const absolutePath = resolveStoredPhotoAbsolutePath(storedPath);
    if (!absolutePath) {
        return;
    }

    try {
        await fs.promises.unlink(absolutePath);
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
};

const createStoredPhotoFile = async ({ userId, file }) => {
    const normalizedUserId = toNumericId(userId);
    if (!normalizedUserId) {
        throw new Error('PROFILE_PHOTO_INVALID_USER');
    }

    const mimeType = normalizeText(file?.mimetype, '').toLowerCase();
    const extension = PHOTO_EXTENSION_MAP[mimeType];
    if (!extension) {
        throw new Error('PROFILE_PHOTO_INVALID_TYPE');
    }

    const uploadsRootPath = getUploadsRootPath();
    const userDirectory = path.resolve(uploadsRootPath, 'users', String(normalizedUserId));
    await fs.promises.mkdir(userDirectory, { recursive: true });

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const absolutePath = path.resolve(userDirectory, fileName);
    await fs.promises.writeFile(absolutePath, file.buffer);

    return {
        absolutePath,
        storedPath: `uploads/users/${normalizedUserId}/${fileName}`,
    };
};

const findEmployeeIdByUserId = async (connection, userId) => {
    const normalizedUserId = toNumericId(userId);
    if (!normalizedUserId) {
        return null;
    }

    const [rows] = await connection.query(
        `SELECT id
         FROM employees
         WHERE user_id = ?
         LIMIT 1`,
        [normalizedUserId]
    );

    return toNumericId(rows?.[0]?.id);
};

const resolveSessionEmployeeId = async (connection, authUser) => {
    const employeeId = toNumericId(authUser?.employee_id);
    if (employeeId) {
        return employeeId;
    }

    return findEmployeeIdByUserId(connection, authUser?.id);
};

const getEmployeePhotoContext = async (connection, employeeId) => {
    const normalizedEmployeeId = toNumericId(employeeId);
    if (!normalizedEmployeeId) {
        return null;
    }

    const [rows] = await connection.query(
        `SELECT
            e.id AS employee_id,
            e.user_id,
            u.photo_path,
            COALESCE(
                NULLIF(
                    TRIM(
                        CONCAT_WS(
                            ' ',
                            COALESCE(NULLIF(TRIM(ext.first_name), ''), NULLIF(TRIM(ai.first_name), '')),
                            COALESCE(NULLIF(TRIM(ext.last_name), ''), NULLIF(TRIM(ai.last_name), ''))
                        )
                    ),
                    ''
                ),
                CONCAT('Empleado ', e.internal_id)
            ) AS full_name
         FROM employees e
         LEFT JOIN users u ON u.id = e.user_id
         LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
         LEFT JOIN ext_microsip_employee ext ON ext.id = eml.microsip_employee_ext_id
         LEFT JOIN employee_axis_identity ai ON ai.employee_id = e.id
         WHERE e.id = ?
         LIMIT 1`,
        [normalizedEmployeeId]
    );

    if (!rows.length) {
        return null;
    }

    return {
        employee_id: normalizedEmployeeId,
        user_id: toNumericId(rows[0].user_id),
        full_name: normalizeText(rows[0].full_name, 'Sin nombre'),
        photo_path: normalizeText(rows[0].photo_path),
    };
};

const buildPhotoPayload = (req, context, photoPath) => ({
    employee_id: context.employee_id,
    user_id: context.user_id,
    full_name: context.full_name,
    photo_path: photoPath || null,
    photo_url: buildPhotoUrl(req, photoPath),
});

const uploadPhotoForEmployee = async (req, res, options = {}) => {
    const normalizedEmployeeId = toNumericId(options.employeeId);
    if (!normalizedEmployeeId) {
        return sendError(res, 400, 'ID de colaborador inválido.', req);
    }

    if (!req.file?.buffer) {
        return sendError(res, 400, 'Debes seleccionar una foto para continuar.', req);
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;
    let newFileAbsolutePath = null;

    try {
        const employeeContext = await getEmployeePhotoContext(connection, normalizedEmployeeId);
        if (!employeeContext) {
            return sendError(res, 404, 'Colaborador no encontrado.', req);
        }

        if (!employeeContext.user_id) {
            return sendError(res, 409, 'Este colaborador no tiene cuenta AXIS vinculada.', req);
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const previousPhotoPath = employeeContext.photo_path;
        const storedPhotoFile = await createStoredPhotoFile({
            userId: employeeContext.user_id,
            file: req.file,
        });
        newFileAbsolutePath = storedPhotoFile.absolutePath;

        await connection.query(
            `UPDATE users
             SET photo_path = ?
             WHERE id = ?`,
            [storedPhotoFile.storedPath, employeeContext.user_id]
        );

        await connection.commit();
        transactionStarted = false;

        if (previousPhotoPath && previousPhotoPath !== storedPhotoFile.storedPath) {
            try {
                await removeStoredPhotoFile(previousPhotoPath);
            } catch (cleanupError) {
                await logger.error(req.authUser?.id, 'PROFILE_PHOTO_PREVIOUS_CLEANUP_ERROR', {
                    employee_id: normalizedEmployeeId,
                    user_id: employeeContext.user_id,
                    previous_photo_path: previousPhotoPath,
                    error_message: cleanupError?.message || String(cleanupError),
                    ...buildRequestContext(req),
                }, req.ip, { source: 'profile-photo', severity: 'warning' });
            }
        }

        const responsePayload = buildPhotoPayload(req, employeeContext, storedPhotoFile.storedPath);
        await logger.business(req.authUser?.id, options.auditAction || 'PROFILE_PHOTO_UPLOAD', {
            employee_id: normalizedEmployeeId,
            user_id: employeeContext.user_id,
            photo_path: storedPhotoFile.storedPath,
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Foto de perfil actualizada correctamente.',
            data: responsePayload,
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        if (newFileAbsolutePath) {
            try {
                await fs.promises.unlink(newFileAbsolutePath);
            } catch {
                // ignore file cleanup errors
            }
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: options.errorAction || 'PROFILE_PHOTO_UPLOAD_ERROR',
            message: 'Error al actualizar foto de perfil',
            details: { employee_id: normalizedEmployeeId },
        });
    } finally {
        connection.release();
    }
};

const removePhotoForEmployee = async (req, res, options = {}) => {
    const normalizedEmployeeId = toNumericId(options.employeeId);
    if (!normalizedEmployeeId) {
        return sendError(res, 400, 'ID de colaborador inválido.', req);
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        const employeeContext = await getEmployeePhotoContext(connection, normalizedEmployeeId);
        if (!employeeContext) {
            return sendError(res, 404, 'Colaborador no encontrado.', req);
        }

        if (!employeeContext.user_id) {
            return sendError(res, 409, 'Este colaborador no tiene cuenta AXIS vinculada.', req);
        }

        const previousPhotoPath = employeeContext.photo_path;
        if (!previousPhotoPath) {
            return res.json({
                message: 'El colaborador no tiene foto cargada.',
                data: buildPhotoPayload(req, employeeContext, null),
            });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        await connection.query(
            `UPDATE users
             SET photo_path = NULL
             WHERE id = ?`,
            [employeeContext.user_id]
        );

        await connection.commit();
        transactionStarted = false;

        try {
            await removeStoredPhotoFile(previousPhotoPath);
        } catch (cleanupError) {
            await logger.error(req.authUser?.id, 'PROFILE_PHOTO_DELETE_FILE_ERROR', {
                employee_id: normalizedEmployeeId,
                user_id: employeeContext.user_id,
                previous_photo_path: previousPhotoPath,
                error_message: cleanupError?.message || String(cleanupError),
                ...buildRequestContext(req),
            }, req.ip, { source: 'profile-photo', severity: 'warning' });
        }

        await logger.business(req.authUser?.id, options.auditAction || 'PROFILE_PHOTO_REMOVE', {
            employee_id: normalizedEmployeeId,
            user_id: employeeContext.user_id,
            previous_photo_path: previousPhotoPath,
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Foto de perfil eliminada correctamente.',
            data: buildPhotoPayload(req, employeeContext, null),
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: options.errorAction || 'PROFILE_PHOTO_REMOVE_ERROR',
            message: 'Error al eliminar foto de perfil',
            details: { employee_id: normalizedEmployeeId },
        });
    } finally {
        connection.release();
    }
};

export const uploadMyProfilePhoto = async (req, res) => {
    try {
        const employeeId = await resolveSessionEmployeeId(pool, req.authUser);
        if (!employeeId) {
            return sendError(res, 404, 'No existe un colaborador vinculado a esta sesión.', req);
        }

        return uploadPhotoForEmployee(req, res, {
            employeeId,
            auditAction: 'PROFILE_PHOTO_UPLOAD_SELF',
            errorAction: 'PROFILE_PHOTO_UPLOAD_SELF_ERROR',
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'PROFILE_PHOTO_UPLOAD_SELF_LOOKUP_ERROR',
            message: 'No fue posible resolver el colaborador de la sesión.',
        });
    }
};

export const removeMyProfilePhoto = async (req, res) => {
    try {
        const employeeId = await resolveSessionEmployeeId(pool, req.authUser);
        if (!employeeId) {
            return sendError(res, 404, 'No existe un colaborador vinculado a esta sesión.', req);
        }

        return removePhotoForEmployee(req, res, {
            employeeId,
            auditAction: 'PROFILE_PHOTO_REMOVE_SELF',
            errorAction: 'PROFILE_PHOTO_REMOVE_SELF_ERROR',
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'PROFILE_PHOTO_REMOVE_SELF_LOOKUP_ERROR',
            message: 'No fue posible resolver el colaborador de la sesión.',
        });
    }
};

export const uploadEmployeeProfilePhoto = async (req, res) => uploadPhotoForEmployee(req, res, {
    employeeId: req.params.employeeId,
    auditAction: 'PROFILE_PHOTO_UPLOAD_ADMIN',
    errorAction: 'PROFILE_PHOTO_UPLOAD_ADMIN_ERROR',
});

export const removeEmployeeProfilePhoto = async (req, res) => removePhotoForEmployee(req, res, {
    employeeId: req.params.employeeId,
    auditAction: 'PROFILE_PHOTO_REMOVE_ADMIN',
    errorAction: 'PROFILE_PHOTO_REMOVE_ADMIN_ERROR',
});
