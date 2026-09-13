// backend/src/routes/gamesRoutes.js

const express = require('express');
const router = express.Router();
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const gamesController = require('../controllers/gamesController');
const assetController = require('../controllers/assetController');
const { protect } = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const { uploadRateLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');

const gameAssetTempDir = path.join(os.tmpdir(), 'gdgsc-game-assets');
fs.mkdirSync(gameAssetTempDir, { recursive: true });
const gameAssetUpload = multer({
  dest: gameAssetTempDir,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
});

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

// GET    /api/games/admin            — All games, including unpublished games (admin)
router.get('/admin', protect, admin, gamesController.getAdminGames);
router.get('/admin/:id', protect, admin, gamesController.getAdminGame);
router.get('/:id/game-data/download', protect, admin, gamesController.downloadGameData);
router.get('/:id/publication', protect, admin, gamesController.getPublicationValidation);
router.post('/:id/publication', protect, admin, gamesController.setPublication);
router.post('/:id/game-data/recover', protect, admin, gamesController.recoverGameData);
router.post('/:id/game-data/sync', protect, admin, gamesController.syncGameData);

// GET    /api/games                  — All games (supports ?genre=Action&search=battle)
router.get('/', gamesController.getGames);

// ==================== GAME ASSET ROUTES ====================
// Note: These must come before /:id to avoid conflict or be mapped as sub-resources

// GET    /api/games/:gameId/assets   — List ready assets for a game
router.get('/:gameId/assets', optionalAuth, assetController.getGameAssets);

router.post('/:gameId/assets/manual-instructions', protect, admin, assetController.prepareManualUpload);
router.get('/:gameId/assets/manual/:assetId', protect, admin, assetController.getManualUploadInstructions);
router.post('/:gameId/assets/manual/:assetId/register', protect, admin, assetController.registerManualUpload);

// POST   /api/games/:gameId/assets/upload — Request presigned upload URL (admin, rate-limited)
router.post('/:gameId/assets/upload', protect, admin, uploadRateLimiter, assetController.createUploadUrl);

// POST   /api/games/:gameId/assets/upload-file — Backend-owned asset upload
router.post('/:gameId/assets/upload-file', protect, admin, uploadRateLimiter, gameAssetUpload.single('file'), assetController.uploadFile);

// POST   /api/games/:gameId/assets/multipart/start — Start multipart upload (admin, rate-limited)
router.post('/:gameId/assets/multipart/start', protect, admin, uploadRateLimiter, assetController.startMultipartUpload);

// ==================== INDIVIDUAL GAME CRUD ====================

// GET    /api/games/:id              — Single game detail
router.get('/:id', gamesController.getGameById);

// POST   /api/games                  — Create a game (admin)
router.post('/', protect, admin, gamesController.createGame);

// PATCH  /api/games/:id/assets/reorder — Reorder screenshot or trailer assets (admin)
// MUST come before PATCH /:id so Express doesn't match "assets" as the :id segment
router.patch('/:id/assets/reorder', protect, admin, gamesController.reorderGameAssets);

// PATCH  /api/games/:id              — Update a game (admin)
router.patch('/:id', protect, admin, gamesController.updateGame);

// PUT    /api/games/:id              — Update a game (admin alias)
router.put('/:id', protect, admin, gamesController.updateGame);


// DELETE /api/games/:id              — Delete a game (admin)
router.delete('/:id', protect, admin, gamesController.deleteGame);


module.exports = router;
