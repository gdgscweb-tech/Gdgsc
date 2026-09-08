// backend/src/middleware/rateLimiter.js

const rateLimit = require("express-rate-limit");
const { sendError } = require("../utils/apiResponse");

/**
 * Rate limiter for asset upload requests and presigned URL creation
 * Prevents malicious or abusive generation of presigned storage URLs.
 */
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 upload requests per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    return sendError(
      res,
      "RATE_LIMIT_EXCEEDED",
      "Too many upload requests created from this IP. Please try again later.",
      429,
    );
  },
});

/**
 * General API rate limiter for write/mutate endpoints
 */
const apiWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      "RATE_LIMIT_EXCEEDED",
      "Too many requests. Please slow down.",
      429,
    );
  },
});

module.exports = {
  uploadRateLimiter,
  apiWriteLimiter,
};
