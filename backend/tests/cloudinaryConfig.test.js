describe("Cloudinary environment separation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("uses an environment-specific event folder", () => {
    process.env.NODE_ENV = "development";
    const development = require("../src/config/cloudinary");
    expect(development.getEventStorageFolder()).toBe("event-images/development");

    process.env.NODE_ENV = "production";
    expect(development.getEventStorageFolder()).toBe("event-images/production");
  });
});
