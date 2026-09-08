// backend/tests/testHelper.js

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_12345";
process.env.R2_ACCOUNT_ID = "test-account-id";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET_NAME = "test-bucket";
process.env.R2_PUBLIC_URL = "https://cdn.test.gdgsc.dev";
process.env.NODE_ENV = "test";

const createMockAdminUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  name: "Admin User",
  email: "admin@gdgsc.com",
  role: "admin",
  username: "admin",
});

const createMockNormalUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  name: "Normal Gamer",
  email: "gamer@gdgsc.com",
  role: "user",
  username: "gamer",
});

const generateTokenForUser = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
};

module.exports = {
  createMockAdminUser,
  createMockNormalUser,
  generateTokenForUser,
};
