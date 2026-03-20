/**
 * src/controllers/document-analysis.controller.js
 * Handles POST /api/navigation/analyze-document
 */
const multer = require('multer');
const { analyzeDocumentAndRoute } = require('../services/document-analysis.service');

// Memory-only storage (no files written to disk ever)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Upload PDF, TXT, or image.'));
        }
    },
});

// Multer middleware (exported for route binding)
const uploadMiddleware = upload.single('file');

/**
 * POST /api/navigation/analyze-document
 * Body: multipart/form-data with `file` + `building_id`
 */
async function analyzeDocument(req, res, next) {
    try {
        const { building_id, accessible } = req.body;

        if (!building_id) {
            return res.status(400).json({ error: 'building_id is required' });
        }

        // Allow text input without a file (for testing or direct text input)
        let fileBuffer, mimetype;
        if (req.file) {
            fileBuffer = req.file.buffer;
            mimetype = req.file.mimetype;
        } else if (req.body.text) {
            fileBuffer = Buffer.from(req.body.text, 'utf-8');
            mimetype = 'text/plain';
        } else {
            return res.status(400).json({ error: 'Provide either a file or a text field' });
        }

        const result = await analyzeDocumentAndRoute(
            fileBuffer,
            mimetype,
            building_id,
            { accessibleOnly: accessible === 'true' }
        );

        // Buffer is automatically garbage-collected — no persistent storage
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = { uploadMiddleware, analyzeDocument };
