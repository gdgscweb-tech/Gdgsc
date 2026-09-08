// backend/src/utils/apiResponse.js

/**
 * Standard API response helpers ensuring a consistent envelope structure
 * across all Game and Asset endpoints.
 */

class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Sends a standard success response
 * @param {object} res - Express response object
 * @param {any} data - Payload data
 * @param {number} [statusCode=200] - HTTP status code
 * @param {object} [meta] - Optional metadata (pagination, counts, etc.)
 */
const sendSuccess = (res, data, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    data,
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Sends a standard error response
 * @param {object} res - Express response object
 * @param {string} code - Machine-readable error code (e.g. ASSET_NOT_FOUND)
 * @param {string} message - Human-readable error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {any} [details=null] - Optional detailed validation or debug info
 */
const sendError = (res, code, message, statusCode = 500, details = null) => {
  const payload = {
    success: false,
    error: {
      code: code || "INTERNAL_SERVER_ERROR",
      message: message || "An unexpected error occurred",
    },
  };
  if (details) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
};

module.exports = {
  ApiError,
  sendSuccess,
  sendError,
};
