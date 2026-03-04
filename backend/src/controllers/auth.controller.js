/**
 * src/controllers/auth.controller.js
 * Handles OTP, Google, and Guest authentication
 */
const { query } = require('../config/db');
const { generateOTP, verifyOTP } = require('../services/otp.service');
const { signToken } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

// ── POST /api/auth/send-otp ────────────────────────────────────
const sendOTP = async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Valid 10-digit phone number required' });
        }

        const code = await generateOTP(phone);

        // Auto-create user if they don't exist
        await query(
            `INSERT INTO users (phone) VALUES ($1)
             ON CONFLICT (phone) DO NOTHING`,
            [phone]
        );

        res.json({
            message: 'OTP sent successfully',
            // Return OTP in dev only — remove in production!
            ...(process.env.NODE_ENV === 'development' && { otp: code }),
        });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/verify-otp ──────────────────────────────────
const verifyOTPHandler = async (req, res, next) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ error: 'phone and otp are required' });
        }

        const valid = await verifyOTP(phone, otp);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        // Get user
        const result = await query(
            `SELECT id, phone, name, avatar_url, civic_level, civic_points
             FROM users WHERE phone = $1`,
            [phone]
        );
        const user = result.rows[0];
        const token = signToken(user.id);

        res.json({ token, user });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/google ──────────────────────────────────────
const googleAuth = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'idToken required' });
        }

        // Verify Google ID token
        // In production: use google-auth-library to verify
        // For scaffold: decode and trust (dev only)
        let googlePayload;
        try {
            // Check if it's a JWT (3 parts) or simple base64 token
            if (idToken.includes('.')) {
                // JWT format: decode middle part
                const base64Url = idToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                googlePayload = JSON.parse(Buffer.from(base64, 'base64').toString());
            } else {
                // Simple base64 format (from accessToken flow)
                googlePayload = JSON.parse(Buffer.from(idToken, 'base64').toString());
            }
        } catch (_) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const googleId = googlePayload.sub;
        const name = googlePayload.name || '';
        const avatar = googlePayload.picture || null;

        if (!googleId) return res.status(401).json({ error: 'Invalid Google token' });

        // Upsert user
        const result = await query(
            `INSERT INTO users (google_id, name, avatar_url)
             VALUES ($1, $2, $3)
             ON CONFLICT (google_id)
             DO UPDATE SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
             RETURNING id, name, avatar_url, civic_level, civic_points`,
            [googleId, name, avatar]
        );

        const user = result.rows[0];
        const token = signToken(user.id);

        res.json({ token, user });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/guest ───────────────────────────────────────
const guestAuth = async (req, res, next) => {
    try {
        const result = await query(
            `INSERT INTO users (is_guest, name)
             VALUES (TRUE, 'Guest User')
             RETURNING id, name, is_guest`,
        );
        const user = result.rows[0];
        const token = signToken(user.id, true);
        res.json({ token, user });
    } catch (err) {
        next(err);
    }
};

// ── POST /api/auth/push-token ──────────────────────────────────
const registerPushToken = async (req, res, next) => {
    try {
        const { token, platform } = req.body;
        const userId = req.user.id;

        if (!token) return res.status(400).json({ error: 'Push token required' });

        await query(
            `INSERT INTO push_tokens (user_id, token, platform)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, token) DO NOTHING`,
            [userId, token, platform || 'unknown']
        );

        // Also update user location storage entry skeleton
        await query(
            `INSERT INTO user_locations (user_id, location)
             VALUES ($1, NULL)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        res.json({ message: 'Push token registered' });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/auth/me ───────────────────────────────────────────
const getMe = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT id, phone, name, avatar_url, civic_level, civic_points, is_guest, created_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { sendOTP, verifyOTPHandler, googleAuth, guestAuth, registerPushToken, getMe };
