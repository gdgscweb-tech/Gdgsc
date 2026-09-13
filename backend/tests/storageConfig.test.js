const loadStorageConfig = () => {
  jest.resetModules();
  return require("../src/config/storageConfig");
};

describe("Storage Environment Separation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DEV_STORAGE_ROOT_FOLDER_ID;
    delete process.env.PROD_STORAGE_ROOT_FOLDER_ID;
    delete process.env.TEST_STORAGE_ROOT_FOLDER_ID;
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("development resolves only to the development root", () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_STORAGE_ROOT_FOLDER_ID = "development-root";
    process.env.PROD_STORAGE_ROOT_FOLDER_ID = "production-root";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "legacy-root";

    expect(loadStorageConfig().getStorageRootConfig()).toEqual({
      environment: "development",
      variable: "DEV_STORAGE_ROOT_FOLDER_ID",
      folderId: "development-root",
    });
  });

  test("production resolves only to the production root", () => {
    process.env.NODE_ENV = "production";
    process.env.PROD_STORAGE_ROOT_FOLDER_ID = "production-root";
    process.env.DEV_STORAGE_ROOT_FOLDER_ID = "development-root";

    expect(loadStorageConfig().getStorageRootConfig()).toEqual({
      environment: "production",
      variable: "PROD_STORAGE_ROOT_FOLDER_ID",
      folderId: "production-root",
    });
  });

  test("does not fall back to an implicit or legacy root", () => {
    process.env.NODE_ENV = "development";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "legacy-root";

    expect(() => loadStorageConfig().getStorageRootConfig()).toThrow(
      /DEV_STORAGE_ROOT_FOLDER_ID is required/,
    );
  });

  test("test environment has an explicit root variable", () => {
    process.env.NODE_ENV = "test";
    process.env.TEST_STORAGE_ROOT_FOLDER_ID = "test-root";

    expect(loadStorageConfig().getStorageRootConfig().folderId).toBe("test-root");
  });
});
