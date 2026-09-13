const fs = require("fs");
const path = require("path");

describe("Database Environment Separation Unit Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.PROD_MONGO_URI;
    delete process.env.DEV_MONGO_URI;
    delete process.env.MONGO_URI;
    delete process.env.MONGODB_URI;
    delete process.env.TEST_MONGO_URI;
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const getDbHelper = () => require("../src/config/db");
  const teamUri =
    "mongodb+srv://teamuser:secret@team-cluster.mongodb.net/gdgsc_prod?retryWrites=true";

  test("development explicitly resolves to dev", () => {
    process.env.NODE_ENV = "development";
    process.env.PROD_MONGO_URI = teamUri;
    process.env.DEV_MONGO_URI =
      "mongodb://old-user:secret@personal-cluster:27017/personal";
    process.env.MONGO_URI =
      "mongodb://old-user:secret@personal-cluster:27017/test";

    const config = getDbHelper().getMongoConfig();

    expect(config).toMatchObject({
      environment: "development",
      databaseName: "dev",
      sourceVariable: "PROD_MONGO_URI",
    });
    expect(config.uri).toBe(
      "mongodb+srv://teamuser:secret@team-cluster.mongodb.net/dev?retryWrites=true",
    );
  });

  test("production explicitly resolves to test", () => {
    process.env.NODE_ENV = "production";
    process.env.PROD_MONGO_URI = teamUri;

    const config = getDbHelper().getMongoConfig();

    expect(config).toMatchObject({
      environment: "production",
      databaseName: "test",
      sourceVariable: "PROD_MONGO_URI",
    });
    expect(config.uri).toBe(
      "mongodb+srv://teamuser:secret@team-cluster.mongodb.net/test?retryWrites=true",
    );
  });

  test("never relies on an implicit database or selects gdgsc_prod", () => {
    process.env.NODE_ENV = "development";
    process.env.PROD_MONGO_URI = teamUri;

    const development = getDbHelper().getMongoConfig();
    expect(development.uri).toContain("/dev?");
    expect(development.uri).not.toContain("gdgsc_prod");

    process.env.NODE_ENV = "production";
    const production = getDbHelper().getMongoConfig();
    expect(production.uri).toContain("/test?");
    expect(production.uri).not.toContain("gdgsc_prod");
  });

  test("does not fall back to stale generic or development URI variables", () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_MONGO_URI =
      "mongodb://old-user:secret@personal-cluster:27017/personal";
    process.env.MONGO_URI =
      "mongodb://old-user:secret@personal-cluster:27017/test";

    expect(() => getDbHelper().getMongoConfig()).toThrow(
      /PROD_MONGO_URI is required/,
    );
  });

  test("does not fall back to generic MONGO_URI in production", () => {
    process.env.NODE_ENV = "production";
    process.env.MONGO_URI =
      "mongodb://old-user:secret@personal-cluster:27017/gdgsc_prod";

    expect(() => getDbHelper().getMongoConfig()).toThrow(
      /PROD_MONGO_URI is required/,
    );
  });

  test("test environment also selects an explicit database", () => {
    process.env.NODE_ENV = "test";
    process.env.TEST_MONGO_URI =
      "mongodb://testuser:secret@testhost:27017/implicit";

    const config = getDbHelper().getMongoConfig();

    expect(config.databaseName).toBe("gdgsc_test");
    expect(config.uri).toBe(
      "mongodb://testuser:secret@testhost:27017/gdgsc_test",
    );
  });

  test("seed.js and loadGames.js use the shared resolver", () => {
    const seed = fs.readFileSync(path.join(__dirname, "..", "seed.js"), "utf8");
    const loadGames = fs.readFileSync(
      path.join(__dirname, "..", "src", "utils", "loadGames.js"),
      "utf8",
    );

    expect(seed).toContain('require("./src/config/db")');
    expect(seed).toContain("mongoose.connect(getMongoUri())");
    expect(loadGames).toContain('require("../config/db")');
    expect(loadGames).toContain("mongoose.connect(getMongoUri())");
    expect(seed).not.toContain("mongoose.connect(process.env.MONGO_URI)");
    expect(loadGames).not.toContain("mongoose.connect(process.env.MONGO_URI)");
  });
});
