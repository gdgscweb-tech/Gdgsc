// backend/src/routes/gamesRoutes.js

const express = require("express");
const router = express.Router();
const gamesController = require("../controllers/gamesController");
const { protect } = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// ==================== CATEGORY ROUTES ====================
// These MUST come before /:id to avoid "categories" being treated as an id

// GET    /api/games/categories       — All active categories (public)
router.get("/categories", gamesController.getCategories);

// POST   /api/games/categories       — Create a category (admin)
router.post("/categories", protect, admin, gamesController.createCategory);

// PUT    /api/games/categories/:id   — Update a category (admin)
router.put("/categories/:id", protect, admin, gamesController.updateCategory);

// DELETE /api/games/categories/:id   — Delete a category (admin)
router.delete("/categories/:id", protect, admin, gamesController.deleteCategory);

// ==================== PUBLIC GAME ROUTES ====================

// GET /api/games/featured  — Must be before /:id to avoid conflict
router.get("/featured", gamesController.getFeaturedGames);

// GET /api/games            — All games (supports ?genre=Action&search=battle)
router.get("/", gamesController.getGames);

// GET /api/games/:id        — Single game detail
router.get("/:id", gamesController.getGameById);

// ==================== ADMIN GAME ROUTES ====================

// POST   /api/games         — Create a game
router.post("/", protect, admin, gamesController.createGame);

// PUT    /api/games/:id     — Update a game
router.put("/:id", protect, admin, gamesController.updateGame);

// DELETE /api/games/:id     — Delete a game
router.delete("/:id", protect, admin, gamesController.deleteGame);

module.exports = router;
