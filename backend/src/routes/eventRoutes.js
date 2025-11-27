// backend/src/routes/eventRoutes.js

const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware"); // Import admin middleware
const { upload } = require("../config/cloudinary");

// Public routes for fetching events
router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEventById);

// Admin-only routes for managing events
router.post(
  "/",
  protect,
  admin,
  upload.single("image"),
  eventController.createEvent
);

router.put("/:id", protect, admin, upload.single('image'), eventController.updateEvent);
router.delete("/:id", protect, admin, eventController.deleteEvent);

module.exports = router;
