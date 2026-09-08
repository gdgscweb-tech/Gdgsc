// backend/tests/storage.test.js

const {
  sanitizeFilename,
  sanitizeVersion,
  generateStorageKey,
} = require("../src/utils/storageKey");
const R2StorageService = require("../src/services/storage/R2StorageService");

describe("Storage Key & Sanitization Utilities", () => {
  describe("sanitizeFilename", () => {
    test("strips path traversal and special characters", () => {
      expect(sanitizeFilename("../../../etc/passwd")).toBe("passwd");
      expect(sanitizeFilename("..\\..\\Windows\\System32\\cmd.exe")).toBe(
        "cmd.exe",
      );
      expect(sanitizeFilename("my cool game build!! #1 (final).zip")).toBe(
        "my-cool-game-build-1-final.zip",
      );
      expect(sanitizeFilename("null\0byte.png")).toBe("nullbyte.png");
    });

    test("preserves valid extensions in lowercase", () => {
      expect(sanitizeFilename("GAME_V1.RAR")).toBe("game-v1.rar");
      expect(sanitizeFilename("Cover.IMAGE.WEBP")).toBe("cover-image.webp");
    });

    test("handles empty or non-string inputs safely", () => {
      expect(sanitizeFilename("")).toBe("file.bin");
      expect(sanitizeFilename(null)).toBe("file.bin");
      expect(sanitizeFilename(undefined)).toBe("file.bin");
    });
  });

  describe("sanitizeVersion", () => {
    test('normalizes semantic versions with leading "v"', () => {
      expect(sanitizeVersion("1.0.0")).toBe("v1.0.0");
      expect(sanitizeVersion("v2.1.3")).toBe("v2.1.3");
      expect(sanitizeVersion("V3.0.0-beta")).toBe("v3.0.0-beta");
    });

    test("strips unsafe characters from versions", () => {
      expect(sanitizeVersion("../1.0.0")).toBe("v1.0.0");
      expect(sanitizeVersion("")).toBe("v1.0.0");
    });
  });

  describe("generateStorageKey", () => {
    test("generates expected structure for game build files", () => {
      const key = generateStorageKey({
        gameId: "cyber-racer",
        type: "file",
        category: "build",
        filename: "game.zip",
        version: "1.0.0",
        includeUniquePrefix: false,
      });
      expect(key).toBe("games/cyber-racer/files/v1.0.0/game.zip");
    });

    test("generates expected structure for images", () => {
      const key = generateStorageKey({
        gameId: "cyber-racer",
        type: "image",
        category: "banner",
        filename: "banner.webp",
        includeUniquePrefix: false,
      });
      expect(key).toBe("games/cyber-racer/images/banner.webp");
    });

    test("generates expected structure for videos", () => {
      const key = generateStorageKey({
        gameId: "cyber-racer",
        type: "video",
        category: "trailer",
        filename: "trailer.mp4",
        includeUniquePrefix: false,
      });
      expect(key).toBe("games/cyber-racer/videos/trailer.mp4");
    });

    test("generates expected structure for generic assets", () => {
      const key = generateStorageKey({
        gameId: "cyber-racer",
        type: "asset",
        category: "asset",
        filename: "config.json",
        includeUniquePrefix: false,
      });
      expect(key).toBe("games/cyber-racer/assets/config.json");
    });

    test("includes unique collision-resistant prefix by default", () => {
      const key = generateStorageKey({
        gameId: "cyber-racer",
        type: "image",
        category: "thumbnail",
        filename: "thumb.png",
        includeUniquePrefix: true,
      });
      expect(key).toMatch(
        /^games\/cyber-racer\/images\/[a-f0-9]{8}-thumb\.png$/,
      );
    });
  });
});

describe("R2StorageService Unit Tests", () => {
  let mockS3Client;
  let storageService;

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn(),
    };
    storageService = new R2StorageService({
      client: mockS3Client,
      bucket: "test-bucket",
      publicUrl: "https://cdn.example.com",
    });
  });

  test("getPublicUrl returns correct CDN path", () => {
    const url = storageService.getPublicUrl({
      key: "games/123/images/banner.webp",
    });
    expect(url).toBe("https://cdn.example.com/games/123/images/banner.webp");
  });

  test("objectExists returns true when HeadObject succeeds", async () => {
    mockS3Client.send.mockResolvedValueOnce({});
    const exists = await storageService.objectExists({
      key: "games/123/banner.webp",
    });
    expect(exists).toBe(true);
  });

  test("objectExists returns false when HeadObject returns 404", async () => {
    const notFoundError = new Error("NotFound");
    notFoundError.name = "NotFound";
    mockS3Client.send.mockRejectedValueOnce(notFoundError);

    const exists = await storageService.objectExists({
      key: "games/123/missing.webp",
    });
    expect(exists).toBe(false);
  });

  test("getObjectMetadata returns normalized metadata", async () => {
    mockS3Client.send.mockResolvedValueOnce({
      ContentLength: 1048576,
      ContentType: "application/zip",
      ETag: '"d41d8cd98f00b204e9800998ecf8427e"',
      LastModified: new Date("2026-01-01"),
    });

    const meta = await storageService.getObjectMetadata({
      key: "games/123/game.zip",
    });
    expect(meta.contentLength).toBe(1048576);
    expect(meta.contentType).toBe("application/zip");
    expect(meta.etag).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  test("deleteObject sends DeleteObjectCommand", async () => {
    mockS3Client.send.mockResolvedValueOnce({});
    const result = await storageService.deleteObject({
      key: "games/123/game.zip",
    });
    expect(result).toBe(true);
    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
  });
});
