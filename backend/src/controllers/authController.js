import argon2 from 'argon2';
import pool from '../config/db.js';
import { signAuthTokens, verifyRefreshToken } from '../utils/AuthToken.js';
import { getUserSessionById } from '../utils/SessionUser.js';
import { SystemLogger } from '../utils/SystemLogger.js';
import { buildRequestContext, logHandledError } from '../utils/RequestContext.js';

const logger = new SystemLogger(pool);

const toBoolean = (value) => (
    value === true
    || value === 'true'
    || value === 1
    || value === '1'
);

const toNumericUserId = (value) => {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
};

const validatePasswordStrength = (password) => {
    const normalizedPassword = String(password || '');
    if (normalizedPassword.length < 10) {
        return 'La contrasena debe tener al menos 10 caracteres.';
    }

    const hasLetter = /[A-Za-z]/.test(normalizedPassword);
    const hasNumber = /\d/.test(normalizedPassword);
    if (!hasLetter || !hasNumber) {
        return 'La contrasena debe incluir al menos una letra y un numero.';
    }

    return null;
};

const isTokenExpired = (expiresAt) => {
    if (!expiresAt) {
        return true;
    }

    return new Date(expiresAt) < new Date();
};

const findActiveUserByEmail = async (email) => {
    const [users] = await pool.query(
        `SELECT id, email, password_hash, status, must_change_password
         FROM users
         WHERE email = ?
           AND status = 'active'
         LIMIT 1`,
        [email]
    );

    return users[0] || null;
};

const findActiveUserById = async (userId) => {
    const [users] = await pool.query(
        `SELECT id, email, password_hash, status, must_change_password
         FROM users
         WHERE id = ?
           AND status = 'active'
         LIMIT 1`,
        [userId]
    );

    return users[0] || null;
};

const saveRefreshToken = async (userId, token, expiresAtIso) => {
    await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at, last_used_at) VALUES (?, ?, ?, NOW())',
        [userId, token, expiresAtIso]
    );
};

const findRefreshToken = async (token) => {
    const [rows] = await pool.query(
        `SELECT id, user_id, token, expires_at, last_used_at, revoked_at
         FROM refresh_tokens
         WHERE token = ?
           AND revoked_at IS NULL
         LIMIT 1`,
        [token]
    );

    return rows[0] || null;
};

const revokeRefreshToken = async (token, reason = 'manual') => {
    const [result] = await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW(),
             revoked_reason = ?,
             last_used_at = NOW()
         WHERE token = ?
           AND revoked_at IS NULL`,
        [reason, token]
    );
    return result.affectedRows > 0;
};

const markRefreshTokenAsUsed = async (token) => {
    await pool.query(
        `UPDATE refresh_tokens
         SET last_used_at = NOW()
         WHERE token = ?
           AND revoked_at IS NULL`,
        [token]
    );
};

const deleteExpiredRefreshTokens = async () => {
    await pool.query(
        `DELETE FROM refresh_tokens
         WHERE expires_at < NOW()
            OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))`
    );
};

const pruneRefreshTokensByUser = async (userId, limit = 5) => {
    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
    await pool.query(
        `DELETE FROM refresh_tokens
         WHERE user_id = ?
           AND (
                revoked_at IS NOT NULL
                OR expires_at < NOW()
                OR id NOT IN (
                SELECT id FROM (
                    SELECT id
                    FROM refresh_tokens
                    WHERE user_id = ?
                      AND revoked_at IS NULL
                      AND expires_at >= NOW()
                    ORDER BY created_at DESC, id DESC
                    LIMIT ?
                ) AS latest_tokens
                )
           )`,
        [userId, userId, normalizedLimit]
    );
};

const loadActiveUserSession = async (userId) => {
    const sessionUser = await getUserSessionById(pool, userId);
    if (!sessionUser || sessionUser.status !== 'active') {
        return null;
    }

    return sessionUser;
};

const handleApiError = async (req, res, error, action, message) => {
    await logHandledError({
        logger,
        req,
        action,
        error,
        details: buildRequestContext(req),
    });

    return res.status(500).json({ message });
};

export const login = async (req, res) => {
    const { email, password, remember_me } = req.body || {};

    try {
        const user = await findActiveUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
        }

        const passwordMatches = await argon2.verify(user.password_hash, String(password || '')).catch(() => false);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Contrasena incorrecta' });
        }

        const sessionUser = await loadActiveUserSession(user.id);
        if (!sessionUser) {
            return res.status(401).json({ message: 'Sesion invalida o usuario inactivo' });
        }

        const sessionTokens = signAuthTokens(
            { userId: sessionUser.id, roleName: sessionUser.role_name },
            remember_me
        );

        await deleteExpiredRefreshTokens();
        await saveRefreshToken(sessionUser.id, sessionTokens.refreshToken, sessionTokens.refresh_expires_at);
        await pruneRefreshTokensByUser(sessionUser.id, 5);

        res.json({
            accessToken: sessionTokens.accessToken,
            refreshToken: sessionTokens.refreshToken,
            user: sessionUser,
        });

        await logger.auth(sessionUser.id, 'LOGIN', {
            email: sessionUser.email,
            ...buildRequestContext(req),
        }, req.ip);
    } catch (error) {
        return handleApiError(req, res, error, 'AUTH_LOGIN_ERROR', 'Error al iniciar sesion');
    }
};

export const refresh = async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token requerido' });
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const persistedToken = await findRefreshToken(refreshToken);

        if (!persistedToken) {
            return res.status(403).json({ message: 'Refresh token invalido' });
        }

        if (isTokenExpired(persistedToken.expires_at)) {
            await revokeRefreshToken(refreshToken, 'expired');
            return res.status(403).json({ message: 'Refresh token expirado' });
        }

        const tokenUserId = toNumericUserId(decoded?.sub || decoded?.id || persistedToken.user_id);
        if (!tokenUserId) {
            await revokeRefreshToken(refreshToken, 'invalid_user');
            return res.status(403).json({ message: 'Refresh token invalido' });
        }

        const sessionUser = await loadActiveUserSession(tokenUserId);
        if (!sessionUser) {
            await revokeRefreshToken(refreshToken, 'inactive_user');
            return res.status(403).json({ message: 'Usuario inactivo o no encontrado' });
        }

        await markRefreshTokenAsUsed(refreshToken);

        const rememberMe = toBoolean(decoded?.remember_me);
        const rotatedTokens = signAuthTokens(
            { userId: sessionUser.id, roleName: sessionUser.role_name },
            rememberMe
        );

        await revokeRefreshToken(refreshToken, 'rotated');
        await saveRefreshToken(sessionUser.id, rotatedTokens.refreshToken, rotatedTokens.refresh_expires_at);
        await pruneRefreshTokensByUser(sessionUser.id, 5);

        res.json({
            accessToken: rotatedTokens.accessToken,
            refreshToken: rotatedTokens.refreshToken,
            user: sessionUser,
        });

        await logger.auth(sessionUser.id, 'TOKEN_REFRESH', {
            ...buildRequestContext(req),
        }, req.ip);
    } catch {
        return res.status(403).json({ message: 'Refresh token invalido o expirado' });
    }
};

export const logout = async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token requerido' });
    }

    try {
        await revokeRefreshToken(refreshToken, 'logout');

        try {
            const decoded = verifyRefreshToken(refreshToken);
            const userId = toNumericUserId(decoded?.sub || decoded?.id);
            if (userId) {
                await logger.auth(userId, 'LOGOUT', {
                    ...buildRequestContext(req),
                }, req.ip);
            }
        } catch {
            // Ignore decode failures on logout to keep response stable.
        }

        return res.json({ message: 'Sesion cerrada correctamente' });
    } catch (error) {
        return handleApiError(req, res, error, 'AUTH_LOGOUT_ERROR', 'Error al cerrar sesion');
    }
};

export const changeRequiredPassword = async (req, res) => {
    const userId = toNumericUserId(req.authUser?.id || req.user?.id);
    const currentPassword = String(req.body?.current_password || '');
    const newPassword = String(req.body?.new_password || '');

    if (!userId) {
        return res.status(401).json({ message: 'Autenticacion requerida' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Debes capturar la contrasena actual y la nueva contrasena' });
    }

    const passwordValidationMessage = validatePasswordStrength(newPassword);
    if (passwordValidationMessage) {
        return res.status(400).json({ message: passwordValidationMessage });
    }

    try {
        const user = await findActiveUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }

        if (!Boolean(Number(user.must_change_password || 0))) {
            return res.status(409).json({ message: 'La cuenta no requiere cambio obligatorio de contrasena' });
        }

        const currentPasswordMatches = await argon2.verify(user.password_hash, currentPassword).catch(() => false);
        if (!currentPasswordMatches) {
            return res.status(401).json({ message: 'La contrasena actual es incorrecta' });
        }

        const reusedPassword = await argon2.verify(user.password_hash, newPassword).catch(() => false);
        if (reusedPassword) {
            return res.status(400).json({ message: 'La nueva contrasena debe ser distinta a la actual' });
        }

        const newPasswordHash = await argon2.hash(newPassword);
        await pool.query(
            `UPDATE users
             SET password_hash = ?,
                 must_change_password = 0,
                 password_changed_at = NOW()
             WHERE id = ?`,
            [newPasswordHash, userId]
        );

        const sessionUser = await loadActiveUserSession(userId);

        await logger.auth(userId, 'PASSWORD_CHANGE_REQUIRED_COMPLETED', {
            email: user.email,
            ...buildRequestContext(req),
        }, req.ip);

        return res.json({
            message: 'Contrasena actualizada correctamente.',
            user: sessionUser,
        });
    } catch (error) {
        return handleApiError(
            req,
            res,
            error,
            'AUTH_CHANGE_REQUIRED_PASSWORD_ERROR',
            'Error al actualizar contrasena'
        );
    }
};

export const me = async (req, res) => {
    try {
        const userId = toNumericUserId(req.authUser?.id || req.user?.id);
        if (!userId) {
            return res.status(401).json({ message: 'Autenticacion requerida' });
        }

        const sessionUser = await loadActiveUserSession(userId);
        if (!sessionUser) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }

        return res.json({ user: sessionUser });
    } catch (error) {
        return handleApiError(req, res, error, 'AUTH_ME_ERROR', 'Error al cargar sesion');
    }
};
