/**
 * src/routes/auth.routes.js
 */
const router = require('express').Router();
const { sendOTP, verifyOTPHandler, googleAuth, guestAuth,
    registerPushToken, getMe } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTPHandler);
router.post('/google', googleAuth);
router.post('/guest', guestAuth);
router.post('/push-token', requireAuth, registerPushToken);
router.get('/me', requireAuth, getMe);

module.exports = router;
