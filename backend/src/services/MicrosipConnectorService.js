import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 20000;
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

const toBoolean = (value, defaultValue = false) => {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }

    return TRUE_VALUES.has(String(value).trim().toLowerCase());
};

const resolveTimeout = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_TIMEOUT_MS;
    }

    return Math.floor(parsed);
};

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');
const normalizePath = (value, fallback) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return fallback;
    }

    return raw.startsWith('/') ? raw : `/${raw}`;
};

const buildConnectorError = (message, statusCode = 502, code = 'MICROSIP_CONNECTOR_ERROR', details = {}) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
};

const normalizeResultItems = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
};

export class MicrosipConnectorService {
    constructor(options = {}) {
        this.enabled = toBoolean(
            options.enabled ?? process.env.MICROSIP_CONNECTOR_ENABLED,
            false
        );
        this.baseUrl = trimTrailingSlash(
            options.baseUrl ?? process.env.MICROSIP_CONNECTOR_URL
        );
        this.apiKey = String(
            options.apiKey ?? process.env.MICROSIP_CONNECTOR_API_KEY ?? ''
        ).trim();
        this.timeoutMs = resolveTimeout(
            options.timeoutMs ?? process.env.MICROSIP_SYNC_TIMEOUT_MS
        );
        this.paths = {
            health: normalizePath(
                options.healthPath ?? process.env.MICROSIP_CONNECTOR_HEALTH_PATH,
                '/health'
            ),
            departments: normalizePath(
                options.departmentsPath ?? process.env.MICROSIP_CONNECTOR_DEPARTMENTS_PATH,
                '/exports/departments'
            ),
            jobTitles: normalizePath(
                options.jobTitlesPath ?? process.env.MICROSIP_CONNECTOR_JOB_TITLES_PATH,
                '/exports/job-titles'
            ),
            employees: normalizePath(
                options.employeesPath ?? process.env.MICROSIP_CONNECTOR_EMPLOYEES_PATH,
                '/exports/employees'
            ),
            countries: normalizePath(
                options.countriesPath ?? process.env.MICROSIP_CONNECTOR_COUNTRIES_PATH,
                '/exports/countries'
            ),
            states: normalizePath(
                options.statesPath ?? process.env.MICROSIP_CONNECTOR_STATES_PATH,
                '/exports/states'
            ),
            cities: normalizePath(
                options.citiesPath ?? process.env.MICROSIP_CONNECTOR_CITIES_PATH,
                '/exports/cities'
            ),
            payrollPayments: normalizePath(
                options.payrollPaymentsPath ?? process.env.MICROSIP_CONNECTOR_PAYROLL_PAYMENTS_PATH,
                '/exports/payroll-payments'
            ),
        };

        this.client = axios.create({
            baseURL: this.baseUrl || undefined,
            timeout: this.timeoutMs,
        });

        if (this.apiKey) {
            this.client.defaults.headers.common['x-api-key'] = this.apiKey;
        }
    }

    getConnectionProfile() {
        return {
            enabled: this.enabled,
            base_url: this.baseUrl || null,
            timeout_ms: this.timeoutMs,
            has_api_key: Boolean(this.apiKey),
            paths: this.paths,
        };
    }

    assertEnabled() {
        if (!this.enabled) {
            throw buildConnectorError(
                'La integracion Microsip esta deshabilitada',
                400,
                'MICROSIP_CONNECTOR_DISABLED'
            );
        }

        if (!this.baseUrl) {
            throw buildConnectorError(
                'Falta configurar MICROSIP_CONNECTOR_URL',
                500,
                'MICROSIP_CONNECTOR_URL_MISSING'
            );
        }
    }

    async request(method, path, payload = null) {
        this.assertEnabled();
        const normalizedMethod = String(method || '').trim().toLowerCase();
        const hasBody = !['get', 'head'].includes(normalizedMethod)
            && payload !== null
            && payload !== undefined;

        try {
            const response = await this.client.request({
                method,
                url: path,
                data: payload,
                headers: hasBody
                    ? { 'Content-Type': 'application/json' }
                    : undefined,
            });

            return response.data;
        } catch (error) {
            const statusCode = error?.response?.status || 502;
            const message = error?.response?.data?.message
                || error?.message
                || 'No fue posible conectar con el conector de Microsip';

            throw buildConnectorError(message, statusCode, 'MICROSIP_CONNECTOR_REQUEST_ERROR', {
                method,
                path,
                upstream_status: error?.response?.status || null,
            });
        }
    }

    async healthCheck() {
        const data = await this.request('get', this.paths.health);
        return {
            ok: true,
            profile: this.getConnectionProfile(),
            upstream: data,
        };
    }

    async exportDepartments(context = {}) {
        const data = await this.request('post', this.paths.departments, context);
        return normalizeResultItems(data);
    }

    async exportJobTitles(context = {}) {
        const data = await this.request('post', this.paths.jobTitles, context);
        return normalizeResultItems(data);
    }

    async exportEmployees(context = {}) {
        const data = await this.request('post', this.paths.employees, context);
        return normalizeResultItems(data);
    }

    async exportCountries(context = {}) {
        const data = await this.request('post', this.paths.countries, context);
        return normalizeResultItems(data);
    }

    async exportStates(context = {}) {
        const data = await this.request('post', this.paths.states, context);
        return normalizeResultItems(data);
    }

    async exportCities(context = {}) {
        const data = await this.request('post', this.paths.cities, context);
        return normalizeResultItems(data);
    }

    async exportPayrollPayments(context = {}) {
        const data = await this.request('post', this.paths.payrollPayments, context);
        return normalizeResultItems(data);
    }
}

export const createMicrosipConnectorService = (options) => new MicrosipConnectorService(options);
