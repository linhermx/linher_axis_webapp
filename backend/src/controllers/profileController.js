import pool from '../config/db.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { handleControllerError, sendError } from '../utils/ApiError.js';
import { createEmployeeProfileService } from '../services/EmployeeProfileService.js';
import { hasRole, isAdminUser, normalizeRoleName } from '../utils/RolePolicy.js';

const logger = new SystemLogger(pool);
const profileService = createEmployeeProfileService(pool);

const normalizePermissionCode = (value) => String(value || '').trim().toLowerCase();

const toInteger = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const normalizeLimit = (value, fallback = 20) => {
    const parsed = toInteger(value);
    if (!parsed) {
        return fallback;
    }

    return Math.min(Math.max(parsed, 1), 100);
};

const hasPermission = (user, permissionCode) => {
    const requiredCode = normalizePermissionCode(permissionCode);
    if (!requiredCode) {
        return false;
    }

    return Array.isArray(user?.permissions)
        && user.permissions.some((code) => normalizePermissionCode(code) === requiredCode);
};

const getAuthEmployeeId = async (authUser) => {
    const sessionEmployeeId = toInteger(authUser?.employee_id);
    if (sessionEmployeeId) {
        return sessionEmployeeId;
    }

    const userId = toInteger(authUser?.id);
    if (!userId) {
        return null;
    }

    return profileService.findInternalEmployeeIdByUserId(userId);
};

const sendMicrosipLinkMissing = (res, req, employeeId) => sendError(
    res,
    404,
    'El empleado no tiene vinculo con datos de Microsip',
    req,
    {
        code: 'MICROSIP_LINK_NOT_FOUND',
        employee_id: employeeId,
    }
);

export const getMyProfile = async (req, res) => {
    try {
        const authUser = req.authUser;
        const canViewSelf = isAdminUser(authUser)
            || hasPermission(authUser, 'view_profile_self')
            || hasPermission(authUser, 'view_profile_employee');

        if (!canViewSelf) {
            return sendError(res, 403, 'No autorizado para consultar perfil', req);
        }

        const employeeId = await getAuthEmployeeId(authUser);
        if (!employeeId) {
            return sendError(res, 404, 'No existe un perfil de empleado asociado a la sesion', req);
        }

        const profile = await profileService.getProfileByInternalEmployeeId(employeeId);
        if (!profile) {
            return sendError(res, 404, 'Empleado no encontrado', req);
        }

        if (!profile.linked) {
            return sendMicrosipLinkMissing(res, req, employeeId);
        }

        return res.json({ data: profile, visibility_scope: 'full' });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MY_PROFILE_FETCH_ERROR',
            message: 'Error al consultar perfil del colaborador',
        });
    }
};

export const getMyPayrollPayments = async (req, res) => {
    try {
        const authUser = req.authUser;
        const canViewPayroll = isAdminUser(authUser)
            || hasPermission(authUser, 'view_payroll_self')
            || hasPermission(authUser, 'view_payroll_employee');

        if (!canViewPayroll) {
            return sendError(res, 403, 'No autorizado para consultar pagos', req);
        }

        const employeeId = await getAuthEmployeeId(authUser);
        if (!employeeId) {
            return sendError(res, 404, 'No existe un perfil de empleado asociado a la sesion', req);
        }

        const profile = await profileService.getProfileByInternalEmployeeId(employeeId);
        if (!profile || !profile.linked) {
            return sendMicrosipLinkMissing(res, req, employeeId);
        }

        const limit = normalizeLimit(req.query.limit, 20);
        const payments = await profileService.listPayrollPaymentsByEmployeeExtId(profile.employee_ext_id, {
            limit,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
        });

        return res.json({
            data: payments,
            meta: {
                employee_id: employeeId,
                limit,
                date_from: req.query.date_from || null,
                date_to: req.query.date_to || null,
            },
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'MY_PAYROLL_FETCH_ERROR',
            message: 'Error al consultar pagos del colaborador',
        });
    }
};

export const getEmployeeProfile360 = async (req, res) => {
    try {
        const authUser = req.authUser;
        const targetEmployeeId = toInteger(req.params.id);
        if (!targetEmployeeId) {
            return sendError(res, 400, 'ID de empleado invalido', req);
        }

        const roleName = normalizeRoleName(authUser?.role_name);
        const canViewEmployeeProfile = isAdminUser(authUser)
            || hasPermission(authUser, 'view_profile_employee');

        if (!canViewEmployeeProfile) {
            return sendError(res, 403, 'No autorizado para consultar perfil de colaboradores', req);
        }

        let visibilityScope = 'full';
        if (roleName === 'SUPERVISOR' && !isAdminUser(authUser)) {
            const supervisorEmployeeId = await getAuthEmployeeId(authUser);
            const canAccess = await profileService.isSupervisorOfEmployee(supervisorEmployeeId, targetEmployeeId);
            if (!canAccess) {
                return sendError(res, 403, 'No autorizado para consultar este colaborador', req);
            }

            if (supervisorEmployeeId !== targetEmployeeId) {
                visibilityScope = 'summary';
            }
        } else if (!(hasRole(authUser, 'ADMIN') || hasRole(authUser, 'RRHH')) && !isAdminUser(authUser)) {
            return sendError(res, 403, 'No autorizado para consultar este perfil', req);
        }

        const profile = await profileService.getProfileByInternalEmployeeId(targetEmployeeId);
        if (!profile) {
            return sendError(res, 404, 'Empleado no encontrado', req);
        }

        if (!profile.linked) {
            return sendMicrosipLinkMissing(res, req, targetEmployeeId);
        }

        const responseData = visibilityScope === 'summary'
            ? profileService.toSupervisorSummary(profile)
            : profile;

        return res.json({
            data: responseData,
            visibility_scope: visibilityScope,
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'EMPLOYEE_PROFILE_360_FETCH_ERROR',
            message: 'Error al consultar perfil del colaborador',
        });
    }
};

export const getEmployeePayrollPayments = async (req, res) => {
    try {
        const authUser = req.authUser;
        const targetEmployeeId = toInteger(req.params.id);
        if (!targetEmployeeId) {
            return sendError(res, 400, 'ID de empleado invalido', req);
        }

        const canViewPayroll = isAdminUser(authUser)
            || ((hasRole(authUser, 'ADMIN') || hasRole(authUser, 'RRHH'))
                && hasPermission(authUser, 'view_payroll_employee'));

        if (!canViewPayroll) {
            return sendError(res, 403, 'No autorizado para consultar pagos de colaboradores', req);
        }

        const profile = await profileService.getProfileByInternalEmployeeId(targetEmployeeId);
        if (!profile || !profile.linked) {
            return sendMicrosipLinkMissing(res, req, targetEmployeeId);
        }

        const limit = normalizeLimit(req.query.limit, 20);
        const payments = await profileService.listPayrollPaymentsByEmployeeExtId(profile.employee_ext_id, {
            limit,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
        });

        return res.json({
            data: payments,
            visibility_scope: 'full',
            meta: {
                employee_id: targetEmployeeId,
                limit,
                date_from: req.query.date_from || null,
                date_to: req.query.date_to || null,
            },
        });
    } catch (error) {
        return handleControllerError({
            logger,
            req,
            res,
            error,
            action: 'EMPLOYEE_PAYROLL_FETCH_ERROR',
            message: 'Error al consultar pagos del colaborador',
        });
    }
};
