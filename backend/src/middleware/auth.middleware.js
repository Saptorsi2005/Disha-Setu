/**
 * src/middleware/auth.middleware.js
 * JWT verification middleware
 */
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Require a valid JWT. Attaches req.user = { id, phone, isGuest }
 */
const requireAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user still exists in DB
        const result = await query(`SELECT id, phone, name, is_guest, role FROM users WHERE id = $1`, [decoded.sub]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Optional auth — attaches req.user if token is present, but doesn't block if missing
 */
const optionalAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) return next();

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await query(`SELECT id, phone, name, is_guest, role FROM users WHERE id = $1`, [decoded.sub]);
        if (result.rows.length > 0) req.user = result.rows[0];
    } catch (_) {
        // Silently ignore invalid tokens for optional auth
    }
    next();
};

/**
 * Sign a JWT for a given user ID
 */
const signToken = (userId, isGuest = false) => {
    const expiresIn = isGuest ? (process.env.JWT_GUEST_EXPIRES_IN || '1d') : (process.env.JWT_EXPIRES_IN || '7d');
    return jwt.sign(
        { sub: userId, isGuest },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

module.exports = { requireAuth, optionalAuth, signToken };
