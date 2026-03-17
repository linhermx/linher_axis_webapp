import pool from '../config/db.js';
import { verifyAccessToken } from '../utils/AuthToken.js';
import { getUserSessionById } from '../utils/SessionUser.js';

const parseBearerToken = (headerValue = '') => {
    const [scheme, token] = String(headerValue).trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
};

export const authenticateToken = async (req, res, next) => {
    try {
        const token = parseBearerToken(req.headers.authorization);
        if (!token) {
            return res.status(401).json({ message: 'Autenticacion requerida' });
        }

        const payload = verifyAccessToken(token);
        const userId = Number(payload?.sub || payload?.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ message: 'Token invalido' });
        }

        const sessionUser = await getUserSessionById(pool, userId);
        if (!sessionUser || sessionUser.status !== 'active') {
            return res.status(401).json({ message: 'Sesion invalida o usuario inactivo' });
        }

        req.authUser = sessionUser;
        req.user = { id: sessionUser.id, role: sessionUser.role_name };
        return next();
    } catch {
        return res.status(401).json({ message: 'Sesion expirada o invalida' });
    }
};
