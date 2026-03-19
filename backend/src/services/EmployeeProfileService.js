
const normalizeText = (value, fallback = null) => {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
};

const toInteger = (value, fallback = null) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

const normalizeLimit = (value, fallback = 20) => Math.min(Math.max(toInteger(value, fallback), 1), 100);

const normalizeDateFilter = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

const buildLocationLabel = (name, microsipId) => {
    const normalizedName = normalizeText(name);
    const normalizedId = normalizeText(microsipId);

    if (!normalizedName && !normalizedId) {
        return null;
    }

    if (!normalizedName) {
        return `ID ${normalizedId}`;
    }

    if (!normalizedId) {
        return normalizedName;
    }

    return `${normalizedName} (${normalizedId})`;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export class EmployeeProfileService {
    constructor(db) {
        this.db = db;
    }

    async findInternalEmployeeIdByUserId(userId) {
        const normalizedUserId = toInteger(userId);
        if (!normalizedUserId) {
            return null;
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM employees
             WHERE user_id = ?
             LIMIT 1`,
            [normalizedUserId]
        );

        return rows[0] ? Number(rows[0].id) : null;
    }

    async isSupervisorOfEmployee(supervisorEmployeeId, targetEmployeeId) {
        const normalizedSupervisorId = toInteger(supervisorEmployeeId);
        const normalizedTargetId = toInteger(targetEmployeeId);

        if (!normalizedSupervisorId || !normalizedTargetId) {
            return false;
        }

        if (normalizedSupervisorId === normalizedTargetId) {
            return true;
        }

        const [rows] = await this.db.query(
            `SELECT ej.id
             FROM employee_jobs ej
             WHERE ej.employee_id = ?
               AND ej.manager_id = ?
               AND ej.current_job_flag = 1
             LIMIT 1`,
            [normalizedTargetId, normalizedSupervisorId]
        );

        return rows.length > 0;
    }

    async getProfileByInternalEmployeeId(employeeId) {
        const normalizedEmployeeId = toInteger(employeeId);
        if (!normalizedEmployeeId) {
            return null;
        }

        const [rows] = await this.db.query(
            `SELECT
                e.id AS internal_employee_id,
                e.user_id,
                e.internal_id,
                e.first_name AS internal_first_name,
                e.last_name AS internal_last_name,
                eml.id AS link_id,
                eml.link_source,
                eml.linked_at,
                eml.updated_at AS link_updated_at,
                ext.id AS employee_ext_id,
                ext.microsip_employee_id,
                ext.employee_number,
                ext.first_name,
                ext.last_name,
                ext.employment_status,
                ext.hired_at,
                ext.terminated_at,
                ext.synced_at AS employee_synced_at,
                dep.microsip_department_id,
                dep.name AS department_name,
                jt.microsip_job_title_id,
                jt.name AS job_title_name,
                labor.manager_microsip_employee_id,
                labor.manager_name,
                labor.contract_type,
                labor.payment_method,
                labor.shift_code,
                labor.shift_name,
                labor.schedule,
                labor.workday_hours,
                labor.payroll_regime_code,
                labor.sat_contract_code,
                labor.sat_workday_code,
                labor.sat_entry_code,
                labor.is_unionized,
                labor.antiquity_table_code,
                labor.synced_at AS labor_synced_at,
                comp.salary_daily,
                comp.salary_integrated_daily,
                comp.salary_currency,
                comp.salary_type,
                comp.payroll_regime,
                comp.contribution_base_amount,
                comp.synced_at AS compensation_synced_at,
                ss.social_security_number,
                ss.imss_clinic_code,
                ss.employee_contribution_amount,
                ss.employer_contribution_amount,
                ss.total_contribution_amount,
                ss.synced_at AS social_security_synced_at,
                personal.sex_code,
                personal.birth_date,
                personal.marital_status_code,
                personal.children_count,
                personal.rfc,
                personal.curp,
                personal.alt_registry_code,
                personal.social_security_registry,
                personal.synced_at AS personal_synced_at,
                contact.email,
                contact.phone_primary,
                contact.phone_secondary,
                contact.synced_at AS contact_synced_at,
                addr.full_address,
                addr.street_name,
                addr.exterior_number,
                addr.interior_number,
                addr.neighborhood,
                addr.locality,
                addr.reference_note,
                addr.postal_code,
                addr.synced_at AS address_synced_at,
                family.father_name,
                family.mother_name,
                family.synced_at AS family_synced_at,
                pay.payment_group_code,
                pay.payment_account_type,
                pay.payment_account_number,
                pay.synced_at AS payment_account_synced_at,
                city.microsip_city_id AS address_city_id,
                city.name AS address_city_name,
                state.microsip_state_id AS address_state_id,
                state.name AS address_state_name,
                country.microsip_country_id AS address_country_id,
                country.name AS address_country_name,
                birth_city.microsip_city_id AS birth_city_id,
                birth_city.name AS birth_city_name,
                birth_state.microsip_state_id AS birth_state_id,
                birth_state.name AS birth_state_name,
                birth_country.microsip_country_id AS birth_country_id,
                birth_country.name AS birth_country_name
             FROM employees e
             LEFT JOIN employee_microsip_links eml ON eml.employee_id = e.id
             LEFT JOIN ext_microsip_employee ext ON ext.id = eml.microsip_employee_ext_id
             LEFT JOIN ext_microsip_department dep ON dep.id = ext.department_ext_id
             LEFT JOIN ext_microsip_job_title jt ON jt.id = ext.job_title_ext_id
             LEFT JOIN ext_microsip_employee_labor labor ON labor.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_compensation comp ON comp.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_social_security ss ON ss.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_personal personal ON personal.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_contact contact ON contact.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_address addr ON addr.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_family family ON family.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_payment_account pay ON pay.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_city city ON city.id = addr.city_ext_id
             LEFT JOIN ext_microsip_state state ON state.id = city.state_ext_id
             LEFT JOIN ext_microsip_country country ON country.id = state.country_ext_id
             LEFT JOIN ext_microsip_city birth_city ON birth_city.id = personal.birth_city_ext_id
             LEFT JOIN ext_microsip_state birth_state ON birth_state.id = birth_city.state_ext_id
             LEFT JOIN ext_microsip_country birth_country ON birth_country.id = birth_state.country_ext_id
             WHERE e.id = ?
             LIMIT 1`,
            [normalizedEmployeeId]
        );

        if (!rows.length) {
            return null;
        }

        const row = rows[0];
        if (!row.employee_ext_id) {
            return {
                internal_employee_id: Number(row.internal_employee_id),
                internal_id: row.internal_id,
                employee_ext_id: null,
                linked: false,
            };
        }

        const payrollSummary = await this.getPayrollSummaryByEmployeeExtId(Number(row.employee_ext_id));
        return this.buildProfilePayload(row, payrollSummary);
    }
    async getEmployeeExtIdByInternalEmployeeId(employeeId) {
        const normalizedEmployeeId = toInteger(employeeId);
        if (!normalizedEmployeeId) {
            return null;
        }

        const [rows] = await this.db.query(
            `SELECT eml.microsip_employee_ext_id
             FROM employee_microsip_links eml
             WHERE eml.employee_id = ?
             LIMIT 1`,
            [normalizedEmployeeId]
        );

        return rows[0] ? Number(rows[0].microsip_employee_ext_id) : null;
    }

    async listPayrollPaymentsByEmployeeExtId(employeeExtId, options = {}) {
        const normalizedEmployeeExtId = toInteger(employeeExtId);
        if (!normalizedEmployeeExtId) {
            return [];
        }

        const limit = normalizeLimit(options.limit, 20);
        const dateFrom = normalizeDateFilter(options.date_from);
        const dateTo = normalizeDateFilter(options.date_to);

        const where = ['employee_ext_id = ?'];
        const params = [normalizedEmployeeExtId];

        if (dateFrom) {
            where.push('payment_date >= ?');
            params.push(dateFrom);
        }

        if (dateTo) {
            where.push('payment_date <= ?');
            params.push(dateTo);
        }

        params.push(limit);

        const [rows] = await this.db.query(
            `SELECT
                id,
                microsip_payroll_payment_id,
                payroll_batch_id,
                payment_date,
                payroll_type,
                payment_method,
                payment_type,
                salary_type,
                integrated_salary,
                total_earnings,
                total_deductions,
                total_other_payments,
                net_amount,
                is_applied,
                is_sent,
                sent_email,
                synced_at
             FROM ext_microsip_payroll_payment
             WHERE ${where.join(' AND ')}
             ORDER BY payment_date DESC, id DESC
             LIMIT ?`,
            params
        );

        return rows;
    }

    async getPayrollSummaryByEmployeeExtId(employeeExtId) {
        const normalizedEmployeeExtId = toInteger(employeeExtId);
        if (!normalizedEmployeeExtId) {
            return {
                total_payments: 0,
                last_payment: null,
                net_last_90_days: 0,
                last_sync_at: null,
            };
        }

        const [summaryRows] = await this.db.query(
            `SELECT
                COUNT(*) AS total_payments,
                MAX(synced_at) AS last_sync_at,
                COALESCE(SUM(CASE
                    WHEN payment_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) THEN net_amount
                    ELSE 0
                END), 0) AS net_last_90_days
             FROM ext_microsip_payroll_payment
             WHERE employee_ext_id = ?`,
            [normalizedEmployeeExtId]
        );

        const [lastPaymentRows] = await this.db.query(
            `SELECT
                payment_date,
                payroll_type,
                payment_method,
                total_earnings,
                total_deductions,
                net_amount
             FROM ext_microsip_payroll_payment
             WHERE employee_ext_id = ?
             ORDER BY payment_date DESC, id DESC
             LIMIT 1`,
            [normalizedEmployeeExtId]
        );

        return {
            total_payments: Number(summaryRows[0]?.total_payments || 0),
            last_sync_at: summaryRows[0]?.last_sync_at || null,
            net_last_90_days: Number(summaryRows[0]?.net_last_90_days || 0),
            last_payment: lastPaymentRows[0] || null,
        };
    }

    buildProfilePayload(row, payrollSummary) {
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();

        return {
            internal_employee_id: Number(row.internal_employee_id),
            internal_id: row.internal_id,
            employee_ext_id: Number(row.employee_ext_id),
            linked: true,
            identity: {
                microsip_employee_id: row.microsip_employee_id,
                employee_number: row.employee_number,
                full_name: fullName,
                first_name: row.first_name,
                last_name: row.last_name,
                employment_status: row.employment_status,
                hired_at: row.hired_at,
                terminated_at: row.terminated_at,
                department: {
                    microsip_department_id: row.microsip_department_id,
                    name: row.department_name,
                },
                job_title: {
                    microsip_job_title_id: row.microsip_job_title_id,
                    name: row.job_title_name,
                },
            },
            labor: {
                manager_microsip_employee_id: row.manager_microsip_employee_id,
                manager_name: row.manager_name,
                contract_type: row.contract_type,
                payment_method: row.payment_method,
                shift_code: row.shift_code,
                shift_name: row.shift_name,
                schedule: row.schedule,
                workday_hours: row.workday_hours,
                payroll_regime_code: row.payroll_regime_code,
                sat_contract_code: row.sat_contract_code,
                sat_workday_code: row.sat_workday_code,
                sat_entry_code: row.sat_entry_code,
                is_unionized: Boolean(row.is_unionized),
                antiquity_table_code: row.antiquity_table_code,
            },
            compensation: {
                salary_daily: row.salary_daily,
                salary_integrated_daily: row.salary_integrated_daily,
                salary_currency: row.salary_currency,
                salary_type: row.salary_type,
                payroll_regime: row.payroll_regime,
                contribution_base_amount: row.contribution_base_amount,
            },
            social_security: {
                social_security_number: row.social_security_number,
                imss_clinic_code: row.imss_clinic_code,
                employee_contribution_amount: row.employee_contribution_amount,
                employer_contribution_amount: row.employer_contribution_amount,
                total_contribution_amount: row.total_contribution_amount,
            },
            personal: {
                sex_code: row.sex_code,
                birth_date: row.birth_date,
                marital_status_code: row.marital_status_code,
                children_count: row.children_count,
                rfc: row.rfc,
                curp: row.curp,
                alt_registry_code: row.alt_registry_code,
                social_security_registry: row.social_security_registry,
            },
            contact: {
                email: row.email,
                phone_primary: row.phone_primary,
                phone_secondary: row.phone_secondary,
            },
            address: {
                full_address: row.full_address,
                street_name: row.street_name,
                exterior_number: row.exterior_number,
                interior_number: row.interior_number,
                neighborhood: row.neighborhood,
                locality: row.locality,
                reference_note: row.reference_note,
                postal_code: row.postal_code,
            },
            family: {
                father_name: row.father_name,
                mother_name: row.mother_name,
            },
            payment_account: {
                payment_group_code: row.payment_group_code,
                payment_account_type: row.payment_account_type,
                payment_account_number: row.payment_account_number,
            },
            location: {
                city: {
                    microsip_city_id: row.address_city_id,
                    name: row.address_city_name,
                    label: buildLocationLabel(row.address_city_name, row.address_city_id),
                },
                state: {
                    microsip_state_id: row.address_state_id,
                    name: row.address_state_name,
                    label: buildLocationLabel(row.address_state_name, row.address_state_id),
                },
                country: {
                    microsip_country_id: row.address_country_id,
                    name: row.address_country_name,
                    label: buildLocationLabel(row.address_country_name, row.address_country_id),
                },
                birth_city: {
                    microsip_city_id: row.birth_city_id,
                    name: row.birth_city_name,
                    label: buildLocationLabel(row.birth_city_name, row.birth_city_id),
                },
                birth_state: {
                    microsip_state_id: row.birth_state_id,
                    name: row.birth_state_name,
                    label: buildLocationLabel(row.birth_state_name, row.birth_state_id),
                },
                birth_country: {
                    microsip_country_id: row.birth_country_id,
                    name: row.birth_country_name,
                    label: buildLocationLabel(row.birth_country_name, row.birth_country_id),
                },
            },
            payroll_summary: payrollSummary,
            sync_meta: {
                employee_synced_at: row.employee_synced_at,
                labor_synced_at: row.labor_synced_at,
                compensation_synced_at: row.compensation_synced_at,
                social_security_synced_at: row.social_security_synced_at,
                personal_synced_at: row.personal_synced_at,
                contact_synced_at: row.contact_synced_at,
                address_synced_at: row.address_synced_at,
                family_synced_at: row.family_synced_at,
                payment_account_synced_at: row.payment_account_synced_at,
                payroll_synced_at: payrollSummary?.last_sync_at || null,
                link_source: row.link_source,
                linked_at: row.linked_at,
                link_updated_at: row.link_updated_at,
            },
        };
    }

    toSupervisorSummary(profile) {
        const summarized = clone(profile);
        if (!summarized.linked) {
            return summarized;
        }

        summarized.social_security = null;
        summarized.family = null;
        summarized.payment_account = null;
        summarized.payroll_summary = null;

        if (summarized.personal) {
            summarized.personal.rfc = null;
            summarized.personal.curp = null;
            summarized.personal.alt_registry_code = null;
            summarized.personal.social_security_registry = null;
        }

        return summarized;
    }
}

export const createEmployeeProfileService = (db) => new EmployeeProfileService(db);
