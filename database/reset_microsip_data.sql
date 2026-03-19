-- Reset only Microsip snapshot/integration data (keeps users, roles, employees, auth)
-- Idempotent: truncates only tables that already exist.

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS safe_truncate $$
CREATE PROCEDURE safe_truncate(IN p_table VARCHAR(128))
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = p_table
    ) THEN
        SET @sql = CONCAT('TRUNCATE TABLE `', p_table, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

CALL safe_truncate('ext_microsip_payroll_payment');
CALL safe_truncate('ext_microsip_employee_payment_account');
CALL safe_truncate('ext_microsip_employee_family');
CALL safe_truncate('ext_microsip_employee_address');
CALL safe_truncate('ext_microsip_employee_contact');
CALL safe_truncate('ext_microsip_employee_personal');
CALL safe_truncate('ext_microsip_employee_labor');
CALL safe_truncate('ext_microsip_employee_social_security');
CALL safe_truncate('ext_microsip_employee_compensation');
CALL safe_truncate('ext_microsip_employee_compesation');
CALL safe_truncate('employee_microsip_links');
CALL safe_truncate('ext_microsip_employee');
CALL safe_truncate('ext_microsip_city');
CALL safe_truncate('ext_microsip_state');
CALL safe_truncate('ext_microsip_country');
CALL safe_truncate('ext_microsip_job_title');
CALL safe_truncate('ext_microsip_department');
CALL safe_truncate('ext_microsip_sync_log');

DROP PROCEDURE IF EXISTS safe_truncate;

SET FOREIGN_KEY_CHECKS = 1;
