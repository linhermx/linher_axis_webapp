import argon2 from 'argon2';
import pool from '../config/db.js';
import { sendError, handleControllerError } from '../utils/ApiError.js';
import { buildRequestContext } from '../utils/RequestContext.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import {
    CANONICAL_ROLES,
    isSystemRole,
    normalizeRoleName,
    toCanonicalRoleList,
} from '../utils/RolePolicy.js';

const logger = new SystemLogger(pool);

const CORPORATE_EMAIL_DOMAINS = String(
    process.env.AXIS_CORPORATE_EMAIL_DOMAINS
    || process.env.AXIS_CORPORATE_EMAIL_DOMAIN
    || 'linher.com.mx'
)
    .split(',')
    .map((domain) => String(domain || '').trim().toLowerCase())
    .filter(Boolean);

const ROLE_ORDER = ['ADMIN', 'RRHH', 'SUPERVISOR', 'RECLUTADOR', 'EMPLEADO'];
const ROLE_ORDER_SQL_PLACEHOLDERS = ROLE_ORDER.map(() => '?').join(', ');

const normalizeText = (value) => String(value || '').trim();

const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const toNumericId = (value) => {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
};

const parseEmployeeId = (value) => toNumericId(value);

const normalizePermissionCode = (value) => String(value || '').trim().toLowerCase();

const hasPermission = (user, permissionCode) => (
    Array.isArray(user?.permissions)
        ? user.permissions.map(normalizePermissionCode).includes(normalizePermissionCode(permissionCode))
        : false
);

const normalizeRoleInput = (value) => {
    if (!value) return [];
    const raw = Array.isArray(value) ? value : [value];
    return toCanonicalRoleList(raw);
};

const isCorporateEmail = (email) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@')) {
        return false;
    }

    const emailDomain = normalizedEmail.split('@')[1] || '';
    if (!emailDomain) {
        return false;
    }

    return CORPORATE_EMAIL_DOMAINS.includes(emailDomain);
};

const validatePasswordStrength = (password) => {
    const normalizedPassword = String(password || '');
    if (normalizedPassword.length < 10) {
        return 'La contraseña debe tener al menos 10 caracteres.';
    }

    const hasLetter = /[A-Za-z]/.test(normalizedPassword);
    const hasNumber = /\d/.test(normalizedPassword);
    if (!hasLetter || !hasNumber) {
        return 'La contraseña debe incluir al menos una letra y un número.';
    }

    return null;
};

const buildAccountStatusLabel = (status) => {
    const normalizedStatus = normalizeText(status).toLowerCase();
    if (normalizedStatus === 'inactive') return 'Inactivo';
    return 'Activo';
};

const buildRoleSqlInClause = (values = []) => values.map(() => '?').join(', ');

const buildApiValidationError = (status, message) => {
    const error = new Error(message);
    error.apiStatus = status;
    error.isApiValidationError = true;
    return error;
};

const getCanonicalRoleRows = async (connection) => {
    const roleInClause = buildRoleSqlInClause(CANONICAL_ROLES);
    const [rows] = await connection.query(
        `SELECT id, name, description
         FROM roles
         WHERE UPPER(TRIM(name)) IN (${roleInClause})
         ORDER BY FIELD(UPPER(TRIM(name)), ${ROLE_ORDER_SQL_PLACEHOLDERS}), id ASC`,
        [...CANONICAL_ROLES, ...ROLE_ORDER]
    );

    return rows.map((row) => ({
        id: row.id,
        name: normalizeRoleName(row.name),
        description: row.description || '',
        is_system_role: isSystemRole(row.name),
    }));
};

const getCanonicalRoleMap = async (connection) => {
    const roleRows = await getCanonicalRoleRows(connection);
    return new Map(roleRows.map((row) => [row.name, row.id]));
};

const buildEmployeeAccountBaseQuery = ({ employeeId = null } = {}) => `
    SELECT
        e.id AS employee_id,
        e.user_id,
        e.internal_id,
        ext.employee_number AS microsip_employee_number,
        COALESCE(NULLIF(TRIM(ext.first_name), ''), NULLIF(TRIM(ai.first_name), '')) AS first_name,
        COALESCE(NULLIF(TRIM(ext.last_name), ''), NULLIF(TRIM(ai.last_name), '')) AS last_name,
        COALESCE(NULLIF(TRIM(ext_dep.name), ''), d.name) AS department_name,
        COALESCE(NULLIF(TRIM(ext_job.name), ''), p.name) AS position_name,
        u.email AS account_email,
        u.status AS account_status,
        u.must_change_password AS account_must_change_password
    FROM employees e
    LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
    LEFT JOIN ext_microsip_employee ext ON ext.id = eml.microsip_employee_ext_id
    LEFT JOIN ext_microsip_department ext_dep ON ext_dep.id = ext.department_ext_id
    LEFT JOIN ext_microsip_job_title ext_job ON ext_job.id = ext.job_title_ext_id
    LEFT JOIN employee_axis_identity ai ON ai.employee_id = e.id
    LEFT JOIN employee_jobs ej ON ej.employee_id = e.id AND ej.current_job_flag = 1
    LEFT JOIN departments d ON d.id = ej.department_id
    LEFT JOIN positions p ON p.id = ej.position_id
    LEFT JOIN users u ON u.id = e.user_id
    ${employeeId ? 'WHERE e.id = ?' : ''}
    ORDER BY
      COALESCE(NULLIF(TRIM(ext.first_name), ''), NULLIF(TRIM(ai.first_name), ''), e.internal_id) ASC,
      COALESCE(NULLIF(TRIM(ext.last_name), ''), NULLIF(TRIM(ai.last_name), '')) ASC
`;

const fetchRoleAssignmentsByUserIds = async (connection, userIds = []) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return new Map();
    }

    const userInClause = buildRoleSqlInClause(userIds);
    const [rows] = await connection.query(
        `SELECT ur.user_id, r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id IN (${userInClause})
         ORDER BY ur.user_id, FIELD(UPPER(TRIM(r.name)), ${ROLE_ORDER_SQL_PLACEHOLDERS}), r.id ASC`,
        [...userIds, ...ROLE_ORDER]
    );

    const roleMap = new Map();
    rows.forEach((row) => {
        const userId = toNumericId(row.user_id);
        if (!userId) return;
        const currentRoles = roleMap.get(userId) || [];
        currentRoles.push(normalizeRoleName(row.name));
        roleMap.set(userId, currentRoles);
    });

    return roleMap;
};

const fetchLastSessionByUserIds = async (connection, userIds = []) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return new Map();
    }

    const userInClause = buildRoleSqlInClause(userIds);
    const [rows] = await connection.query(
        `SELECT user_id, MAX(last_used_at) AS last_session_at
         FROM refresh_tokens
         WHERE user_id IN (${userInClause})
         GROUP BY user_id`,
        userIds
    );

    return new Map(rows.map((row) => [toNumericId(row.user_id), row.last_session_at || null]));
};

const toAxisAccountRecord = (row, roleMap, lastSessionMap) => {
    const userId = toNumericId(row.user_id);
    const roleList = userId ? (roleMap.get(userId) || []) : [];
    const name = [normalizeText(row.first_name), normalizeText(row.last_name)].filter(Boolean).join(' ').trim() || 'Sin nombre';

    return {
        employee_id: toNumericId(row.employee_id),
        user_id: userId,
        internal_id: normalizeText(row.internal_id) || null,
        microsip_employee_number: normalizeText(row.microsip_employee_number) || null,
        full_name: name,
        first_name: normalizeText(row.first_name) || null,
        last_name: normalizeText(row.last_name) || null,
        department_name: normalizeText(row.department_name) || 'Sin departamento',
        position_name: normalizeText(row.position_name) || 'Sin puesto',
        account: userId ? {
            email: normalizeText(row.account_email) || null,
            status: normalizeText(row.account_status).toLowerCase() || 'active',
            status_label: buildAccountStatusLabel(row.account_status),
            must_change_password: Boolean(Number(row.account_must_change_password || 0)),
            last_session_at: lastSessionMap.get(userId) || null,
            roles: roleList,
            has_employee_role: roleList.includes('EMPLEADO'),
            system_roles: roleList.filter((roleName) => isSystemRole(roleName)),
        } : null,
    };
};

const fetchAxisAccountRecords = async (connection, { employeeId = null } = {}) => {
    const baseQuery = buildEmployeeAccountBaseQuery({ employeeId });
    const queryParams = employeeId ? [employeeId] : [];
    const [rows] = await connection.query(baseQuery, queryParams);

    if (employeeId && rows.length === 0) {
        return [];
    }

    const userIds = Array.from(
        new Set(rows.map((row) => toNumericId(row.user_id)).filter(Boolean))
    );

    const [roleMap, lastSessionMap] = await Promise.all([
        fetchRoleAssignmentsByUserIds(connection, userIds),
        fetchLastSessionByUserIds(connection, userIds),
    ]);

    return rows.map((row) => toAxisAccountRecord(row, roleMap, lastSessionMap));
};

const filterAxisAccounts = (records, { search = '', status = 'all', role = 'all' } = {}) => {
    const normalizedSearch = normalizeText(search).toLocaleLowerCase('es-MX');
    const normalizedStatus = normalizeText(status).toLowerCase();
    const normalizedRole = normalizeRoleName(role);

    return records.filter((record) => {
        const hasAccount = Boolean(record.account);
        const accountStatus = normalizeText(record.account?.status).toLowerCase();

        if (normalizedStatus === 'with_account' && !hasAccount) {
            return false;
        }
        if (normalizedStatus === 'without_account' && hasAccount) {
            return false;
        }
        if (normalizedStatus === 'active' && accountStatus !== 'active') {
            return false;
        }
        if (normalizedStatus === 'inactive' && accountStatus !== 'inactive') {
            return false;
        }

        if (normalizedRole && normalizedRole !== 'ALL') {
            const accountRoles = record.account?.roles || [];
            if (!accountRoles.includes(normalizedRole)) {
                return false;
            }
        }

        if (!normalizedSearch) {
            return true;
        }

        const searchableText = [
            record.full_name,
            record.internal_id,
            record.microsip_employee_number,
            record.department_name,
            record.position_name,
            record.account?.email,
            ...(record.account?.roles || []),
        ]
            .map((value) => normalizeText(value).toLocaleLowerCase('es-MX'))
            .join(' ');

        return searchableText.includes(normalizedSearch);
    });
};

const resolveTargetRoles = ({
    rawRoles = [],
    actor,
    enforceEmployeeRole = true,
}) => {
    const requestedRoles = normalizeRoleInput(rawRoles);
    const invalidRoles = requestedRoles.filter((roleName) => !CANONICAL_ROLES.includes(roleName));
    if (invalidRoles.length) {
        return {
            error: `Rol no válido: ${invalidRoles.join(', ')}`,
            roles: [],
        };
    }

    const requestedSystemRoles = requestedRoles.filter((roleName) => isSystemRole(roleName));
    if (requestedSystemRoles.length > 0 && !hasPermission(actor, 'assign_system_roles')) {
        return {
            error: 'No cuentas con permiso para asignar roles de sistema.',
            roles: [],
            status: 403,
        };
    }

    const finalRoles = [
        ...(enforceEmployeeRole ? ['EMPLEADO'] : []),
        ...requestedSystemRoles,
    ];

    return {
        roles: Array.from(new Set(finalRoles.map(normalizeRoleName).filter(Boolean))),
        error: null,
    };
};

const assignRolesToUser = async (connection, userId, roleNames) => {
    const roleMap = await getCanonicalRoleMap(connection);

    if (!roleMap.has('EMPLEADO')) {
        throw new Error('ROLE_CONFIGURATION_MISSING_EMPLEADO');
    }

    const unknownRoles = roleNames.filter((roleName) => !roleMap.has(roleName));
    if (unknownRoles.length > 0) {
        throw new Error(`ROLE_CONFIGURATION_MISSING:${unknownRoles.join(',')}`);
    }

    await connection.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);

    if (roleNames.length === 0) {
        return;
    }

    const values = roleNames.map((roleName) => [userId, roleMap.get(roleName)]);
    await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
};

const revokeRefreshTokens = async (connection, userId, reason) => {
    await connection.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW(),
             revoked_reason = ?,
             last_used_at = NOW()
         WHERE user_id = ?
           AND revoked_at IS NULL`,
        [reason, userId]
    );
};

export const getAxisAccountRoles = async (req, res) => {
    try {
        const roles = await getCanonicalRoleRows(pool);
        return res.json({ data: roles });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNT_ROLES_FETCH_ERROR',
            message: 'Error al cargar catálogo de roles',
        });
    }
};

export const getAxisAccounts = async (req, res) => {
    try {
        const allRecords = await fetchAxisAccountRecords(pool);
        const filteredRecords = filterAxisAccounts(allRecords, {
            search: req.query?.search || '',
            status: req.query?.status || 'all',
            role: req.query?.role || 'all',
        });
        const roleCatalog = await getCanonicalRoleRows(pool);

        return res.json({
            data: filteredRecords,
            summary: {
                total_collaborators: allRecords.length,
                with_account: allRecords.filter((record) => Boolean(record.account)).length,
                without_account: allRecords.filter((record) => !record.account).length,
                active_accounts: allRecords.filter((record) => record.account?.status === 'active').length,
                inactive_accounts: allRecords.filter((record) => record.account?.status === 'inactive').length,
            },
            role_catalog: roleCatalog,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNTS_LIST_ERROR',
            message: 'Error al cargar cuentas AXIS',
        });
    }
};

export const getAxisAccountByEmployeeId = async (req, res) => {
    const employeeId = parseEmployeeId(req.params.employeeId);
    if (!employeeId) {
        return sendError(res, 400, 'ID de colaborador inválido', req);
    }

    try {
        const records = await fetchAxisAccountRecords(pool, { employeeId });
        if (!records.length) {
            return sendError(res, 404, 'Colaborador no encontrado', req);
        }

        const roleCatalog = await getCanonicalRoleRows(pool);

        return res.json({
            data: records[0],
            role_catalog: roleCatalog,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNT_FETCH_ERROR',
            message: 'Error al cargar cuenta AXIS del colaborador',
            details: { employee_id: employeeId },
        });
    }
};

export const createAxisAccount = async (req, res) => {
    const employeeId = parseEmployeeId(req.body?.employee_id);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const requestedRoles = req.body?.roles ?? req.body?.system_roles ?? [];

    if (!employeeId) {
        return sendError(res, 400, 'Debes indicar un colaborador válido.', req);
    }

    if (!email) {
        return sendError(res, 400, 'El correo corporativo es obligatorio.', req);
    }

    if (!isCorporateEmail(email)) {
        return sendError(
            res,
            400,
            `El correo debe pertenecer al dominio corporativo (${CORPORATE_EMAIL_DOMAINS.join(', ')}).`,
            req
        );
    }

    const passwordValidationMessage = validatePasswordStrength(password);
    if (passwordValidationMessage) {
        return sendError(res, 400, passwordValidationMessage, req);
    }

    const roleResolution = resolveTargetRoles({
        rawRoles: requestedRoles,
        actor: req.authUser,
        enforceEmployeeRole: true,
    });
    if (roleResolution.error) {
        return sendError(res, roleResolution.status || 400, roleResolution.error, req);
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const records = await fetchAxisAccountRecords(connection, { employeeId });
        if (!records.length) {
            throw buildApiValidationError(404, 'Colaborador no encontrado');
        }

        const employeeRecord = records[0];
        if (employeeRecord.account) {
            throw buildApiValidationError(409, 'Este colaborador ya tiene una cuenta AXIS vinculada.');
        }

        const [existingEmailRows] = await connection.query(
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        if (existingEmailRows.length > 0) {
            throw buildApiValidationError(409, 'Ya existe una cuenta AXIS con ese correo.');
        }

        const passwordHash = await argon2.hash(password);
        const [createUserResult] = await connection.query(
            'INSERT INTO users (email, password_hash, status, must_change_password, password_changed_at) VALUES (?, ?, ?, ?, ?)',
            [email, passwordHash, 'active', 1, null]
        );

        const userId = toNumericId(createUserResult.insertId);
        await assignRolesToUser(connection, userId, roleResolution.roles);
        await connection.query('UPDATE employees SET user_id = ? WHERE id = ?', [userId, employeeId]);

        await connection.commit();
        transactionStarted = false;

        const refreshedRecord = (await fetchAxisAccountRecords(pool, { employeeId }))[0];

        res.status(201).json({
            message: 'Cuenta AXIS creada y vinculada correctamente.',
            data: refreshedRecord,
        });

        await logger.business(req.authUser?.id, 'AXIS_ACCOUNT_CREATE', {
            employee_id: employeeId,
            user_id: userId,
            email,
            roles: roleResolution.roles,
            ...buildRequestContext(req),
        }, req.ip);

        return undefined;
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        if (error?.isApiValidationError) {
            return sendError(res, error.apiStatus || 400, error.message, req);
        }

        if (String(error?.message || '').startsWith('ROLE_CONFIGURATION_MISSING')) {
            return sendError(res, 500, 'El catálogo de roles está incompleto en la base de datos.', req);
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNT_CREATE_ERROR',
            message: 'Error al crear cuenta AXIS',
            details: { employee_id: employeeId, email },
        });
    } finally {
        connection.release();
    }
};

export const updateAxisAccountStatus = async (req, res) => {
    const employeeId = parseEmployeeId(req.params.employeeId);
    const requestedStatus = normalizeText(req.body?.status).toLowerCase();

    if (!employeeId) {
        return sendError(res, 400, 'ID de colaborador inválido', req);
    }

    if (!['active', 'inactive'].includes(requestedStatus)) {
        return sendError(res, 400, 'Estatus inválido. Usa active o inactive.', req);
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const records = await fetchAxisAccountRecords(connection, { employeeId });
        if (!records.length) {
            throw buildApiValidationError(404, 'Colaborador no encontrado');
        }

        const employeeRecord = records[0];
        if (!employeeRecord.account || !employeeRecord.user_id) {
            throw buildApiValidationError(409, 'El colaborador aún no tiene cuenta AXIS vinculada.');
        }
        const previousStatus = normalizeText(employeeRecord.account?.status).toLowerCase() || 'active';

        await connection.query(
            'UPDATE users SET status = ? WHERE id = ?',
            [requestedStatus, employeeRecord.user_id]
        );

        if (requestedStatus === 'inactive') {
            await revokeRefreshTokens(connection, employeeRecord.user_id, 'account_inactivated');
        }

        await connection.commit();
        transactionStarted = false;

        const refreshedRecord = (await fetchAxisAccountRecords(pool, { employeeId }))[0];
        await logger.business(req.authUser?.id, 'AXIS_ACCOUNT_STATUS_UPDATE', {
            employee_id: employeeId,
            user_id: employeeRecord.user_id,
            previous_status: previousStatus,
            new_status: requestedStatus,
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Estatus de cuenta actualizado.',
            data: refreshedRecord,
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        if (error?.isApiValidationError) {
            return sendError(res, error.apiStatus || 400, error.message, req);
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNT_STATUS_UPDATE_ERROR',
            message: 'Error al actualizar estatus de la cuenta',
            details: { employee_id: employeeId, status: requestedStatus },
        });
    } finally {
        connection.release();
    }
};

export const resetAxisAccountPassword = async (req, res) => {
    const employeeId = parseEmployeeId(req.params.employeeId);
    const newPassword = String(req.body?.new_password || '');

    if (!employeeId) {
        return sendError(res, 400, 'ID de colaborador inválido', req);
    }

    const passwordValidationMessage = validatePasswordStrength(newPassword);
    if (passwordValidationMessage) {
        return sendError(res, 400, passwordValidationMessage, req);
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const records = await fetchAxisAccountRecords(connection, { employeeId });
        if (!records.length) {
            throw buildApiValidationError(404, 'Colaborador no encontrado');
        }

        const employeeRecord = records[0];
        if (!employeeRecord.account || !employeeRecord.user_id) {
            throw buildApiValidationError(409, 'El colaborador aún no tiene cuenta AXIS vinculada.');
        }

        const newPasswordHash = await argon2.hash(newPassword);
        await connection.query(
            'UPDATE users SET password_hash = ?, must_change_password = 1, password_changed_at = NULL WHERE id = ?',
            [newPasswordHash, employeeRecord.user_id]
        );
        await revokeRefreshTokens(connection, employeeRecord.user_id, 'password_reset');

        await connection.commit();
        transactionStarted = false;

        await logger.business(req.authUser?.id, 'AXIS_ACCOUNT_PASSWORD_RESET', {
            employee_id: employeeId,
            user_id: employeeRecord.user_id,
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Contraseña restablecida correctamente.',
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        if (error?.isApiValidationError) {
            return sendError(res, error.apiStatus || 400, error.message, req);
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNT_PASSWORD_RESET_ERROR',
            message: 'Error al restablecer contraseña',
            details: { employee_id: employeeId },
        });
    } finally {
        connection.release();
    }
};

export const updateAxisAccountRoles = async (req, res) => {
    const employeeId = parseEmployeeId(req.params.employeeId);
    const requestedRoles = req.body?.roles ?? req.body?.system_roles ?? [];

    if (!employeeId) {
        return sendError(res, 400, 'ID de colaborador inválido', req);
    }

    const roleResolution = resolveTargetRoles({
        rawRoles: requestedRoles,
        actor: req.authUser,
        enforceEmployeeRole: true,
    });

    if (roleResolution.error) {
        return sendError(res, roleResolution.status || 400, roleResolution.error, req);
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const records = await fetchAxisAccountRecords(connection, { employeeId });
        if (!records.length) {
            throw buildApiValidationError(404, 'Colaborador no encontrado');
        }

        const employeeRecord = records[0];
        if (!employeeRecord.account || !employeeRecord.user_id) {
            throw buildApiValidationError(409, 'El colaborador aún no tiene cuenta AXIS vinculada.');
        }

        await assignRolesToUser(connection, employeeRecord.user_id, roleResolution.roles);

        await connection.commit();
        transactionStarted = false;

        const refreshedRecord = (await fetchAxisAccountRecords(pool, { employeeId }))[0];

        await logger.business(req.authUser?.id, 'AXIS_ACCOUNT_ROLES_UPDATE', {
            employee_id: employeeId,
            user_id: employeeRecord.user_id,
            roles: roleResolution.roles,
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Roles actualizados correctamente.',
            data: refreshedRecord,
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        if (error?.isApiValidationError) {
            return sendError(res, error.apiStatus || 400, error.message, req);
        }

        if (String(error?.message || '').startsWith('ROLE_CONFIGURATION_MISSING')) {
            return sendError(res, 500, 'El catálogo de roles está incompleto en la base de datos.', req);
        }

        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'AXIS_ACCOUNT_ROLES_UPDATE_ERROR',
            message: 'Error al actualizar roles',
            details: { employee_id: employeeId },
        });
    } finally {
        connection.release();
    }
};
