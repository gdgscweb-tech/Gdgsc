// backend/src/routes/assetRoutes.js

const express = require("express");
const router = express.Router();
const assetController = require("../controllers/assetController");
const { protect } = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

// ==================== ASSET MANAGEMENT ROUTES ====================

// GET /api/assets/drive/:fileId — Stream a private Google Drive file
router.get("/drive/:fileId", optionalAuth, assetController.proxyDriveFile);

// GET    /api/assets/:assetId         — Get asset metadata (public for public assets, auth for private)
router.get("/:assetId", optionalAuth, assetController.getAssetById);

// GET    /api/assets/:assetId/url     — Get download or CDN URL
router.get("/:assetId/url", optionalAuth, assetController.getDownloadUrl);

// POST   /api/assets/:assetId/complete — Complete direct single upload verification (admin)
router.post(
  "/:assetId/complete",
  protect,
  admin,
  assetController.completeUpload,
);

// DELETE /api/assets/:assetId         — Delete asset from storage & DB (admin)
router.delete("/:assetId", protect, admin, assetController.deleteAsset);

// ==================== MULTIPART UPLOAD ROUTES ====================

// POST   /api/assets/:assetId/multipart/sign     — Sign a part upload URL (admin)
router.post(
  "/:assetId/multipart/sign",
  protect,
  admin,
  assetController.signMultipartPart,
);

// POST   /api/assets/:assetId/multipart/complete — Complete multipart upload (admin)
router.post(
  "/:assetId/multipart/complete",
  protect,
  admin,
  assetController.completeMultipartUpload,
);

// POST   /api/assets/:assetId/multipart/abort    — Abort multipart upload (admin)
router.post(
  "/:assetId/multipart/abort",
  protect,
  admin,
  assetController.abortMultipartUpload,
);

module.exports = router;
