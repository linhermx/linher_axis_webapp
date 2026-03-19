import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import meRoutes from './routes/meRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import { requestContextMiddleware, logRuntimeError } from './utils/RequestContext.js';
import { validateAuthConfig } from './utils/AuthToken.js';
import { SystemLogger } from './utils/SystemLogger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const logger = new SystemLogger(pool);

const toOrigin = (urlValue) => {
    if (!urlValue) {
        return null;
    }

    try {
        return new URL(urlValue).origin;
    } catch {
        return String(urlValue).replace(/\/+$/, '');
    }
};

const frontendOrigin = toOrigin(process.env.FRONTEND_URL || process.env.FRONTEND_APP_URL);
const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):517\d$/;
const allowedOrigins = [
    frontendOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
].filter(Boolean);

const healthCheckHandler = async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', message: error.message });
    }
};

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || localDevOriginPattern.test(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
}));
app.use(express.json());
app.use(requestContextMiddleware);

const v1 = express.Router();

// Routes
v1.use('/auth', authRoutes);
v1.use('/me', meRoutes);
v1.use('/employees', employeeRoutes);
v1.use('/documents', documentRoutes);
v1.use('/admin', adminRoutes);
v1.use('/organization', organizationRoutes);
v1.get('/health', healthCheckHandler);

app.use('/api/v1', v1);
app.use('/api', v1);

// Basic health check
app.get('/health', healthCheckHandler);

const startServer = async () => {
    try {
        validateAuthConfig();
        await pool.query('SELECT 1');
        // eslint-disable-next-line no-console
        console.log('Database connected successfully');
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Startup validation error:', error.message);
        await logRuntimeError({
            logger,
            action: 'SERVER_STARTUP_ERROR',
            error,
            details: { port: PORT },
            source: 'startup',
            severity: 'critical',
        });
    } finally {
        app.listen(PORT, () => {
            // eslint-disable-next-line no-console
            console.log(`Server running on port ${PORT}`);
        });
    }
};

process.on('uncaughtException', (error) => {
    // eslint-disable-next-line no-console
    console.error('Uncaught exception:', error);
    void logRuntimeError({
        logger,
        action: 'UNCAUGHT_EXCEPTION',
        error,
        source: 'runtime',
        severity: 'critical',
    });
});

process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled rejection:', reason);
    void logRuntimeError({
        logger,
        action: 'UNHANDLED_REJECTION',
        error: reason instanceof Error ? reason : new Error(String(reason)),
        details: { reason: String(reason) },
        source: 'runtime',
        severity: 'critical',
    });
});

void startServer();
