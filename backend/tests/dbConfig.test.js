// backend/tests/dbConfig.test.js

describe("Database Environment Separation Unit Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DEV_MONGO_URI;
    delete process.env.PROD_MONGO_URI;
    delete process.env.MONGO_URI;
    delete process.env.MONGODB_URI;
    delete process.env.TEST_MONGO_URI;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const getDbHelper = () => {
    return require("../src/config/db");
  };

  describe("Development Environment (NODE_ENV=development)", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    test("resolves to DEV_MONGO_URI when configured", () => {
      process.env.DEV_MONGO_URI =
        "mongodb://devuser:devpass@devhost:27017/gdgsc_dev";
      process.env.PROD_MONGO_URI =
        "mongodb://produser:prodpass@prodhost:27017/gdgsc_prod";

      const { getMongoUri } = getDbHelper();
      const uri = getMongoUri();
      expect(uri).toBe("mongodb://devuser:devpass@devhost:27017/gdgsc_dev");
    });

    test("falls back safely to local development database if DEV_MONGO_URI is unset", () => {
      const { getMongoUri } = getDbHelper();
      const uri = getMongoUri();
      expect(uri).toBe("mongodb://127.0.0.1:27017/gdgsc_dev");
    });

    test("STRICT SAFETY: Never connects to PROD_MONGO_URI in development mode even if dev URI is unset", () => {
      process.env.PROD_MONGO_URI =
        "mongodb://produser:prodpass@prodhost:27017/gdgsc_prod";
      delete process.env.DEV_MONGO_URI;

      const { getMongoUri } = getDbHelper();
      const uri = getMongoUri();
      expect(uri).not.toBe(
        "mongodb://produser:prodpass@prodhost:27017/gdgsc_prod",
      );
      expect(uri).toBe("mongodb://127.0.0.1:27017/gdgsc_dev");
    });
  });

  describe("Production Environment (NODE_ENV=production)", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    test("resolves to PROD_MONGO_URI when configured", () => {
      process.env.DEV_MONGO_URI =
        "mongodb://devuser:devpass@devhost:27017/gdgsc_dev";
      process.env.PROD_MONGO_URI =
        "mongodb://produser:prodpass@prodhost:27017/gdgsc_prod";

      const { getMongoUri } = getDbHelper();
      const uri = getMongoUri();
      expect(uri).toBe("mongodb://produser:prodpass@prodhost:27017/gdgsc_prod");
    });

    test("resolves to host-injected MONGO_URI in production environment", () => {
      process.env.MONGO_URI =
        "mongodb+srv://render_prod:secret@cluster.mongodb.net/gdgsc";

      const { getMongoUri } = getDbHelper();
      const uri = getMongoUri();
      expect(uri).toBe(
        "mongodb+srv://render_prod:secret@cluster.mongodb.net/gdgsc",
      );
    });

    test("STRICT SAFETY: Throws fatal error on startup if production MongoDB URI is missing", () => {
      delete process.env.PROD_MONGO_URI;
      delete process.env.MONGO_URI;
      delete process.env.MONGODB_URI;
      process.env.DEV_MONGO_URI =
        "mongodb://devuser:devpass@devhost:27017/gdgsc_dev";

      const { getMongoUri } = getDbHelper();
      expect(() => getMongoUri()).toThrow(
        /FATAL: Production MongoDB URI is not configured/,
      );
    });

    test("STRICT SAFETY: Never falls back to local database in production", () => {
      delete process.env.PROD_MONGO_URI;
      delete process.env.MONGO_URI;

      const { getMongoUri } = getDbHelper();
      expect(() => getMongoUri()).toThrow();
    });
  });

  describe("Test Environment (NODE_ENV=test)", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "test";
    });

    test("resolves to TEST_MONGO_URI or test fallback", () => {
      process.env.TEST_MONGO_URI = "mongodb://testhost:27017/my_test_db";
      const { getMongoUri } = getDbHelper();
      expect(getMongoUri()).toBe("mongodb://testhost:27017/my_test_db");

      delete process.env.TEST_MONGO_URI;
      expect(getMongoUri()).toBe("mongodb://127.0.0.1:27017/gdgsc_test");
    });
  });
});
