/**
 * src/middleware/upload.middleware.js
 * Multer + Cloudinary storage for feedback photo uploads
 */
const multer = require('multer');

// Store in memory first, then upload to Cloudinary in the controller
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

module.exports = upload;
