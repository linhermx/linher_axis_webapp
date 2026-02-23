-- Initial Seed for LINHER Axis HRIS
INSERT INTO roles (name, description) VALUES ('HR_ADMIN', 'Full access to all HR functions');

INSERT INTO permissions (code, description) VALUES 
('VIEW_EMPLOYEES', 'Can see employee directory'),
('CREATE_EMPLOYEE', 'Can add new employees'),
('VIEW_COMPENSATION', 'Can see salary data'),
('VIEW_AUDIT_LOGS', 'Can see system logs');

INSERT INTO role_permissions (role_id, permission_id) VALUES 
(1, 1), (1, 2), (1, 3), (1, 4);

-- Initial User (Password: password123)
-- $argon2id$v=19$m=65536,t=3,p=4$6Fk... (Omitted for brevity in SQL file, use a script to generate)
INSERT INTO users (email, password_hash, status) VALUES ('admin@linher.com.mx', '$argon2id$v=19$m=65536,t=3,p=4$Eb3pU4So1T7SynNxsleLrg$mtFgjH41bJCpuiGWmRc3JB6xLbnfquUcK1K/I+KwQgo', 'active');

INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);
