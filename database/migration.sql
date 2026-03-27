-- AXIS HRIS incremental migration for existing databases
-- Safe to run multiple times (idempotent)

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ref_sync_status (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS ext_microsip_department (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_department_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ext_microsip_job_title (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    microsip_job_title_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ext_microsip_country (
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

CREATE TABLE IF NOT EXISTS ext_microsip_state (
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


CREATE TABLE IF NOT EXISTS ext_microsip_city (
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


CREATE TABLE IF NOT EXISTS ext_microsip_employee (
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


CREATE TABLE IF NOT EXISTS employee_microsip_links (
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

CREATE TABLE IF NOT EXISTS employee_axis_identity (
    employee_id BIGINT UNSIGNED PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NULL,
    gender VARCHAR(20) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_axis_identity_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS ext_microsip_employee_compensation (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_social_security (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_labor (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_personal (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_contact (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_address (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_family (
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

CREATE TABLE IF NOT EXISTS ext_microsip_employee_payment_account (
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

CREATE TABLE IF NOT EXISTS ext_microsip_payroll_payment (
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


CREATE TABLE IF NOT EXISTS ext_microsip_sync_log (
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

DELIMITER $$

DROP PROCEDURE IF EXISTS ensure_column $$
CREATE PROCEDURE ensure_column(
    IN p_table VARCHAR(128),
    IN p_column VARCHAR(128),
    IN p_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = p_table
          AND column_name = p_column
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS ensure_index $$
CREATE PROCEDURE ensure_index(
    IN p_table VARCHAR(128),
    IN p_index VARCHAR(128),
    IN p_sql TEXT
)
BEGIN
    DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = p_table
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = p_table
          AND index_name = p_index
    ) THEN
        SET @sql = p_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS ensure_foreign_key $$
CREATE PROCEDURE ensure_foreign_key(
    IN p_table VARCHAR(128),
    IN p_constraint VARCHAR(128),
    IN p_sql TEXT
)
BEGIN
    DECLARE CONTINUE HANDLER FOR 1826 BEGIN END;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = p_table
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = DATABASE()
          AND table_name = p_table
          AND constraint_name = p_constraint
          AND constraint_type = 'FOREIGN KEY'
    ) THEN
        SET @sql = p_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS ensure_drop_column $$
CREATE PROCEDURE ensure_drop_column(
    IN p_table VARCHAR(128),
    IN p_column VARCHAR(128)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = p_table
          AND column_name = p_column
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', p_table, '` DROP COLUMN `', p_column, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

CALL ensure_column('ext_microsip_employee', 'employee_number', 'VARCHAR(50) NULL');
CALL ensure_column('ext_microsip_employee', 'source_payload', 'JSON NULL');
CALL ensure_column('ext_microsip_employee', 'synced_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL ensure_column('users', 'photo_path', 'VARCHAR(500) NULL');
CALL ensure_column('users', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL ensure_column('users', 'password_changed_at', 'TIMESTAMP NULL');

CALL ensure_column('ext_microsip_employee_compensation', 'payroll_regime', 'VARCHAR(80) NULL');
CALL ensure_column('ext_microsip_employee_compensation', 'contribution_base_amount', 'DECIMAL(15,2) NULL');
CALL ensure_column('ext_microsip_employee_compensation', 'source_payload', 'JSON NULL');

CALL ensure_column('ext_microsip_employee_social_security', 'employee_contribution_amount', 'DECIMAL(15,2) NULL');
CALL ensure_column('ext_microsip_employee_social_security', 'employer_contribution_amount', 'DECIMAL(15,2) NULL');
CALL ensure_column('ext_microsip_employee_social_security', 'total_contribution_amount', 'DECIMAL(15,2) NULL');
CALL ensure_column('ext_microsip_employee_social_security', 'source_payload', 'JSON NULL');

CALL ensure_column('employee_documents', 'status_code', 'VARCHAR(20) NOT NULL DEFAULT ''pending''');
CALL ensure_column('employee_documents', 'review_note', 'TEXT NULL');
CALL ensure_column('employee_documents', 'reviewed_by_user_id', 'BIGINT UNSIGNED NULL');
CALL ensure_column('employee_documents', 'reviewed_at', 'TIMESTAMP NULL');
CALL ensure_column('employee_documents', 'uploaded_by_user_id', 'BIGINT UNSIGNED NULL');
CALL ensure_column('employee_documents', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

DELIMITER $$

DROP PROCEDURE IF EXISTS normalize_employee_canonical $$
CREATE PROCEDURE normalize_employee_canonical()
BEGIN
    DECLARE has_first_name INT DEFAULT 0;
    DECLARE has_last_name INT DEFAULT 0;

    SELECT COUNT(*) INTO has_first_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'employees'
      AND column_name = 'first_name';

    SELECT COUNT(*) INTO has_last_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'employees'
      AND column_name = 'last_name';

    IF has_first_name > 0 AND has_last_name > 0 THEN
        SET @copy_identity_sql = '
            INSERT INTO employee_axis_identity (employee_id, first_name, last_name, birth_date, gender)
            SELECT
                e.id,
                COALESCE(NULLIF(TRIM(e.first_name), ''''), ''Sin nombre''),
                COALESCE(NULLIF(TRIM(e.last_name), ''''), ''Sin apellido''),
                e.birth_date,
                NULLIF(TRIM(e.gender), '''')
            FROM employees e
            LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
            WHERE eml.employee_id IS NULL
            ON DUPLICATE KEY UPDATE
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                birth_date = VALUES(birth_date),
                gender = VALUES(gender)
        ';
        PREPARE stmt FROM @copy_identity_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;

    DELETE ai
    FROM employee_axis_identity ai
    JOIN employee_microsip_links eml ON eml.employee_id = ai.employee_id;

    CALL ensure_drop_column('employees', 'birth_date');
    CALL ensure_drop_column('employees', 'gender');
    CALL ensure_drop_column('employees', 'first_name');
    CALL ensure_drop_column('employees', 'last_name');
END $$

DELIMITER ;

CALL normalize_employee_canonical();
DROP PROCEDURE IF EXISTS normalize_employee_canonical;

CALL ensure_index(
  'ext_microsip_state',
  'idx_ext_microsip_state_country',
  'CREATE INDEX `idx_ext_microsip_state_country` ON `ext_microsip_state` (`country_ext_id`)'
);
CALL ensure_index(
  'ext_microsip_city',
  'idx_ext_microsip_city_state',
  'CREATE INDEX `idx_ext_microsip_city_state` ON `ext_microsip_city` (`state_ext_id`)'
);
CALL ensure_index(
  'ext_microsip_employee',
  'idx_ext_microsip_employee_department',
  'CREATE INDEX `idx_ext_microsip_employee_department` ON `ext_microsip_employee` (`department_ext_id`)'
);
CALL ensure_index(
  'ext_microsip_employee',
  'idx_ext_microsip_employee_job_title',
  'CREATE INDEX `idx_ext_microsip_employee_job_title` ON `ext_microsip_employee` (`job_title_ext_id`)'
);
CALL ensure_index(
  'employee_microsip_links',
  'idx_employee_microsip_links_link_source',
  'CREATE INDEX `idx_employee_microsip_links_link_source` ON `employee_microsip_links` (`link_source`)'
);
CALL ensure_index(
  'ext_microsip_payroll_payment',
  'idx_ext_microsip_payroll_payment_employee',
  'CREATE INDEX `idx_ext_microsip_payroll_payment_employee` ON `ext_microsip_payroll_payment` (`employee_ext_id`)'
);
CALL ensure_index(
  'ext_microsip_payroll_payment',
  'idx_ext_microsip_payroll_payment_date',
  'CREATE INDEX `idx_ext_microsip_payroll_payment_date` ON `ext_microsip_payroll_payment` (`payment_date`)'
);
CALL ensure_index(
  'ext_microsip_payroll_payment',
  'idx_ext_microsip_payroll_payment_employee_date',
  'CREATE INDEX `idx_ext_microsip_payroll_payment_employee_date` ON `ext_microsip_payroll_payment` (`employee_ext_id`, `payment_date`)'
);
CALL ensure_index(
  'employee_documents',
  'idx_employee_documents_status_code',
  'CREATE INDEX `idx_employee_documents_status_code` ON `employee_documents` (`status_code`)'
);
CALL ensure_index(
  'employee_documents',
  'idx_employee_documents_expiry_date',
  'CREATE INDEX `idx_employee_documents_expiry_date` ON `employee_documents` (`expiry_date`)'
);

CALL ensure_foreign_key(
  'employee_documents',
  'fk_employee_documents_reviewed_by',
  'ALTER TABLE `employee_documents` ADD CONSTRAINT `fk_employee_documents_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL'
);
CALL ensure_foreign_key(
  'employee_documents',
  'fk_employee_documents_uploaded_by',
  'ALTER TABLE `employee_documents` ADD CONSTRAINT `fk_employee_documents_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL'
);

UPDATE employee_documents
SET status_code = 'pending'
WHERE status_code IS NULL OR TRIM(status_code) = '';

DROP PROCEDURE IF EXISTS ensure_column;
DROP PROCEDURE IF EXISTS ensure_index;
DROP PROCEDURE IF EXISTS ensure_foreign_key;
DROP PROCEDURE IF EXISTS ensure_drop_column;

INSERT IGNORE INTO ref_sync_status (code, label) VALUES
('pending', 'Pendiente'),
('running', 'En progreso'),
('success', 'Exitoso'),
('failed', 'Fallido');

INSERT IGNORE INTO permissions (code, description) VALUES
('view_profile_self', 'Puede consultar su propio perfil 360'),
('view_profile_employee', 'Puede consultar el perfil 360 de colaboradores'),
('view_payroll_self', 'Puede consultar su historial de pagos'),
('view_payroll_employee', 'Puede consultar historial de pagos de colaboradores');

INSERT IGNORE INTO document_categories (name) VALUES
('Acta de nacimiento'),
('CURP'),
('RFC'),
('NSS/IMSS'),
('INE'),
('Comprobante de domicilio'),
('Contrato firmado'),
('Constancia de situacion fiscal'),
('Certificados medicos'),
('Otros');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('view_profile_self', 'view_payroll_self')
WHERE r.name = 'EMPLEADO';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('view_profile_self', 'view_profile_employee', 'view_payroll_self')
WHERE r.name = 'SUPERVISOR';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('view_profile_self', 'view_profile_employee', 'view_payroll_self', 'view_payroll_employee')
WHERE r.name = 'RRHH';

-- Phase 0: Identity and access normalization
INSERT IGNORE INTO roles (name, description) VALUES
('RRHH', 'Gestion integral de empleados y expediente digital');

INSERT IGNORE INTO permissions (code, description) VALUES
('manage_axis_accounts', 'Puede crear y administrar cuentas AXIS de colaboradores'),
('assign_system_roles', 'Puede asignar roles de sistema a cuentas AXIS'),
('reset_user_passwords', 'Puede restablecer contrasenas de cuentas AXIS'),
('toggle_user_accounts', 'Puede bloquear o desbloquear cuentas AXIS');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'manage_axis_accounts',
    'assign_system_roles',
    'reset_user_passwords',
    'toggle_user_accounts'
)
WHERE r.name IN ('ADMIN', 'RRHH');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT rrhh.id, rp.permission_id
FROM roles legacy
JOIN roles rrhh ON rrhh.name = 'RRHH'
JOIN role_permissions rp ON rp.role_id = legacy.id
WHERE UPPER(TRIM(legacy.name)) = 'HR_ADMIN';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT ur.user_id, rrhh.id
FROM user_roles ur
JOIN roles legacy ON legacy.id = ur.role_id
JOIN roles rrhh ON rrhh.name = 'RRHH'
WHERE UPPER(TRIM(legacy.name)) = 'HR_ADMIN';

DELETE ur
FROM user_roles ur
JOIN roles legacy ON legacy.id = ur.role_id
WHERE UPPER(TRIM(legacy.name)) = 'HR_ADMIN';

DELETE rp
FROM role_permissions rp
JOIN roles legacy ON legacy.id = rp.role_id
WHERE UPPER(TRIM(legacy.name)) = 'HR_ADMIN';

DELETE FROM roles
WHERE UPPER(TRIM(name)) = 'HR_ADMIN';
