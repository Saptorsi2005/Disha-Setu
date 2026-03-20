/**
 * src/routes/document-analysis.routes.js
 * NEW routes for Document-Aware Navigation — EXTENSION ONLY
 */
const express = require('express');
const router = express.Router();
const { uploadMiddleware, analyzeDocument } = require('../controllers/document-analysis.controller');

// POST /api/navigation/analyze-document
router.post('/navigation/analyze-document', uploadMiddleware, analyzeDocument);

module.exports = router;
