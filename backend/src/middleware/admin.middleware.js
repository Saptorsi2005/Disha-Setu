/**
 * src/middleware/admin.middleware.js
 * Admin-only route protection middleware
 */
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Require admin role
 * Must be used AFTER requireAuth middleware
 */
const requireAdmin = async (req, res, next) => {
    try {
        // First verify JWT token
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user exists and has admin role
        const result = await query(
            `SELECT id, phone, name, is_guest, role FROM users WHERE id = $1`,
            [decoded.sub]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Admin access required',
                message: 'You do not have permission to access this resource'
            });
        }

        // Attach user to request
        req.user = user;
        req.isAdmin = true;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { requireAdmin };
