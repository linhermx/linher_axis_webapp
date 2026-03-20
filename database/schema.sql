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
    last_used_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    revoked_reason VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);

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
    end_date DATE NULL,
    schedule VARCHAR(100) NULL,
    salary DECIMAL(15, 2) NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    current_job_flag TINYINT(1) NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_employee_jobs_current_job_flag
        CHECK (current_job_flag = 1 OR current_job_flag IS NULL),
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
CREATE INDEX idx_employee_jobs_end_date ON employee_jobs(end_date);
CREATE UNIQUE INDEX uq_employee_jobs_active_slot ON employee_jobs(employee_id, current_job_flag);

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
    status_code VARCHAR(20) NOT NULL DEFAULT 'pending',
    review_note TEXT NULL,
    reviewed_by_user_id BIGINT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    uploaded_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_documents_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_employee_documents_category
        FOREIGN KEY (category_id) REFERENCES document_categories(id),
    CONSTRAINT fk_employee_documents_reviewed_by
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_employee_documents_uploaded_by
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_category_id ON employee_documents(category_id);
CREATE INDEX idx_employee_documents_status_code ON employee_documents(status_code);
CREATE INDEX idx_employee_documents_expiry_date ON employee_documents(expiry_date);

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

CREATE TABLE ext_microsip_country (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_country_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    abbrev VARCHAR(20) NULL,
    fiscal_key VARCHAR(20) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE ext_microsip_state (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_state_id VARCHAR(100) NOT NULL UNIQUE,
    country_ext_id BIGINT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    abbrev VARCHAR(20) NULL,
    fiscal_key VARCHAR(20) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_state_country
        FOREIGN KEY (country_ext_id) REFERENCES ext_microsip_country(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ext_microsip_state_country ON ext_microsip_state(country_ext_id);

CREATE TABLE ext_microsip_city (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_city_id VARCHAR(100) NOT NULL UNIQUE,
    state_ext_id BIGINT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    fiscal_key VARCHAR(20) NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_city_state
        FOREIGN KEY (state_ext_id) REFERENCES ext_microsip_state(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ext_microsip_city_state ON ext_microsip_city(state_ext_id);

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

CREATE TABLE employee_microsip_links (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL UNIQUE,
    microsip_employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    link_source VARCHAR(60) NOT NULL DEFAULT 'employee_number',
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_microsip_links_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_employee_microsip_links_ext_employee
        FOREIGN KEY (microsip_employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_employee_microsip_links_link_source ON employee_microsip_links(link_source);

CREATE TABLE ext_microsip_employee_compensation (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    salary_daily DECIMAL(15, 2) NULL,
    salary_integrated_daily DECIMAL(15, 2) NULL,
    salary_currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    salary_type VARCHAR(50) NULL,
    payroll_regime VARCHAR(80) NULL,
    contribution_base_amount DECIMAL(15, 2) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_compensation_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_ext_microsip_employee_compensation_salary_daily
    ON ext_microsip_employee_compensation(salary_daily);
CREATE INDEX idx_ext_microsip_employee_compensation_contribution_base
    ON ext_microsip_employee_compensation(contribution_base_amount);

CREATE TABLE ext_microsip_employee_social_security (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    social_security_number VARCHAR(40) NULL,
    imss_clinic_code VARCHAR(20) NULL,
    employee_contribution_amount DECIMAL(15, 2) NULL,
    employer_contribution_amount DECIMAL(15, 2) NULL,
    total_contribution_amount DECIMAL(15, 2) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_social_security_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_ext_microsip_employee_social_security_nss
    ON ext_microsip_employee_social_security(social_security_number);

CREATE TABLE ext_microsip_employee_labor (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    manager_microsip_employee_id VARCHAR(100) NULL,
    manager_name VARCHAR(220) NULL,
    contract_type VARCHAR(50) NULL,
    payment_method VARCHAR(30) NULL,
    shift_code VARCHAR(20) NULL,
    shift_name VARCHAR(60) NULL,
    schedule VARCHAR(120) NULL,
    workday_hours DECIMAL(6, 2) NULL,
    payroll_regime_code VARCHAR(10) NULL,
    sat_contract_code VARCHAR(20) NULL,
    sat_workday_code VARCHAR(20) NULL,
    sat_entry_code VARCHAR(20) NULL,
    is_unionized TINYINT(1) NOT NULL DEFAULT 0,
    antiquity_table_code VARCHAR(50) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_labor_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE TABLE ext_microsip_employee_personal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    sex_code VARCHAR(10) NULL,
    birth_date DATE NULL,
    birth_city_ext_id BIGINT UNSIGNED NULL,
    marital_status_code VARCHAR(10) NULL,
    children_count INT UNSIGNED NULL,
    rfc VARCHAR(20) NULL,
    curp VARCHAR(30) NULL,
    alt_registry_code VARCHAR(30) NULL,
    social_security_registry VARCHAR(30) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_personal_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ext_microsip_employee_personal_birth_city
        FOREIGN KEY (birth_city_ext_id) REFERENCES ext_microsip_city(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ext_microsip_employee_personal_rfc ON ext_microsip_employee_personal(rfc);
CREATE INDEX idx_ext_microsip_employee_personal_curp ON ext_microsip_employee_personal(curp);
CREATE INDEX idx_ext_microsip_employee_personal_imss_registry
    ON ext_microsip_employee_personal(social_security_registry);

CREATE TABLE ext_microsip_employee_contact (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    email VARCHAR(220) NULL,
    phone_primary VARCHAR(50) NULL,
    phone_secondary VARCHAR(50) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_contact_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_ext_microsip_employee_contact_email ON ext_microsip_employee_contact(email);

CREATE TABLE ext_microsip_employee_address (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    full_address VARCHAR(600) NULL,
    street_name VARCHAR(180) NULL,
    exterior_number VARCHAR(40) NULL,
    interior_number VARCHAR(40) NULL,
    neighborhood VARCHAR(120) NULL,
    locality VARCHAR(120) NULL,
    reference_note VARCHAR(160) NULL,
    city_ext_id BIGINT UNSIGNED NULL,
    postal_code VARCHAR(15) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_address_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ext_microsip_employee_address_city
        FOREIGN KEY (city_ext_id) REFERENCES ext_microsip_city(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ext_microsip_employee_address_postal_code
    ON ext_microsip_employee_address(postal_code);

CREATE TABLE ext_microsip_employee_family (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    father_name VARCHAR(180) NULL,
    mother_name VARCHAR(180) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_family_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE TABLE ext_microsip_employee_payment_account (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_ext_id BIGINT UNSIGNED NOT NULL UNIQUE,
    payment_group_code VARCHAR(100) NULL,
    payment_account_type VARCHAR(20) NULL,
    payment_account_number VARCHAR(60) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_employee_payment_account_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE TABLE ext_microsip_payroll_payment (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_payroll_payment_id VARCHAR(100) NOT NULL UNIQUE,
    employee_ext_id BIGINT UNSIGNED NOT NULL,
    payroll_batch_id VARCHAR(100) NULL,
    payment_date DATE NULL,
    payroll_type VARCHAR(20) NULL,
    payment_method VARCHAR(20) NULL,
    payment_type VARCHAR(20) NULL,
    salary_type VARCHAR(20) NULL,
    integrated_salary DECIMAL(15, 2) NULL,
    work_days DECIMAL(10, 2) NULL,
    work_hours DECIMAL(10, 2) NULL,
    vacation_days DECIMAL(10, 2) NULL,
    cotization_days DECIMAL(12, 4) NULL,
    absences_days DECIMAL(10, 2) NULL,
    incapacity_days DECIMAL(10, 2) NULL,
    overtime_hours DECIMAL(10, 2) NULL,
    overtime_excess_hours DECIMAL(10, 2) NULL,
    overtime_excess_amount DECIMAL(15, 2) NULL,
    base_contribution_salary DECIMAL(15, 2) NULL,
    total_earnings DECIMAL(15, 2) NULL,
    total_deductions DECIMAL(15, 2) NULL,
    total_other_payments DECIMAL(15, 2) NULL,
    total_earnings_taxable DECIMAL(15, 2) NULL,
    total_earnings_exempt DECIMAL(15, 2) NULL,
    state_tax_base DECIMAL(15, 2) NULL,
    ptu_base DECIMAL(15, 2) NULL,
    net_amount DECIMAL(15, 2) NULL,
    is_applied TINYINT(1) NOT NULL DEFAULT 0,
    is_sent TINYINT(1) NOT NULL DEFAULT 0,
    sent_email VARCHAR(220) NULL,
    source_payload JSON NULL,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ext_microsip_payroll_payment_employee
        FOREIGN KEY (employee_ext_id) REFERENCES ext_microsip_employee(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_ext_microsip_payroll_payment_employee
    ON ext_microsip_payroll_payment(employee_ext_id);
CREATE INDEX idx_ext_microsip_payroll_payment_date
    ON ext_microsip_payroll_payment(payment_date);
CREATE INDEX idx_ext_microsip_payroll_payment_employee_date
    ON ext_microsip_payroll_payment(employee_ext_id, payment_date);

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
