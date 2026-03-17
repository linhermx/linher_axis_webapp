-- LINHER Axis HRIS - Database Schema (3FN canonical)

-- Reference tables
CREATE TABLE ref_sync_status (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL
);

-- Auth and roles
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL
);

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL
);

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON DELETE CASCADE
);

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- Employees
CREATE TABLE departments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE positions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL UNIQUE,
    internal_id VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NULL,
    gender VARCHAR(20) NULL,
    CONSTRAINT fk_employees_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE employee_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    department_id BIGINT UNSIGNED NULL,
    position_id BIGINT UNSIGNED NULL,
    manager_id BIGINT UNSIGNED NULL,
    start_date DATE NULL,
    schedule VARCHAR(100) NULL,
    salary DECIMAL(15, 2) NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    CONSTRAINT fk_employee_jobs_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_employee_jobs_department
        FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT fk_employee_jobs_position
        FOREIGN KEY (position_id) REFERENCES positions(id),
    CONSTRAINT fk_employee_jobs_manager
        FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE INDEX idx_employee_jobs_employee_id ON employee_jobs(employee_id);
CREATE INDEX idx_employee_jobs_department_id ON employee_jobs(department_id);
CREATE INDEX idx_employee_jobs_position_id ON employee_jobs(position_id);

-- Organization structure
CREATE TABLE organizational_unit_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0
);

CREATE TABLE organizational_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_type_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(80) NULL UNIQUE,
    lead_employee_id BIGINT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_organizational_units_type
        FOREIGN KEY (unit_type_id) REFERENCES organizational_unit_types(id),
    CONSTRAINT fk_organizational_units_lead_employee
        FOREIGN KEY (lead_employee_id) REFERENCES employees(id)
        ON DELETE SET NULL,
    CONSTRAINT uq_organizational_units_type_name UNIQUE (unit_type_id, name)
);

CREATE TABLE organizational_unit_relations (
    parent_unit_id BIGINT UNSIGNED NOT NULL,
    child_unit_id BIGINT UNSIGNED NOT NULL,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'hierarchy',
    PRIMARY KEY (parent_unit_id, child_unit_id, relation_type),
    CONSTRAINT fk_organizational_unit_relations_parent
        FOREIGN KEY (parent_unit_id) REFERENCES organizational_units(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_organizational_unit_relations_child
        FOREIGN KEY (child_unit_id) REFERENCES organizational_units(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_organizational_unit_relations_child ON organizational_unit_relations(child_unit_id);
CREATE INDEX idx_organizational_unit_relations_type ON organizational_unit_relations(relation_type);

CREATE TABLE organizational_unit_members (
    unit_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    role_in_unit VARCHAR(80) NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    started_at DATE NULL,
    ended_at DATE NULL,
    PRIMARY KEY (unit_id, employee_id),
    CONSTRAINT fk_organizational_unit_members_unit
        FOREIGN KEY (unit_id) REFERENCES organizational_units(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_organizational_unit_members_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_organizational_unit_members_employee ON organizational_unit_members(employee_id);
CREATE INDEX idx_organizational_unit_members_ended_at ON organizational_unit_members(ended_at);

-- Documents
CREATE TABLE document_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE employee_documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    expiry_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_documents_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_employee_documents_category
        FOREIGN KEY (category_id) REFERENCES document_categories(id)
);

CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_category_id ON employee_documents(category_id);

-- Audit
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id BIGINT UNSIGNED NULL,
    old_value JSON NULL,
    new_value JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- Microsip integration (read-only snapshots)
CREATE TABLE ext_microsip_department (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_department_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE ext_microsip_job_title (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_job_title_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE ext_microsip_employee (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_employee_id VARCHAR(100) NOT NULL UNIQUE,
    employee_number VARCHAR(50) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department_ext_id BIGINT UNSIGNED NULL,
    job_title_ext_id BIGINT UNSIGNED NULL,
    employment_status VARCHAR(50) NULL,
    hired_at DATE NULL,
    terminated_at DATE NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_department
        FOREIGN KEY (department_ext_id) REFERENCES ext_microsip_department(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_ext_microsip_employee_job_title
        FOREIGN KEY (job_title_ext_id) REFERENCES ext_microsip_job_title(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ext_microsip_employee_department ON ext_microsip_employee(department_ext_id);
CREATE INDEX idx_ext_microsip_employee_job_title ON ext_microsip_employee(job_title_ext_id);

CREATE TABLE ext_microsip_sync_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    records_total INT UNSIGNED NOT NULL DEFAULT 0,
    records_processed INT UNSIGNED NOT NULL DEFAULT 0,
    records_failed INT UNSIGNED NOT NULL DEFAULT 0,
    message TEXT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    CONSTRAINT fk_ext_microsip_sync_log_status
        FOREIGN KEY (status_id) REFERENCES ref_sync_status(id),
    CONSTRAINT fk_ext_microsip_sync_log_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ext_microsip_sync_log_status ON ext_microsip_sync_log(status_id);
