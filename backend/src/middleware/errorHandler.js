// backend/src/middleware/errorHandler.js

const { ApiError, sendError } = require("../utils/apiResponse");

/**
 * Global Express error handling middleware.
 * Ensures consistent JSON response structure:
 * { success: false, error: { code: '...', message: '...' } }
 */
const errorHandler = (err, req, res, next) => {
  let statusCode =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred";
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    details = Object.values(err.errors || {}).map((e) => e.message);
  } else if (err.name === "CastError") {
    statusCode = 400;
    errorCode = "INVALID_IDENTIFIER";
    message = `Resource not found or invalid ID format (${err.value})`;
  } else if (err.code === 11000) {
    // Mongo duplicate key error
    statusCode = 409;
    errorCode = "DUPLICATE_RESOURCE";
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `A resource with this ${field} already exists`;
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    errorCode = "UNAUTHORIZED";
    message = "Invalid or expired token";
  }

  return sendError(res, errorCode, message, statusCode, details);
};

module.exports = errorHandler;
