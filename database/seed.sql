-- Initial Seed for LINHER Axis HRIS

INSERT IGNORE INTO ref_sync_status (code, label) VALUES
('pending', 'Pendiente'),
('running', 'En progreso'),
('success', 'Exitoso'),
('failed', 'Fallido');

INSERT IGNORE INTO roles (name, description) VALUES
('ADMIN', 'Acceso total a modulos y configuracion del sistema'),
('SUPERVISOR', 'Gestion operativa y aprobaciones de equipo'),
('RRHH', 'Gestion integral de empleados y expediente digital'),
('EMPLEADO', 'Autoservicio y visibilidad de perfil propio'),
('RECLUTADOR', 'Gestion de vacantes y candidatos');

INSERT IGNORE INTO permissions (code, description) VALUES
('view_dashboard', 'Puede consultar el dashboard'),
('view_employees', 'Puede consultar el directorio de empleados'),
('create_employee', 'Puede crear empleados'),
('edit_employee', 'Puede editar informacion de empleados'),
('view_documents', 'Puede consultar documentos de empleados'),
('manage_documents', 'Puede cargar y administrar documentos de empleados'),
('validate_documents', 'Puede validar documentos en expediente'),
('manage_requests', 'Puede gestionar solicitudes'),
('approve_requests', 'Puede aprobar o rechazar solicitudes'),
('view_calendar', 'Puede consultar calendario organizacional'),
('view_audit_logs', 'Puede consultar bitacora de auditoria'),
('manage_roles', 'Puede gestionar roles y permisos'),
('manage_recruitment', 'Puede gestionar vacantes y candidatos');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.name = 'ADMIN'
    OR (r.name = 'SUPERVISOR' AND p.code IN (
        'view_dashboard',
        'view_employees',
        'view_documents',
        'manage_requests',
        'approve_requests',
        'view_calendar'
    ))
    OR (r.name = 'RRHH' AND p.code IN (
        'view_dashboard',
        'view_employees',
        'create_employee',
        'edit_employee',
        'view_documents',
        'manage_documents',
        'validate_documents',
        'manage_requests',
        'approve_requests',
        'view_calendar',
        'view_audit_logs'
    ))
    OR (r.name = 'EMPLEADO' AND p.code IN (
        'view_dashboard',
        'view_documents',
        'manage_requests',
        'view_calendar'
    ))
    OR (r.name = 'RECLUTADOR' AND p.code IN (
        'view_dashboard',
        'view_employees',
        'manage_recruitment',
        'view_calendar'
    ))
);

-- Initial User (Password: password123)
INSERT IGNORE INTO users (email, password_hash, status)
VALUES (
    'admin@linher.com.mx',
    '$argon2id$v=19$m=65536,t=3,p=4$Eb3pU4So1T7SynNxsleLrg$mtFgjH41bJCpuiGWmRc3JB6xLbnfquUcK1K/I+KwQgo',
    'active'
);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ADMIN'
WHERE u.email = 'admin@linher.com.mx';
