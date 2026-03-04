/**
 * src/services/otp.service.js
 * OTP generation and verification
 */
const { query } = require('../config/db');

/**
 * Generate and store a 6-digit OTP for a phone number
 */
const generateOTP = async (phone) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000);

    // Invalidate old OTPs for this phone
    await query(`UPDATE otps SET used = TRUE WHERE phone = $1 AND used = FALSE`, [phone]);

    // Store new OTP
    await query(
        `INSERT INTO otps (phone, code, expires_at) VALUES ($1, $2, $3)`,
        [phone, code, expiresAt]
    );

    // In production: send via Twilio/MSG91
    // For now: return code (dev mode only)
    console.log(`[OTP] Phone: ${phone} → Code: ${code}`);
    return code;
};

/**
 * Verify an OTP. Returns true if valid, false otherwise.
 */
const verifyOTP = async (phone, code) => {
    const result = await query(
        `SELECT id FROM otps
         WHERE phone = $1
           AND code  = $2
           AND used  = FALSE
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [phone, code]
    );

    if (result.rows.length === 0) return false;

    // Mark as used
    await query(`UPDATE otps SET used = TRUE WHERE id = $1`, [result.rows[0].id]);
    return true;
};

module.exports = { generateOTP, verifyOTP };
