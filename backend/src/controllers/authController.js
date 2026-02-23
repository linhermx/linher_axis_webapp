import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user.id },
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

        res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
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
