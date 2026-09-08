// backend/src/middleware/optionalAuth.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, req.user is set.
 * If no token or an invalid token is provided, execution continues without error
 * and req.user remains undefined.
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      const token = req.headers.authorization.split(" ")[1];
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            const user = await User.findById(decoded.id).select("-password");
            if (user) {
              req.user = user;
            }
          }
        } catch (err) {
          // Token invalid or expired - ignore for optional auth
        }
      }
    }
  } catch (err) {
    // Ignore errors in optional auth
  }
  next();
};

module.exports = optionalAuth;
