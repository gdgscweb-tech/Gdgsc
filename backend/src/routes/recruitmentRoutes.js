// backend/src/routes/recruitmentRoutes.js

const express = require('express');
const router = express.Router();
const recruitmentController = require('../controllers/recruitmentController');
const { protect } = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// --- Public route — no auth required ---

// GET /api/recruitments/config — returns the active recruitment event's _id and metadata
// Frontend calls this on load to discover the event without hardcoding an ObjectId
router.get('/config', recruitmentController.getRecruitmentConfig);

// --- User routes ---

// GET /api/recruitments/me — must come BEFORE /:id so 'me' isn't treated as an ID
router.get('/me', protect, recruitmentController.getMyApplication);

// PUT /api/recruitments/me — same ordering requirement
router.put('/me', protect, recruitmentController.updateMyApplication);

// POST /api/recruitments — submit a new application
router.post('/', protect, recruitmentController.submitApplication);

// --- Admin routes ---

// GET /api/recruitments/export/csv — must come BEFORE /:id
router.get('/export/csv', protect, admin, recruitmentController.exportCsv);

// GET /api/recruitments — list all applications (with optional search/filter)
router.get('/', protect, admin, recruitmentController.getAllApplications);

// PUT /api/recruitments/:id/status — update a single application's status
router.put('/:id/status', protect, admin, recruitmentController.updateApplicationStatus);

module.exports = router;
