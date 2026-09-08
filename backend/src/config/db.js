// backend/src/config/db.js

const mongoose = require("mongoose");

/**
 * Resolves the environment-specific MongoDB connection URI.
 *
 * Rules:
 * - Production (NODE_ENV === 'production'):
 *     Strictly requires PROD_MONGO_URI or MONGODB_URI_PROD (or host-injected MONGO_URI/MONGODB_URI).
 *     Throws a clear fatal error if missing; never falls back to development/local databases.
 * - Development (NODE_ENV === 'development'):
 *     Uses DEV_MONGO_URI or MONGODB_URI_DEV.
 *     Falls back to local development database (mongodb://127.0.0.1:27017/gdgsc_dev) if unset.
 *     Strictly NEVER inspects or connects to PROD_MONGO_URI.
 * - Test (NODE_ENV === 'test'):
 *     Uses TEST_MONGO_URI or defaults to mongodb://127.0.0.1:27017/gdgsc_test.
 */
const getMongoUri = () => {
  const env = (process.env.NODE_ENV || "development").trim().toLowerCase();

  if (env === "production") {
    const prodUri =
      process.env.PROD_MONGO_URI ||
      process.env.MONGODB_URI_PROD ||
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    if (!prodUri) {
      throw new Error(
        "FATAL: Production MongoDB URI is not configured. Please set PROD_MONGO_URI (or MONGO_URI) in your production environment variables.",
      );
    }
    return prodUri;
  }

  if (env === "test") {
    return (
      process.env.TEST_MONGO_URI ||
      process.env.MONGODB_URI_TEST ||
      "mongodb://127.0.0.1:27017/gdgsc_test"
    );
  }

  // Development environment: Strictly use dev config; never touch production
  const devUri =
    process.env.DEV_MONGO_URI ||
    process.env.MONGODB_URI_DEV ||
    process.env.MONGO_URI;

  if (devUri) {
    return devUri;
  }

  // Default local fallback for developer workstation convenience
  return "mongodb://127.0.0.1:27017/gdgsc_dev";
};

const connectDB = async () => {
  try {
    const mongoUri = getMongoUri();
    const env = (process.env.NODE_ENV || "development").trim().toLowerCase();

    // Mask credentials in console output for security
    const maskedUri = mongoUri.replace(/:([^:@]+)@/, ":****@");
    console.log(`Connecting to MongoDB [${env.toUpperCase()}]: ${maskedUri}`);

    const conn = await mongoose.connect(mongoUri);
    console.log(
      `MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name || "default"})`,
    );
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1); // Exit process with failure in dev/prod
    }
    throw error;
  }
};

module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
