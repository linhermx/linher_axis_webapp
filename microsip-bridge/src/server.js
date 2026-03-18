import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProvider } from './providers/providerFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();

const toBoolean = (value, fallback = false) => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const toInteger = (value, fallback = null) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

const PORT = toInteger(process.env.PORT, 5101);
const API_KEY = String(process.env.MICROSIP_CONNECTOR_API_KEY || '').trim();
const REQUIRE_API_KEY = toBoolean(process.env.MICROSIP_CONNECTOR_REQUIRE_API_KEY, true);
const DATA_MODE = String(process.env.MICROSIP_DATA_MODE || 'mock').trim().toLowerCase();
const provider = createProvider(DATA_MODE);

const withMeta = (items, context = {}) => ({
    items,
    total: items.length,
    context: {
        request_id: context.request_id || null,
        source_mode: DATA_MODE,
    },
});

const ensureApiKey = (req, res, next) => {
    if (!REQUIRE_API_KEY) {
        return next();
    }

    if (!API_KEY) {
        return res.status(500).json({
            message: 'MICROSIP_CONNECTOR_API_KEY no configurada en el bridge',
        });
    }

    const incomingApiKey = String(req.headers['x-api-key'] || '').trim();
    if (!incomingApiKey || incomingApiKey !== API_KEY) {
        return res.status(401).json({ message: 'API key invalida' });
    }

    return next();
};

const applyCommonFilters = (items, body = {}) => {
    let current = Array.isArray(items) ? [...items] : [];
    const activeOnly = toBoolean(body.active_only, false);
    if (activeOnly) {
        current = current.filter((item) => {
            const employmentStatus = String(item.employment_status || '').trim().toLowerCase();
            const activeFlag = String(item.is_active || '').trim().toLowerCase();
            return (
                employmentStatus === 'active'
                || ['1', 'true', 'yes', 'y', 'si', 'active'].includes(activeFlag)
            );
        });
    }

    const limit = toInteger(body.limit, null);
    if (limit) {
        current = current.slice(0, limit);
    }

    return current;
};

app.use(express.json({ limit: '1mb' }));

app.get('/health', async (req, res) => {
    try {
        const providerHealth = await provider.health({
            request_id: req.headers['x-request-id'] || null,
        });

        return res.json({
            status: 'ok',
            service: 'microsip-bridge',
            mode: DATA_MODE,
            provider: providerHealth,
            require_api_key: REQUIRE_API_KEY,
            has_api_key: Boolean(API_KEY),
            now: new Date().toISOString(),
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[microsip-bridge] health error:', error);
        return res.status(500).json({
            status: 'error',
            service: 'microsip-bridge',
            mode: DATA_MODE,
            message: error.message,
        });
    }
});

app.post('/exports/departments', ensureApiKey, async (req, res) => {
    try {
        const items = await provider.exportDepartments(req.body || {});
        return res.json(withMeta(applyCommonFilters(items, req.body), req.body || {}));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[microsip-bridge] departments export error:', error);
        return res.status(500).json({
            message: 'Error al exportar departamentos desde Microsip',
            code: error.code || null,
            details: error.details || null,
        });
    }
});

app.post('/exports/job-titles', ensureApiKey, async (req, res) => {
    try {
        const items = await provider.exportJobTitles(req.body || {});
        return res.json(withMeta(applyCommonFilters(items, req.body), req.body || {}));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[microsip-bridge] job titles export error:', error);
        return res.status(500).json({
            message: 'Error al exportar puestos desde Microsip',
            code: error.code || null,
            details: error.details || null,
        });
    }
});

app.post('/exports/employees', ensureApiKey, async (req, res) => {
    try {
        const items = await provider.exportEmployees(req.body || {});
        return res.json(withMeta(applyCommonFilters(items, req.body), req.body || {}));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[microsip-bridge] employees export error:', error);
        return res.status(500).json({
            message: 'Error al exportar empleados desde Microsip',
            code: error.code || null,
            details: error.details || null,
        });
    }
});

app.use((req, res) => {
    return res.status(404).json({ message: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Microsip bridge listening on port ${PORT}`);
});
