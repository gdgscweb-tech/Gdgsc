// backend/src/config/db.js

const mongoose = require("mongoose");

const DATABASE_BY_ENVIRONMENT = Object.freeze({
  development: "dev",
  production: "test",
  test: "gdgsc_test",
});

const getEnvironment = () =>
  (process.env.NODE_ENV || "development").trim().toLowerCase();

const withDatabaseName = (uri, databaseName) => {
  const value = String(uri).trim();
  const queryStart = value.search(/[?#]/);
  const head = queryStart === -1 ? value : value.slice(0, queryStart);
  const suffix = queryStart === -1 ? "" : value.slice(queryStart);
  const schemeEnd = head.indexOf("://");

  if (schemeEnd === -1) {
    throw new Error("MongoDB URI must include a valid scheme");
  }

  const pathStart = head.indexOf("/", schemeEnd + 3);
  const authority = pathStart === -1 ? head : head.slice(0, pathStart);
  return `${authority}/${databaseName}${suffix}`;
};

/**
 * Resolve the complete MongoDB connection configuration in one place.
 *
 * Both production and development use the confirmed GDGSC cluster URI from
 * PROD_MONGO_URI. NODE_ENV selects the database explicitly; the database path
 * supplied by the URI is always replaced, so gdgsc_prod or MongoDB defaults
 * can never be selected accidentally.
 */
const getMongoConfig = () => {
  const environment = getEnvironment();
  const databaseName = DATABASE_BY_ENVIRONMENT[environment];

  if (!databaseName) {
    throw new Error(
      `Unsupported NODE_ENV "${environment}". Use development, production, or test.`,
    );
  }

  if (environment === "test") {
    const testUri =
      process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/gdgsc_test";

    return {
      environment,
      databaseName,
      uri: withDatabaseName(testUri, databaseName),
      sourceVariable: process.env.TEST_MONGO_URI
        ? "TEST_MONGO_URI"
        : "local fallback",
    };
  }

  const clusterUri = process.env.PROD_MONGO_URI;
  if (!clusterUri) {
    throw new Error(
      `FATAL: PROD_MONGO_URI is required for ${environment} and must point to the GDGSC Atlas cluster.`,
    );
  }

  return {
    environment,
    databaseName,
    uri: withDatabaseName(clusterUri, databaseName),
    sourceVariable: "PROD_MONGO_URI",
  };
};

const getMongoUri = () => getMongoConfig().uri;

const connectDB = async () => {
  try {
    const config = getMongoConfig();
    console.log(
      `Connecting to MongoDB [${config.environment.toUpperCase()}] database=${config.databaseName}`,
    );

    const conn = await mongoose.connect(config.uri);
    console.log(
      `MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`,
    );
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (getEnvironment() === "test") {
      throw error;
    }
  }
};

module.exports = connectDB;
module.exports.getEnvironment = getEnvironment;
module.exports.getMongoConfig = getMongoConfig;
module.exports.getMongoUri = getMongoUri;
