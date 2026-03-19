/**
 * src/services/otp.service.js
 * OTP generation and verification
 */
const { query } = require('../config/db');
let twilioClient;

// Initialize Twilio if credentials exist
console.log('[OTP] Checking Twilio config:', {
    hasSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasPhone: !!process.env.TWILIO_PHONE_NUMBER
});

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        twilioClient = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        console.log('[OTP] Twilio client initialized successfully');
    } catch (err) {
        console.error('[OTP] Failed to initialize Twilio:', err.message);
    }
} else {
    console.log('[OTP] Twilio credentials missing from environment. Using Mock Mode.');
}

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

    let sentViaSMS = false;
    // Try sending via Twilio if configured
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        try {
            // Prepend +91 for 10-digit Indian numbers, otherwise use as provided
            const formattedPhone = (phone.length === 10 && !phone.startsWith('+')) ? `+91${phone}` : (phone.startsWith('+') ? phone : `+${phone}`);
            
            await twilioClient.messages.create({
                body: `Your DishaSetu verification code is: ${code}. Valid for 10 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone
            });
            console.log(`[OTP] SMS sent via Twilio to ${formattedPhone}`);
            sentViaSMS = true;
        } catch (err) {
            console.error(`[OTP] Twilio send error for ${phone}:`, err.message);
        }
    } else {
        // Fallback: log to console (Mock Mode)
        console.log(`[OTP] Mock Mode: Phone: ${phone} → Code: ${code}`);
    }

    return { code, sentViaSMS };
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
