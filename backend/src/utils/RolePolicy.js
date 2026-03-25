const LEGACY_ROLE_ALIASES = Object.freeze({
    HR_ADMIN: 'RRHH',
});

export const CANONICAL_ROLES = Object.freeze([
    'ADMIN',
    'SUPERVISOR',
    'RRHH',
    'EMPLEADO',
    'RECLUTADOR',
]);

const CANONICAL_ROLE_SET = new Set(CANONICAL_ROLES);

export const SYSTEM_ROLES = Object.freeze([
    'ADMIN',
    'SUPERVISOR',
    'RRHH',
    'RECLUTADOR',
]);

const SYSTEM_ROLE_SET = new Set(SYSTEM_ROLES);

export const ACCOUNT_GOVERNANCE_PERMISSIONS = Object.freeze([
    'manage_axis_accounts',
    'assign_system_roles',
    'reset_user_passwords',
    'toggle_user_accounts',
]);

export const normalizeRoleName = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) {
        return '';
    }

    return LEGACY_ROLE_ALIASES[normalized] || normalized;
};

export const isCanonicalRole = (value) => CANONICAL_ROLE_SET.has(normalizeRoleName(value));

export const isSystemRole = (value) => SYSTEM_ROLE_SET.has(normalizeRoleName(value));

export const toCanonicalRoleList = (roles = []) => {
    const source = Array.isArray(roles) ? roles : [roles];
    return Array.from(
        new Set(source.map(normalizeRoleName).filter(Boolean))
    );
};

export const hasRole = (user, roleName) => {
    const expectedRole = normalizeRoleName(roleName);
    if (!expectedRole) {
        return false;
    }

    const userRoles = toCanonicalRoleList([user?.role_name, ...(user?.roles || [])]);
    return userRoles.includes(expectedRole);
};

export const isAdminRole = (value) => normalizeRoleName(value) === 'ADMIN';

export const isAdminUser = (user) => (
    isAdminRole(user?.role_name)
    || Number(user?.role_id) === 1
    || toCanonicalRoleList(user?.roles || []).includes('ADMIN')
);

export const isLegacyHrAdminRole = (value) => String(value || '').trim().toUpperCase() === 'HR_ADMIN';
