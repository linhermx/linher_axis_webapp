import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pool from '../config/db.js';

const buildUserSession = async (userId) => {
    const [userRows] = await pool.query(
        `SELECT u.id, u.email, e.id AS employee_id, e.first_name, e.last_name
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id
         WHERE u.id = ?
         LIMIT 1`,
        [userId]
    );

    const user = userRows[0];
    if (!user) return null;

    const [roleRows] = await pool.query(
        `SELECT r.name
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = ?
         ORDER BY r.id ASC
         LIMIT 1`,
        [userId]
    );

    const [permissionRows] = await pool.query(
        `SELECT DISTINCT p.code
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = ?
         ORDER BY p.code ASC`,
        [userId]
    );

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const fallbackName = typeof user.email === 'string' ? user.email.split('@')[0] : 'Usuario';

    return {
        id: user.id,
        employee_id: user.employee_id ?? null,
        name: fullName || fallbackName || 'Usuario',
        email: user.email,
        photo_path: null,
        role_name: roleRows[0]?.name || null,
        permissions: permissionRows.map((row) => row.code),
    };
};

const generateTokens = (user) => {
    const tokenId = randomUUID();

    const accessToken = jwt.sign(
        { id: user.id, email: user.email, jti: tokenId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user.id, jti: tokenId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND status = "active"', [email]);
        const user = users[0];

        if (!user || !(await argon2.verify(user.password_hash, password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token in DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, expiresAt]);

        const sessionUser = await buildUserSession(user.id);
        if (!sessionUser) {
            return res.status(500).json({ message: 'Unable to load user session' });
        }

        res.json({ accessToken, refreshToken, user: sessionUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const refresh = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const [tokens] = await pool.query('SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ?',
            [decoded.id, refreshToken]);

        if (tokens.length === 0) return res.status(403).json({ message: 'Invalid refresh token' });

        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        const user = users[0];

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

        // Rotate refresh token
        await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, newRefreshToken, expiresAt]);

        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

export const logout = async (req, res) => {
    const { refreshToken } = req.body;
    try {
        await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const me = async (req, res) => {
    try {
        const sessionUser = await buildUserSession(req.user.id);
        if (!sessionUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: sessionUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
