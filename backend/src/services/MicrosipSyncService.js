
import { createMicrosipConnectorService } from './MicrosipConnectorService.js';

const ALLOWED_SYNC_TYPES = new Set([
    'full',
    'profile_full',
    'locations',
    'departments',
    'job_titles',
    'employees',
    'countries',
    'states',
    'cities',
    'payroll',
]);

const SYNC_PLAN = {
    full: ['locations', 'departments', 'job_titles', 'employees', 'payroll'],
    profile_full: ['locations', 'departments', 'job_titles', 'employees', 'payroll'],
    locations: ['countries', 'states', 'cities'],
    departments: ['departments'],
    job_titles: ['job_titles'],
    employees: ['employees'],
    countries: ['countries'],
    states: ['states'],
    cities: ['cities'],
    payroll: ['payroll'],
};

const toInteger = (value, fallback = null) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return fallback;
    }

    return parsed;
};

const toFiniteNumber = (value, fallback = null) => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const parsed = Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return parsed;
};

const normalizeText = (value, fallback = null) => {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
};

const normalizeBoolean = (value, fallback = false) => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    if (value === true || value === 1) {
        return true;
    }

    if (value === false || value === 0) {
        return false;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'si', 's', 'active', 'enabled'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'n', 'inactive', 'disabled'].includes(normalized)) {
        return false;
    }

    return fallback;
};

const normalizeDate = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
    }

    const parsedDate = new Date(normalized);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const pickFirst = (source, keys = [], fallback = null) => {
    for (const key of keys) {
        if (source?.[key] !== undefined && source?.[key] !== null && String(source[key]).trim() !== '') {
            return source[key];
        }
    }

    return fallback;
};

const buildLookupKeys = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return [];
    }

    return Array.from(new Set([normalized, normalized.toUpperCase(), normalized.toLowerCase()]));
};

const ensureSyncType = (value) => {
    const syncType = normalizeText(value, 'full')?.toLowerCase();
    if (!ALLOWED_SYNC_TYPES.has(syncType)) {
        const error = new Error('Tipo de sincronizacion no soportado');
        error.statusCode = 400;
        error.code = 'MICROSIP_SYNC_TYPE_INVALID';
        throw error;
    }

    return syncType;
};

const resolvePayrollRetentionMonths = (value, fallback = 24) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        return fallback;
    }

    return parsed;
};

const normalizeCountryPayload = (source) => ({
    microsip_country_id: normalizeText(pickFirst(source, ['microsip_country_id', 'country_id', 'pais_id', 'id'])),
    name: normalizeText(pickFirst(source, ['name', 'country_name', 'nombre']), 'Sin nombre'),
    abbrev: normalizeText(pickFirst(source, ['abbrev', 'abbreviation', 'code'])),
    fiscal_key: normalizeText(pickFirst(source, ['fiscal_key', 'fiscal_code', 'sat_key'])),
    is_default: normalizeBoolean(pickFirst(source, ['is_default', 'default_flag']), false),
    is_active: normalizeBoolean(pickFirst(source, ['is_active', 'active']), true),
});

const normalizeStatePayload = (source) => ({
    microsip_state_id: normalizeText(pickFirst(source, ['microsip_state_id', 'state_id', 'estado_id', 'id'])),
    microsip_country_id: normalizeText(pickFirst(source, ['microsip_country_id', 'country_id', 'pais_id'])),
    name: normalizeText(pickFirst(source, ['name', 'state_name', 'nombre']), 'Sin nombre'),
    abbrev: normalizeText(pickFirst(source, ['abbrev', 'abbreviation', 'code'])),
    fiscal_key: normalizeText(pickFirst(source, ['fiscal_key', 'fiscal_code', 'sat_key'])),
    is_default: normalizeBoolean(pickFirst(source, ['is_default', 'default_flag']), false),
    is_active: normalizeBoolean(pickFirst(source, ['is_active', 'active']), true),
});

const normalizeCityPayload = (source) => ({
    microsip_city_id: normalizeText(pickFirst(source, ['microsip_city_id', 'city_id', 'ciudad_id', 'id'])),
    microsip_state_id: normalizeText(pickFirst(source, ['microsip_state_id', 'state_id', 'estado_id'])),
    name: normalizeText(pickFirst(source, ['name', 'city_name', 'nombre']), 'Sin nombre'),
    fiscal_key: normalizeText(pickFirst(source, ['fiscal_key', 'fiscal_code', 'sat_key'])),
    is_default: normalizeBoolean(pickFirst(source, ['is_default', 'default_flag']), false),
    is_active: normalizeBoolean(pickFirst(source, ['is_active', 'active']), true),
});
const normalizeEmployeePayload = (source) => {
    const firstName = normalizeText(pickFirst(source, ['first_name', 'nombres', 'name']), 'Sin nombre');
    const lastName = normalizeText(
        pickFirst(source, ['last_name', 'apellidos', 'apellido_completo', 'paternal_last_name']),
        ''
    );

    return {
        microsip_employee_id: normalizeText(
            pickFirst(source, ['microsip_employee_id', 'employee_id', 'empleado_id', 'id'])
        ),
        employee_number: normalizeText(
            pickFirst(source, ['employee_number', 'numero', 'employee_code', 'codigo'])
        ),
        first_name: firstName,
        last_name: lastName,
        full_name: normalizeText(pickFirst(source, ['full_name', 'nombre_completo']), `${firstName} ${lastName}`.trim()),
        department_code: normalizeText(
            pickFirst(source, ['department_id', 'microsip_department_id', 'depto_no_id'])
        ),
        job_title_code: normalizeText(
            pickFirst(source, ['job_title_id', 'microsip_job_title_id', 'puesto_no_id'])
        ),
        employment_status: normalizeText(pickFirst(source, ['employment_status', 'status', 'estatus']), 'active'),
        hired_at: normalizeDate(pickFirst(source, ['hired_at', 'hire_date', 'fecha_ingreso'])),
        terminated_at: normalizeDate(pickFirst(source, ['terminated_at', 'termination_date', 'fecha_baja'])),
        manager_microsip_employee_id: normalizeText(
            pickFirst(source, ['manager_microsip_employee_id', 'manager_employee_id', 'jefe_id'])
        ),
        manager_name: normalizeText(pickFirst(source, ['manager_name', 'jefe_nombre'])),
        contract_type: normalizeText(pickFirst(source, ['contract_type', 'tipo_contrato'])),
        payment_method: normalizeText(pickFirst(source, ['payment_method', 'forma_pago'])),
        shift_code: normalizeText(pickFirst(source, ['shift_code', 'turno'])),
        shift_name: normalizeText(pickFirst(source, ['shift_name', 'turno_nombre'])),
        schedule: normalizeText(pickFirst(source, ['schedule', 'horario'])),
        workday_hours: toFiniteNumber(pickFirst(source, ['workday_hours', 'jornada_horas'])),
        payroll_regime_code: normalizeText(pickFirst(source, ['payroll_regime_code', 'regimen_fiscal'])),
        sat_contract_code: normalizeText(pickFirst(source, ['sat_contract_code', 'contrato_sat'])),
        sat_workday_code: normalizeText(pickFirst(source, ['sat_workday_code', 'jornada_sat'])),
        sat_entry_code: normalizeText(pickFirst(source, ['sat_entry_code', 'ingreso_sat'])),
        is_unionized: normalizeBoolean(pickFirst(source, ['is_unionized', 'es_sindicalizado']), false),
        antiquity_table_code: normalizeText(pickFirst(source, ['antiquity_table_code', 'tabla_antig_id'])),
        salary_daily: toFiniteNumber(pickFirst(source, ['salary_daily', 'daily_salary', 'salario_diario'])),
        salary_integrated_daily: toFiniteNumber(
            pickFirst(source, ['salary_integrated_daily', 'integrated_daily_salary', 'salario_integrado_diario'])
        ),
        salary_currency: normalizeText(pickFirst(source, ['salary_currency', 'currency']), 'MXN'),
        salary_type: normalizeText(pickFirst(source, ['salary_type', 'tipo_salario'])),
        payroll_regime: normalizeText(pickFirst(source, ['payroll_regime', 'regimen_nomina'])),
        contribution_base_amount: toFiniteNumber(
            pickFirst(source, ['contribution_base_amount', 'imss_contribution_base', 'sbc'])
        ),
        social_security_number: normalizeText(
            pickFirst(source, ['social_security_number', 'nss', 'imss'])
        ),
        imss_clinic_code: normalizeText(pickFirst(source, ['imss_clinic_code', 'clinica_imss'])),
        employee_contribution_amount: toFiniteNumber(
            pickFirst(source, ['employee_contribution_amount', 'imss_employee_contribution'])
        ),
        employer_contribution_amount: toFiniteNumber(
            pickFirst(source, ['employer_contribution_amount', 'imss_employer_contribution'])
        ),
        total_contribution_amount: toFiniteNumber(
            pickFirst(source, ['total_contribution_amount', 'imss_total_contribution'])
        ),
        sex_code: normalizeText(pickFirst(source, ['sex_code', 'sexo'])),
        birth_date: normalizeDate(pickFirst(source, ['birth_date', 'fecha_nacimiento'])),
        birth_city_code: normalizeText(pickFirst(source, ['birth_city_id', 'birth_city_code'])),
        marital_status_code: normalizeText(pickFirst(source, ['marital_status_code', 'estado_civil'])),
        children_count: toInteger(pickFirst(source, ['children_count', 'num_hijos']), null),
        rfc: normalizeText(pickFirst(source, ['rfc'])),
        curp: normalizeText(pickFirst(source, ['curp'])),
        alt_registry_code: normalizeText(pickFirst(source, ['alt_registry_code', 'other_registry', 'otro_registro'])),
        social_security_registry: normalizeText(
            pickFirst(source, ['social_security_registry', 'employer_registry_id', 'reg_imss'])
        ),
        email: normalizeText(pickFirst(source, ['email', 'correo'])),
        phone_primary: normalizeText(pickFirst(source, ['phone_primary', 'telefono1', 'phone'])),
        phone_secondary: normalizeText(pickFirst(source, ['phone_secondary', 'telefono2'])),
        full_address: normalizeText(pickFirst(source, ['full_address', 'direccion'])),
        street_name: normalizeText(pickFirst(source, ['street_name', 'calle', 'nombre_calle'])),
        exterior_number: normalizeText(pickFirst(source, ['exterior_number', 'num_exterior'])),
        interior_number: normalizeText(pickFirst(source, ['interior_number', 'num_interior'])),
        neighborhood: normalizeText(pickFirst(source, ['neighborhood', 'colonia'])),
        locality: normalizeText(pickFirst(source, ['locality', 'poblacion', 'localidad'])),
        reference_note: normalizeText(pickFirst(source, ['reference_note', 'referencia'])),
        city_code: normalizeText(pickFirst(source, ['city_id', 'microsip_city_id', 'ciudad_id'])),
        postal_code: normalizeText(pickFirst(source, ['postal_code', 'codigo_postal'])),
        father_name: normalizeText(pickFirst(source, ['father_name', 'nombre_padre'])),
        mother_name: normalizeText(pickFirst(source, ['mother_name', 'nombre_madre'])),
        payment_group_code: normalizeText(pickFirst(source, ['payment_group_code', 'grupo_pago_elect'])),
        payment_account_type: normalizeText(pickFirst(source, ['payment_account_type', 'tipo_ctaban_pago_elect'])),
        payment_account_number: normalizeText(pickFirst(source, ['payment_account_number', 'num_ctaban_pago_elect'])),
        source_payload: source,
    };
};

const normalizePayrollPaymentPayload = (source) => ({
    microsip_payroll_payment_id: normalizeText(
        pickFirst(source, ['microsip_payroll_payment_id', 'pago_nomina_id', 'id'])
    ),
    payroll_batch_id: normalizeText(pickFirst(source, ['payroll_batch_id', 'nomina_id', 'batch_id'])),
    microsip_employee_id: normalizeText(
        pickFirst(source, ['microsip_employee_id', 'employee_id', 'empleado_id'])
    ),
    payment_date: normalizeDate(pickFirst(source, ['payment_date', 'fecha_pago'])),
    payroll_type: normalizeText(pickFirst(source, ['payroll_type', 'tipo_nomina'])),
    payment_method: normalizeText(pickFirst(source, ['payment_method', 'forma_pago'])),
    payment_type: normalizeText(pickFirst(source, ['payment_type', 'tipo_pago'])),
    salary_type: normalizeText(pickFirst(source, ['salary_type', 'tipo_salario'])),
    integrated_salary: toFiniteNumber(pickFirst(source, ['integrated_salary', 'salario_integrado'])),
    work_days: toFiniteNumber(pickFirst(source, ['work_days', 'dias_trabajados'])),
    work_hours: toFiniteNumber(pickFirst(source, ['work_hours', 'horas_trabajadas'])),
    vacation_days: toFiniteNumber(pickFirst(source, ['vacation_days', 'dias_vacaciones'])),
    cotization_days: toFiniteNumber(pickFirst(source, ['cotization_days', 'dias_cotizacion'])),
    absences_days: toFiniteNumber(pickFirst(source, ['absences_days', 'dias_falta'])),
    incapacity_days: toFiniteNumber(pickFirst(source, ['incapacity_days', 'dias_incapacidad'])),
    overtime_hours: toFiniteNumber(pickFirst(source, ['overtime_hours', 'horas_extras'])),
    overtime_excess_hours: toFiniteNumber(
        pickFirst(source, ['overtime_excess_hours', 'horas_extras_excedentes'])
    ),
    overtime_excess_amount: toFiniteNumber(
        pickFirst(source, ['overtime_excess_amount', 'monto_horas_extras_excedentes'])
    ),
    base_contribution_salary: toFiniteNumber(
        pickFirst(source, ['base_contribution_salary', 'sueldo_base_cotizacion'])
    ),
    total_earnings: toFiniteNumber(pickFirst(source, ['total_earnings', 'total_percepciones'])),
    total_deductions: toFiniteNumber(pickFirst(source, ['total_deductions', 'total_deducciones'])),
    total_other_payments: toFiniteNumber(
        pickFirst(source, ['total_other_payments', 'total_otros_pagos'])
    ),
    total_earnings_taxable: toFiniteNumber(
        pickFirst(source, ['total_earnings_taxable', 'total_percepciones_gravadas'])
    ),
    total_earnings_exempt: toFiniteNumber(
        pickFirst(source, ['total_earnings_exempt', 'total_percepciones_exentas'])
    ),
    state_tax_base: toFiniteNumber(pickFirst(source, ['state_tax_base', 'base_impuesto_estatal'])),
    ptu_base: toFiniteNumber(pickFirst(source, ['ptu_base', 'base_ptu'])),
    net_amount: toFiniteNumber(
        pickFirst(source, ['net_amount', 'monto_neto']),
        null
    ),
    is_applied: normalizeBoolean(pickFirst(source, ['is_applied', 'aplicado']), false),
    is_sent: normalizeBoolean(pickFirst(source, ['is_sent', 'enviado']), false),
    sent_email: normalizeText(pickFirst(source, ['sent_email', 'correo_envio'])),
    source_payload: source,
});

const extractErrorMessage = (error) => normalizeText(error?.message, 'Error no especificado');

export class MicrosipSyncService {
    constructor({
        db,
        connector = createMicrosipConnectorService(),
        logger = null,
        payrollRetentionMonths = process.env.MICROSIP_PAYROLL_RETENTION_MONTHS,
    }) {
        this.db = db;
        this.connector = connector;
        this.logger = logger;
        this.payrollRetentionMonths = resolvePayrollRetentionMonths(payrollRetentionMonths);
        this.statusIdCache = new Map();
        this.departmentCache = new Map();
        this.jobTitleCache = new Map();
        this.countryCache = new Map();
        this.stateCache = new Map();
        this.cityCache = new Map();
        this.employeeCache = new Map();
    }
    async getStatusId(statusCode) {
        const normalizedCode = normalizeText(statusCode)?.toLowerCase();
        if (!normalizedCode) {
            throw new Error('Status code requerido para ext_microsip_sync_log');
        }

        if (this.statusIdCache.has(normalizedCode)) {
            return this.statusIdCache.get(normalizedCode);
        }

        const [rows] = await this.db.query(
            'SELECT id FROM ref_sync_status WHERE code = ? LIMIT 1',
            [normalizedCode]
        );

        if (!rows.length) {
            throw new Error(`No existe ref_sync_status para code="${normalizedCode}"`);
        }

        const statusId = Number(rows[0].id);
        this.statusIdCache.set(normalizedCode, statusId);
        return statusId;
    }

    async hasRunningSync(syncType) {
        const [rows] = await this.db.query(
            `SELECT sl.id
             FROM ext_microsip_sync_log sl
             JOIN ref_sync_status rs ON rs.id = sl.status_id
             WHERE sl.sync_type = ?
               AND rs.code = 'running'
             ORDER BY sl.id DESC
             LIMIT 1`,
            [syncType]
        );

        return rows.length > 0;
    }

    async createSyncLog(syncType, userId) {
        const runningStatusId = await this.getStatusId('running');
        const [result] = await this.db.query(
            `INSERT INTO ext_microsip_sync_log (
                sync_type,
                status_id,
                records_total,
                records_processed,
                records_failed,
                created_by_user_id
            ) VALUES (?, ?, 0, 0, 0, ?)`,
            [syncType, runningStatusId, userId || null]
        );

        return Number(result.insertId);
    }

    async updateSyncLog(logId, {
        statusCode,
        recordsTotal,
        recordsProcessed,
        recordsFailed,
        message,
    }) {
        const statusId = await this.getStatusId(statusCode);

        await this.db.query(
            `UPDATE ext_microsip_sync_log
             SET status_id = ?,
                 finished_at = CURRENT_TIMESTAMP,
                 records_total = ?,
                 records_processed = ?,
                 records_failed = ?,
                 message = ?
             WHERE id = ?`,
            [
                statusId,
                recordsTotal,
                recordsProcessed,
                recordsFailed,
                message || null,
                logId,
            ]
        );
    }

    async getLatestSyncLog() {
        const [rows] = await this.db.query(
            `SELECT
                sl.id,
                sl.sync_type,
                rs.code AS status_code,
                rs.label AS status_label,
                sl.started_at,
                sl.finished_at,
                sl.records_total,
                sl.records_processed,
                sl.records_failed,
                sl.message,
                sl.created_by_user_id
             FROM ext_microsip_sync_log sl
             JOIN ref_sync_status rs ON rs.id = sl.status_id
             ORDER BY sl.id DESC
             LIMIT 1`
        );

        return rows[0] || null;
    }

    async listSyncLogs(limit = 20) {
        const normalizedLimit = Math.min(Math.max(toInteger(limit, 20), 1), 100);
        const [rows] = await this.db.query(
            `SELECT
                sl.id,
                sl.sync_type,
                rs.code AS status_code,
                rs.label AS status_label,
                sl.started_at,
                sl.finished_at,
                sl.records_total,
                sl.records_processed,
                sl.records_failed,
                sl.message,
                sl.created_by_user_id
             FROM ext_microsip_sync_log sl
             JOIN ref_sync_status rs ON rs.id = sl.status_id
             ORDER BY sl.id DESC
             LIMIT ?`,
            [normalizedLimit]
        );

        return rows;
    }

    async listEmployeeSnapshots(limit = 20) {
        const normalizedLimit = Math.min(Math.max(toInteger(limit, 20), 1), 100);
        const [rows] = await this.db.query(
            `SELECT
                ext.id,
                ext.microsip_employee_id,
                ext.employee_number,
                ext.first_name,
                ext.last_name,
                ext.employment_status,
                ext.hired_at,
                ext.terminated_at,
                dep.name AS department_name,
                jt.name AS job_title_name,
                comp.salary_daily,
                comp.salary_integrated_daily,
                contact.email,
                city.name AS city_name,
                state.name AS state_name,
                country.name AS country_name,
                ext.synced_at
             FROM ext_microsip_employee ext
             LEFT JOIN ext_microsip_department dep ON dep.id = ext.department_ext_id
             LEFT JOIN ext_microsip_job_title jt ON jt.id = ext.job_title_ext_id
             LEFT JOIN ext_microsip_employee_compensation comp ON comp.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_contact contact ON contact.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_employee_address addr ON addr.employee_ext_id = ext.id
             LEFT JOIN ext_microsip_city city ON city.id = addr.city_ext_id
             LEFT JOIN ext_microsip_state state ON state.id = city.state_ext_id
             LEFT JOIN ext_microsip_country country ON country.id = state.country_ext_id
             ORDER BY ext.id DESC
             LIMIT ?`,
            [normalizedLimit]
        );

        return rows;
    }

    async getConnectorHealth() {
        const profile = this.connector.getConnectionProfile();
        if (!profile.enabled) {
            return {
                ok: false,
                mode: 'disabled',
                profile,
                message: 'Integracion Microsip deshabilitada en entorno actual',
            };
        }

        const connectorHealth = await this.connector.healthCheck();
        return {
            ...connectorHealth,
            mode: 'enabled',
        };
    }

    async resolveDepartmentExtId(microsipDepartmentId) {
        const lookupKeys = buildLookupKeys(microsipDepartmentId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.departmentCache.has(key)) {
                return this.departmentCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM ext_microsip_department
             WHERE microsip_department_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.departmentCache.set(key, extId));
        return extId;
    }

    async resolveJobTitleExtId(microsipJobTitleId) {
        const lookupKeys = buildLookupKeys(microsipJobTitleId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.jobTitleCache.has(key)) {
                return this.jobTitleCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM ext_microsip_job_title
             WHERE microsip_job_title_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.jobTitleCache.set(key, extId));
        return extId;
    }

    async resolveCountryExtId(microsipCountryId) {
        const lookupKeys = buildLookupKeys(microsipCountryId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.countryCache.has(key)) {
                return this.countryCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM ext_microsip_country
             WHERE microsip_country_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.countryCache.set(key, extId));
        return extId;
    }

    async resolveStateExtId(microsipStateId) {
        const lookupKeys = buildLookupKeys(microsipStateId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.stateCache.has(key)) {
                return this.stateCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM ext_microsip_state
             WHERE microsip_state_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.stateCache.set(key, extId));
        return extId;
    }

    async resolveCityExtId(microsipCityId) {
        const lookupKeys = buildLookupKeys(microsipCityId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.cityCache.has(key)) {
                return this.cityCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM ext_microsip_city
             WHERE microsip_city_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.cityCache.set(key, extId));
        return extId;
    }

    async resolveEmployeeExtId(microsipEmployeeId) {
        const lookupKeys = buildLookupKeys(microsipEmployeeId);
        if (!lookupKeys.length) {
            return null;
        }

        for (const key of lookupKeys) {
            if (this.employeeCache.has(key)) {
                return this.employeeCache.get(key);
            }
        }

        const [rows] = await this.db.query(
            `SELECT id
             FROM ext_microsip_employee
             WHERE microsip_employee_id IN (?, ?, ?)
             LIMIT 1`,
            [lookupKeys[0], lookupKeys[1] || lookupKeys[0], lookupKeys[2] || lookupKeys[0]]
        );

        const extId = rows[0] ? Number(rows[0].id) : null;
        lookupKeys.forEach((key) => this.employeeCache.set(key, extId));
        return extId;
    }
    async upsertCountry(payload) {
        const normalized = normalizeCountryPayload(payload);
        if (!normalized.microsip_country_id) {
            throw new Error('Pais sin microsip_country_id');
        }

        await this.db.query(
            `INSERT INTO ext_microsip_country (
                microsip_country_id,
                name,
                abbrev,
                fiscal_key,
                is_default,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                abbrev = VALUES(abbrev),
                fiscal_key = VALUES(fiscal_key),
                is_default = VALUES(is_default),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_country_id,
                normalized.name,
                normalized.abbrev,
                normalized.fiscal_key,
                normalized.is_default ? 1 : 0,
                normalized.is_active ? 1 : 0,
            ]
        );

        const extId = await this.resolveCountryExtId(normalized.microsip_country_id);
        buildLookupKeys(normalized.microsip_country_id).forEach((key) => this.countryCache.set(key, extId));
    }

    async upsertState(payload) {
        const normalized = normalizeStatePayload(payload);
        if (!normalized.microsip_state_id) {
            throw new Error('Estado sin microsip_state_id');
        }

        const countryExtId = await this.resolveCountryExtId(normalized.microsip_country_id);

        await this.db.query(
            `INSERT INTO ext_microsip_state (
                microsip_state_id,
                country_ext_id,
                name,
                abbrev,
                fiscal_key,
                is_default,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                country_ext_id = VALUES(country_ext_id),
                name = VALUES(name),
                abbrev = VALUES(abbrev),
                fiscal_key = VALUES(fiscal_key),
                is_default = VALUES(is_default),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_state_id,
                countryExtId,
                normalized.name,
                normalized.abbrev,
                normalized.fiscal_key,
                normalized.is_default ? 1 : 0,
                normalized.is_active ? 1 : 0,
            ]
        );

        const extId = await this.resolveStateExtId(normalized.microsip_state_id);
        buildLookupKeys(normalized.microsip_state_id).forEach((key) => this.stateCache.set(key, extId));
    }

    async upsertCity(payload) {
        const normalized = normalizeCityPayload(payload);
        if (!normalized.microsip_city_id) {
            throw new Error('Ciudad sin microsip_city_id');
        }

        const stateExtId = await this.resolveStateExtId(normalized.microsip_state_id);

        await this.db.query(
            `INSERT INTO ext_microsip_city (
                microsip_city_id,
                state_ext_id,
                name,
                fiscal_key,
                is_default,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                state_ext_id = VALUES(state_ext_id),
                name = VALUES(name),
                fiscal_key = VALUES(fiscal_key),
                is_default = VALUES(is_default),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_city_id,
                stateExtId,
                normalized.name,
                normalized.fiscal_key,
                normalized.is_default ? 1 : 0,
                normalized.is_active ? 1 : 0,
            ]
        );

        const extId = await this.resolveCityExtId(normalized.microsip_city_id);
        buildLookupKeys(normalized.microsip_city_id).forEach((key) => this.cityCache.set(key, extId));
    }

    async upsertDepartment(payload) {
        const normalized = {
            microsip_department_id: normalizeText(
                pickFirst(payload, ['microsip_department_id', 'department_id', 'id'])
            ),
            name: normalizeText(pickFirst(payload, ['name', 'department_name']), 'Sin nombre'),
            is_active: normalizeBoolean(pickFirst(payload, ['is_active', 'active']), true),
        };

        if (!normalized.microsip_department_id) {
            throw new Error('Departamento sin microsip_department_id');
        }

        await this.db.query(
            `INSERT INTO ext_microsip_department (
                microsip_department_id,
                name,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_department_id,
                normalized.name,
                normalized.is_active ? 1 : 0,
            ]
        );

        const extId = await this.resolveDepartmentExtId(normalized.microsip_department_id);
        buildLookupKeys(normalized.microsip_department_id).forEach((key) => this.departmentCache.set(key, extId));
    }

    async upsertJobTitle(payload) {
        const normalized = {
            microsip_job_title_id: normalizeText(
                pickFirst(payload, ['microsip_job_title_id', 'job_title_id', 'position_id', 'id'])
            ),
            name: normalizeText(pickFirst(payload, ['name', 'job_title_name', 'position_name']), 'Sin nombre'),
            is_active: normalizeBoolean(pickFirst(payload, ['is_active', 'active']), true),
        };

        if (!normalized.microsip_job_title_id) {
            throw new Error('Puesto sin microsip_job_title_id');
        }

        await this.db.query(
            `INSERT INTO ext_microsip_job_title (
                microsip_job_title_id,
                name,
                is_active,
                synced_at
             ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                is_active = VALUES(is_active),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_job_title_id,
                normalized.name,
                normalized.is_active ? 1 : 0,
            ]
        );

        const extId = await this.resolveJobTitleExtId(normalized.microsip_job_title_id);
        buildLookupKeys(normalized.microsip_job_title_id).forEach((key) => this.jobTitleCache.set(key, extId));
    }

    async upsertEmployee(payload) {
        const normalized = normalizeEmployeePayload(payload);
        if (!normalized.microsip_employee_id) {
            throw new Error('Empleado sin microsip_employee_id');
        }

        const departmentExtId = await this.resolveDepartmentExtId(normalized.department_code);
        const jobTitleExtId = await this.resolveJobTitleExtId(normalized.job_title_code);

        await this.db.query(
            `INSERT INTO ext_microsip_employee (
                microsip_employee_id,
                employee_number,
                first_name,
                last_name,
                department_ext_id,
                job_title_ext_id,
                employment_status,
                hired_at,
                terminated_at,
                source_payload,
                synced_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                employee_number = VALUES(employee_number),
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                department_ext_id = VALUES(department_ext_id),
                job_title_ext_id = VALUES(job_title_ext_id),
                employment_status = VALUES(employment_status),
                hired_at = VALUES(hired_at),
                terminated_at = VALUES(terminated_at),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_employee_id,
                normalized.employee_number,
                normalized.first_name,
                normalized.last_name,
                departmentExtId,
                jobTitleExtId,
                normalized.employment_status,
                normalized.hired_at,
                normalized.terminated_at,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );

        const employeeExtId = await this.resolveEmployeeExtId(normalized.microsip_employee_id);
        if (!employeeExtId) {
            throw new Error('No fue posible resolver ext_microsip_employee tras upsert');
        }

        buildLookupKeys(normalized.microsip_employee_id).forEach((key) => this.employeeCache.set(key, employeeExtId));

        await this.upsertEmployeeCompensation(employeeExtId, normalized);
        await this.upsertEmployeeSocialSecurity(employeeExtId, normalized);
        await this.upsertEmployeeLabor(employeeExtId, normalized);
        await this.upsertEmployeePersonal(employeeExtId, normalized);
        await this.upsertEmployeeContact(employeeExtId, normalized);
        await this.upsertEmployeeAddress(employeeExtId, normalized);
        await this.upsertEmployeeFamily(employeeExtId, normalized);
        await this.upsertEmployeePaymentAccount(employeeExtId, normalized);
        await this.upsertEmployeeLink(employeeExtId, normalized.employee_number);
    }
    async upsertEmployeeCompensation(employeeExtId, normalized) {
        await this.db.query(
            `INSERT INTO ext_microsip_employee_compensation (
                employee_ext_id,
                salary_daily,
                salary_integrated_daily,
                salary_currency,
                salary_type,
                payroll_regime,
                contribution_base_amount,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                salary_daily = VALUES(salary_daily),
                salary_integrated_daily = VALUES(salary_integrated_daily),
                salary_currency = VALUES(salary_currency),
                salary_type = VALUES(salary_type),
                payroll_regime = VALUES(payroll_regime),
                contribution_base_amount = VALUES(contribution_base_amount),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.salary_daily,
                normalized.salary_integrated_daily,
                normalized.salary_currency,
                normalized.salary_type,
                normalized.payroll_regime,
                normalized.contribution_base_amount,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeeSocialSecurity(employeeExtId, normalized) {
        await this.db.query(
            `INSERT INTO ext_microsip_employee_social_security (
                employee_ext_id,
                social_security_number,
                imss_clinic_code,
                employee_contribution_amount,
                employer_contribution_amount,
                total_contribution_amount,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                social_security_number = VALUES(social_security_number),
                imss_clinic_code = VALUES(imss_clinic_code),
                employee_contribution_amount = VALUES(employee_contribution_amount),
                employer_contribution_amount = VALUES(employer_contribution_amount),
                total_contribution_amount = VALUES(total_contribution_amount),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.social_security_number,
                normalized.imss_clinic_code,
                normalized.employee_contribution_amount,
                normalized.employer_contribution_amount,
                normalized.total_contribution_amount,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeeLabor(employeeExtId, normalized) {
        await this.db.query(
            `INSERT INTO ext_microsip_employee_labor (
                employee_ext_id,
                manager_microsip_employee_id,
                manager_name,
                contract_type,
                payment_method,
                shift_code,
                shift_name,
                schedule,
                workday_hours,
                payroll_regime_code,
                sat_contract_code,
                sat_workday_code,
                sat_entry_code,
                is_unionized,
                antiquity_table_code,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                manager_microsip_employee_id = VALUES(manager_microsip_employee_id),
                manager_name = VALUES(manager_name),
                contract_type = VALUES(contract_type),
                payment_method = VALUES(payment_method),
                shift_code = VALUES(shift_code),
                shift_name = VALUES(shift_name),
                schedule = VALUES(schedule),
                workday_hours = VALUES(workday_hours),
                payroll_regime_code = VALUES(payroll_regime_code),
                sat_contract_code = VALUES(sat_contract_code),
                sat_workday_code = VALUES(sat_workday_code),
                sat_entry_code = VALUES(sat_entry_code),
                is_unionized = VALUES(is_unionized),
                antiquity_table_code = VALUES(antiquity_table_code),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.manager_microsip_employee_id,
                normalized.manager_name,
                normalized.contract_type,
                normalized.payment_method,
                normalized.shift_code,
                normalized.shift_name,
                normalized.schedule,
                normalized.workday_hours,
                normalized.payroll_regime_code,
                normalized.sat_contract_code,
                normalized.sat_workday_code,
                normalized.sat_entry_code,
                normalized.is_unionized ? 1 : 0,
                normalized.antiquity_table_code,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeePersonal(employeeExtId, normalized) {
        const birthCityExtId = await this.resolveCityExtId(normalized.birth_city_code);

        await this.db.query(
            `INSERT INTO ext_microsip_employee_personal (
                employee_ext_id,
                sex_code,
                birth_date,
                birth_city_ext_id,
                marital_status_code,
                children_count,
                rfc,
                curp,
                alt_registry_code,
                social_security_registry,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                sex_code = VALUES(sex_code),
                birth_date = VALUES(birth_date),
                birth_city_ext_id = VALUES(birth_city_ext_id),
                marital_status_code = VALUES(marital_status_code),
                children_count = VALUES(children_count),
                rfc = VALUES(rfc),
                curp = VALUES(curp),
                alt_registry_code = VALUES(alt_registry_code),
                social_security_registry = VALUES(social_security_registry),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.sex_code,
                normalized.birth_date,
                birthCityExtId,
                normalized.marital_status_code,
                normalized.children_count,
                normalized.rfc,
                normalized.curp,
                normalized.alt_registry_code,
                normalized.social_security_registry,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeeContact(employeeExtId, normalized) {
        await this.db.query(
            `INSERT INTO ext_microsip_employee_contact (
                employee_ext_id,
                email,
                phone_primary,
                phone_secondary,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                phone_primary = VALUES(phone_primary),
                phone_secondary = VALUES(phone_secondary),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.email,
                normalized.phone_primary,
                normalized.phone_secondary,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeeAddress(employeeExtId, normalized) {
        const cityExtId = await this.resolveCityExtId(normalized.city_code);

        await this.db.query(
            `INSERT INTO ext_microsip_employee_address (
                employee_ext_id,
                full_address,
                street_name,
                exterior_number,
                interior_number,
                neighborhood,
                locality,
                reference_note,
                city_ext_id,
                postal_code,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                full_address = VALUES(full_address),
                street_name = VALUES(street_name),
                exterior_number = VALUES(exterior_number),
                interior_number = VALUES(interior_number),
                neighborhood = VALUES(neighborhood),
                locality = VALUES(locality),
                reference_note = VALUES(reference_note),
                city_ext_id = VALUES(city_ext_id),
                postal_code = VALUES(postal_code),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.full_address,
                normalized.street_name,
                normalized.exterior_number,
                normalized.interior_number,
                normalized.neighborhood,
                normalized.locality,
                normalized.reference_note,
                cityExtId,
                normalized.postal_code,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeeFamily(employeeExtId, normalized) {
        await this.db.query(
            `INSERT INTO ext_microsip_employee_family (
                employee_ext_id,
                father_name,
                mother_name,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                father_name = VALUES(father_name),
                mother_name = VALUES(mother_name),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.father_name,
                normalized.mother_name,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeePaymentAccount(employeeExtId, normalized) {
        await this.db.query(
            `INSERT INTO ext_microsip_employee_payment_account (
                employee_ext_id,
                payment_group_code,
                payment_account_type,
                payment_account_number,
                source_payload,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                payment_group_code = VALUES(payment_group_code),
                payment_account_type = VALUES(payment_account_type),
                payment_account_number = VALUES(payment_account_number),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeExtId,
                normalized.payment_group_code,
                normalized.payment_account_type,
                normalized.payment_account_number,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async upsertEmployeeLink(employeeExtId, employeeNumber) {
        const normalizedEmployeeNumber = normalizeText(employeeNumber);
        if (!normalizedEmployeeNumber) {
            return;
        }

        const [employees] = await this.db.query(
            `SELECT id
             FROM employees
             WHERE internal_id = ?
             LIMIT 1`,
            [normalizedEmployeeNumber]
        );

        if (!employees.length) {
            return;
        }

        const employeeId = Number(employees[0].id);

        await this.db.query(
            `INSERT INTO employee_microsip_links (
                employee_id,
                microsip_employee_ext_id,
                link_source,
                linked_at
            ) VALUES (?, ?, 'employee_number', CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                employee_id = VALUES(employee_id),
                microsip_employee_ext_id = VALUES(microsip_employee_ext_id),
                link_source = VALUES(link_source),
                updated_at = CURRENT_TIMESTAMP`,
            [employeeId, employeeExtId]
        );
    }
    async upsertPayrollPayment(payload) {
        const normalized = normalizePayrollPaymentPayload(payload);
        if (!normalized.microsip_payroll_payment_id) {
            throw new Error('Pago de nomina sin microsip_payroll_payment_id');
        }

        const employeeExtId = await this.resolveEmployeeExtId(normalized.microsip_employee_id);
        if (!employeeExtId) {
            throw new Error('Pago de nomina sin empleado sincronizado en ext_microsip_employee');
        }

        const netAmount = normalized.net_amount
            ?? (
                normalized.total_earnings !== null
                && normalized.total_deductions !== null
                    ? Number(normalized.total_earnings) - Number(normalized.total_deductions)
                    : null
            );

        await this.db.query(
            `INSERT INTO ext_microsip_payroll_payment (
                microsip_payroll_payment_id,
                employee_ext_id,
                payroll_batch_id,
                payment_date,
                payroll_type,
                payment_method,
                payment_type,
                salary_type,
                integrated_salary,
                work_days,
                work_hours,
                vacation_days,
                cotization_days,
                absences_days,
                incapacity_days,
                overtime_hours,
                overtime_excess_hours,
                overtime_excess_amount,
                base_contribution_salary,
                total_earnings,
                total_deductions,
                total_other_payments,
                total_earnings_taxable,
                total_earnings_exempt,
                state_tax_base,
                ptu_base,
                net_amount,
                is_applied,
                is_sent,
                sent_email,
                source_payload,
                synced_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                employee_ext_id = VALUES(employee_ext_id),
                payroll_batch_id = VALUES(payroll_batch_id),
                payment_date = VALUES(payment_date),
                payroll_type = VALUES(payroll_type),
                payment_method = VALUES(payment_method),
                payment_type = VALUES(payment_type),
                salary_type = VALUES(salary_type),
                integrated_salary = VALUES(integrated_salary),
                work_days = VALUES(work_days),
                work_hours = VALUES(work_hours),
                vacation_days = VALUES(vacation_days),
                cotization_days = VALUES(cotization_days),
                absences_days = VALUES(absences_days),
                incapacity_days = VALUES(incapacity_days),
                overtime_hours = VALUES(overtime_hours),
                overtime_excess_hours = VALUES(overtime_excess_hours),
                overtime_excess_amount = VALUES(overtime_excess_amount),
                base_contribution_salary = VALUES(base_contribution_salary),
                total_earnings = VALUES(total_earnings),
                total_deductions = VALUES(total_deductions),
                total_other_payments = VALUES(total_other_payments),
                total_earnings_taxable = VALUES(total_earnings_taxable),
                total_earnings_exempt = VALUES(total_earnings_exempt),
                state_tax_base = VALUES(state_tax_base),
                ptu_base = VALUES(ptu_base),
                net_amount = VALUES(net_amount),
                is_applied = VALUES(is_applied),
                is_sent = VALUES(is_sent),
                sent_email = VALUES(sent_email),
                source_payload = VALUES(source_payload),
                synced_at = VALUES(synced_at),
                updated_at = CURRENT_TIMESTAMP`,
            [
                normalized.microsip_payroll_payment_id,
                employeeExtId,
                normalized.payroll_batch_id,
                normalized.payment_date,
                normalized.payroll_type,
                normalized.payment_method,
                normalized.payment_type,
                normalized.salary_type,
                normalized.integrated_salary,
                normalized.work_days,
                normalized.work_hours,
                normalized.vacation_days,
                normalized.cotization_days,
                normalized.absences_days,
                normalized.incapacity_days,
                normalized.overtime_hours,
                normalized.overtime_excess_hours,
                normalized.overtime_excess_amount,
                normalized.base_contribution_salary,
                normalized.total_earnings,
                normalized.total_deductions,
                normalized.total_other_payments,
                normalized.total_earnings_taxable,
                normalized.total_earnings_exempt,
                normalized.state_tax_base,
                normalized.ptu_base,
                netAmount,
                normalized.is_applied ? 1 : 0,
                normalized.is_sent ? 1 : 0,
                normalized.sent_email,
                JSON.stringify(normalized.source_payload || {}),
            ]
        );
    }

    async processCollection(items, upsertFn) {
        const counters = {
            total: 0,
            processed: 0,
            failed: 0,
            errors: [],
        };

        for (const item of toArray(items)) {
            counters.total += 1;
            try {
                // eslint-disable-next-line no-await-in-loop
                await upsertFn.call(this, item);
                counters.processed += 1;
            } catch (error) {
                counters.failed += 1;
                if (counters.errors.length < 20) {
                    counters.errors.push(extractErrorMessage(error));
                }
            }
        }

        return counters;
    }

    mergeCounters(base, delta) {
        return {
            total: base.total + delta.total,
            processed: base.processed + delta.processed,
            failed: base.failed + delta.failed,
        };
    }

    async syncCountries(context = {}) {
        const data = await this.connector.exportCountries(context);
        return this.processCollection(data, this.upsertCountry);
    }

    async syncStates(context = {}) {
        const data = await this.connector.exportStates(context);
        return this.processCollection(data, this.upsertState);
    }

    async syncCities(context = {}) {
        const data = await this.connector.exportCities(context);
        return this.processCollection(data, this.upsertCity);
    }

    async syncLocations(context = {}) {
        let counters = { total: 0, processed: 0, failed: 0 };
        const errors = [];

        const steps = [this.syncCountries, this.syncStates, this.syncCities];
        for (const step of steps) {
            // eslint-disable-next-line no-await-in-loop
            const result = await step.call(this, context);
            counters = this.mergeCounters(counters, result);

            for (const errorMessage of toArray(result?.errors)) {
                if (errors.length >= 20) {
                    break;
                }
                errors.push(errorMessage);
            }
        }

        return {
            ...counters,
            errors,
        };
    }

    async syncDepartments(context = {}) {
        const data = await this.connector.exportDepartments(context);
        return this.processCollection(data, this.upsertDepartment);
    }

    async syncJobTitles(context = {}) {
        const data = await this.connector.exportJobTitles(context);
        return this.processCollection(data, this.upsertJobTitle);
    }

    async syncEmployees(context = {}) {
        const data = await this.connector.exportEmployees(context);
        return this.processCollection(data, this.upsertEmployee);
    }

    async syncPayrollPayments(context = {}) {
        const data = await this.connector.exportPayrollPayments(context);
        return this.processCollection(data, this.upsertPayrollPayment);
    }

    async prunePayrollPaymentsHistory() {
        if (this.payrollRetentionMonths === 0) {
            return {
                applied: false,
                retention_months: 0,
                removed_rows: 0,
            };
        }

        const [result] = await this.db.query(
            `DELETE FROM ext_microsip_payroll_payment
             WHERE payment_date IS NOT NULL
               AND payment_date < DATE_SUB(CURDATE(), INTERVAL ? MONTH)`,
            [this.payrollRetentionMonths]
        );

        return {
            applied: true,
            retention_months: this.payrollRetentionMonths,
            removed_rows: Number(result?.affectedRows || 0),
        };
    }

    async executeSyncStep(step, context = {}) {
        if (step === 'locations') return this.syncLocations(context);
        if (step === 'countries') return this.syncCountries(context);
        if (step === 'states') return this.syncStates(context);
        if (step === 'cities') return this.syncCities(context);
        if (step === 'departments') return this.syncDepartments(context);
        if (step === 'job_titles') return this.syncJobTitles(context);
        if (step === 'employees') return this.syncEmployees(context);
        if (step === 'payroll') return this.syncPayrollPayments(context);

        throw new Error(`Paso de sincronizacion no soportado: ${step}`);
    }

    async runSync({
        syncType = 'full',
        triggerUserId = null,
        requestId = null,
    }) {
        const normalizedSyncType = ensureSyncType(syncType);
        const running = await this.hasRunningSync(normalizedSyncType);
        if (running) {
            const conflictError = new Error('Ya existe una sincronizacion en progreso para ese tipo');
            conflictError.statusCode = 409;
            conflictError.code = 'MICROSIP_SYNC_ALREADY_RUNNING';
            throw conflictError;
        }

        const steps = SYNC_PLAN[normalizedSyncType] || ['employees'];
        const logId = await this.createSyncLog(normalizedSyncType, triggerUserId);
        let counters = { total: 0, processed: 0, failed: 0 };
        const datasetStats = [];

        try {
            if (this.logger) {
                await this.logger.system(triggerUserId, 'MICROSIP_SYNC_STARTED', {
                    sync_type: normalizedSyncType,
                    sync_log_id: logId,
                    steps,
                    request_id: requestId || null,
                });
            }

            for (const step of steps) {
                // eslint-disable-next-line no-await-in-loop
                const result = await this.executeSyncStep(step, { request_id: requestId });
                counters = this.mergeCounters(counters, result);
                datasetStats.push({
                    dataset: step,
                    total: result.total,
                    processed: result.processed,
                    failed: result.failed,
                    errors: result.errors,
                });
            }

            if (steps.includes('payroll')) {
                const retention = await this.prunePayrollPaymentsHistory();
                datasetStats.push({
                    dataset: 'payroll_retention',
                    total: 0,
                    processed: 0,
                    failed: 0,
                    errors: [],
                    retention,
                });
            }

            const statusCode = counters.failed > 0 ? 'failed' : 'success';
            const message = counters.failed > 0
                ? 'Sincronizacion finalizada con errores parciales'
                : 'Sincronizacion finalizada correctamente';

            await this.updateSyncLog(logId, {
                statusCode,
                recordsTotal: counters.total,
                recordsProcessed: counters.processed,
                recordsFailed: counters.failed,
                message,
            });

            if (this.logger) {
                await this.logger.system(triggerUserId, 'MICROSIP_SYNC_FINISHED', {
                    sync_type: normalizedSyncType,
                    sync_log_id: logId,
                    status_code: statusCode,
                    ...counters,
                    datasets: datasetStats,
                    request_id: requestId || null,
                });
            }

            return {
                sync_log_id: logId,
                sync_type: normalizedSyncType,
                status: statusCode,
                ...counters,
                datasets: datasetStats,
            };
        } catch (error) {
            await this.updateSyncLog(logId, {
                statusCode: 'failed',
                recordsTotal: counters.total,
                recordsProcessed: counters.processed,
                recordsFailed: counters.failed + 1,
                message: error?.message || 'Error inesperado durante sincronizacion',
            });

            if (this.logger) {
                await this.logger.error(triggerUserId, 'MICROSIP_SYNC_ERROR', {
                    sync_type: normalizedSyncType,
                    sync_log_id: logId,
                    ...counters,
                    request_id: requestId || null,
                    code: error?.code || null,
                    message: error?.message || null,
                    datasets: datasetStats,
                });
            }

            throw error;
        }
    }
}

export const createMicrosipSyncService = (options) => new MicrosipSyncService(options);
