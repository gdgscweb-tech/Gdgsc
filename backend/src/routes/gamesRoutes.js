// backend/src/routes/gamesRoutes.js

const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');
const assetController = require('../controllers/assetController');
const { protect } = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const { uploadRateLimiter } = require('../middleware/rateLimiter');

// ==================== CATEGORY ROUTES ====================
// These MUST come before /:id to avoid "categories" being treated as an id

// GET    /api/games/categories       — All active categories (public)
router.get('/categories', gamesController.getCategories);

// POST   /api/games/categories       — Create a category (admin)
router.post('/categories', protect, admin, gamesController.createCategory);

// PUT    /api/games/categories/:id   — Update a category (admin)
router.put('/categories/:id', protect, admin, gamesController.updateCategory);

// DELETE /api/games/categories/:id   — Delete a category (admin)
router.delete('/categories/:id', protect, admin, gamesController.deleteCategory);

// ==================== PUBLIC GAME ROUTES ====================

// GET    /api/games/featured         — Must be before /:id to avoid conflict
router.get('/featured', gamesController.getFeaturedGames);

// GET    /api/games                  — All games (supports ?genre=Action&search=battle)
router.get('/', gamesController.getGames);

// ==================== GAME ASSET ROUTES ====================
// Note: These must come before /:id to avoid conflict or be mapped as sub-resources

// GET    /api/games/:gameId/assets   — List ready assets for a game
router.get('/:gameId/assets', optionalAuth, assetController.getGameAssets);

// POST   /api/games/:gameId/assets/upload — Request presigned upload URL (admin, rate-limited)
router.post('/:gameId/assets/upload', protect, admin, uploadRateLimiter, assetController.createUploadUrl);

// POST   /api/games/:gameId/assets/multipart/start — Start multipart upload (admin, rate-limited)
router.post('/:gameId/assets/multipart/start', protect, admin, uploadRateLimiter, assetController.startMultipartUpload);

// ==================== INDIVIDUAL GAME CRUD ====================

// GET    /api/games/:id              — Single game detail
router.get('/:id', gamesController.getGameById);

// POST   /api/games                  — Create a game (admin)
router.post('/', protect, admin, gamesController.createGame);

// PATCH  /api/games/:id              — Update a game (admin)
router.patch('/:id', protect, admin, gamesController.updateGame);

// PUT    /api/games/:id              — Update a game (admin alias)
router.put('/:id', protect, admin, gamesController.updateGame);

// DELETE /api/games/:id              — Delete a game (admin)
router.delete('/:id', protect, admin, gamesController.deleteGame);

module.exports = router;
