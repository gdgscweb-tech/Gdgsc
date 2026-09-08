// backend/tests/assets.test.js

const AssetService = require("../src/services/assetService");
const Game = require("../src/models/Game");
const GameAsset = require("../src/models/GameAsset");

describe("AssetService Unit & Integration Tests", () => {
  let mockStorage;
  let assetService;

  const mockAdmin = {
    _id: "66d000000000000000000099",
    role: "admin",
    name: "Admin",
  };

  const mockUser = {
    _id: "66d000000000000000000088",
    role: "user",
    name: "Player",
  };

  const mockGame = {
    _id: "66d000000000000000000010",
    title: "Cyber Clash",
    slug: "cyber-clash",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorage = {
      createUploadUrl: jest
        .fn()
        .mockResolvedValue("https://r2.test/upload-presigned-url"),
      createDownloadUrl: jest
        .fn()
        .mockResolvedValue("https://r2.test/download-presigned-url"),
      objectExists: jest.fn().mockResolvedValue(true),
      getObjectMetadata: jest.fn().mockResolvedValue({
        contentLength: 52428800,
        contentType: "application/zip",
        etag: "abcd1234etag",
      }),
      deleteObject: jest.fn().mockResolvedValue(true),
      getPublicUrl: jest.fn(
        (params) => `https://cdn.example.com/${params.key}`,
      ),
    };

    assetService = new AssetService(mockStorage);
    jest.spyOn(assetService, "resolveGame").mockResolvedValue(mockGame);
  });

  describe("Upload Validations", () => {
    test("rejects disallowed MIME types", () => {
      expect(() => {
        assetService.validateUploadInput({
          type: "image",
          category: "banner",
          filename: "malicious.php",
          contentType: "application/x-php",
          size: 1024,
        });
      }).toThrow(/MIME type 'application\/x-php' is not allowed/);
    });

    test("rejects disallowed file extensions", () => {
      expect(() => {
        assetService.validateUploadInput({
          type: "image",
          category: "banner",
          filename: "banner.exe",
          contentType: "image/png",
          size: 1024,
        });
      }).toThrow(/File extension '\.exe' is not allowed/);
    });

    test("rejects files exceeding size limits", () => {
      const overLimit = 25 * 1024 * 1024; // 25 MB exceeds image 20MB limit
      expect(() => {
        assetService.validateUploadInput({
          type: "image",
          category: "banner",
          filename: "banner.png",
          contentType: "image/png",
          size: overLimit,
        });
      }).toThrow(/exceeds maximum allowed/);
    });

    test("rejects category and type mismatch", () => {
      expect(() => {
        assetService.validateUploadInput({
          type: "file",
          category: "screenshot", // screenshot must be image
          filename: "screenshot.png",
          contentType: "application/zip",
          size: 1024,
        });
      }).toThrow(/Category 'screenshot' expects asset type 'image'/);
    });
  });

  describe("createUploadUrl", () => {
    test("generates presigned upload URL and pending asset record", async () => {
      jest.spyOn(GameAsset, "findOne").mockResolvedValueOnce(null);
      jest.spyOn(GameAsset, "create").mockImplementationOnce(async (doc) => ({
        _id: "66d000000000000000000020",
        ...doc,
      }));

      const result = await assetService.createUploadUrl({
        gameId: "cyber-clash",
        filename: "game-build.zip",
        contentType: "application/zip",
        size: 50000000,
        type: "file",
        category: "build",
        version: "1.0.0",
        visibility: "private",
        user: mockAdmin,
      });

      expect(result.uploadUrl).toBe("https://r2.test/upload-presigned-url");
      expect(result.storageKey).toMatch(
        /^games\/cyber-clash\/files\/v1\.0\.0\/[a-f0-9]{8}-game-build\.zip$/,
      );
      expect(result.asset.status).toBe("pending");
      expect(result.asset.visibility).toBe("private");
      expect(mockStorage.createUploadUrl).toHaveBeenCalledTimes(1);
    });

    test("prevents overwriting an existing ready build version", async () => {
      jest.spyOn(GameAsset, "findOne").mockResolvedValueOnce({
        _id: "66d000000000000000000021",
        version: "v1.0.0",
        status: "ready",
      });

      await expect(
        assetService.createUploadUrl({
          gameId: "cyber-clash",
          filename: "game-v1.zip",
          contentType: "application/zip",
          size: 50000000,
          type: "file",
          category: "build",
          version: "1.0.0",
          user: mockAdmin,
        }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe("completeUpload", () => {
    test("verifies object exists in storage and marks ready", async () => {
      const mockAsset = {
        _id: "66d000000000000000000030",
        storageKey: "games/cyber-clash/files/v1.0.0/build.zip",
        status: "pending",
        fileSize: 0,
        checksum: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(GameAsset, "findById").mockResolvedValueOnce(mockAsset);

      const result = await assetService.completeUpload({
        assetId: "66d000000000000000000030",
        user: mockAdmin,
      });

      expect(mockStorage.objectExists).toHaveBeenCalledWith({
        key: mockAsset.storageKey,
      });
      expect(mockAsset.status).toBe("ready");
      expect(mockAsset.checksum).toBe("abcd1234etag");
      expect(mockAsset.fileSize).toBe(52428800);
      expect(mockAsset.save).toHaveBeenCalledTimes(1);
      expect(result.message).toContain("verified and ready");
    });

    test("marks asset failed and throws error when object missing in storage", async () => {
      const mockAsset = {
        _id: "66d000000000000000000031",
        storageKey: "games/cyber-clash/files/v1.0.0/missing.zip",
        status: "pending",
        save: jest.fn().mockResolvedValue(true),
      };

      mockStorage.objectExists.mockResolvedValueOnce(false);
      jest.spyOn(GameAsset, "findById").mockResolvedValueOnce(mockAsset);

      await expect(
        assetService.completeUpload({
          assetId: "66d000000000000000000031",
          user: mockAdmin,
        }),
      ).rejects.toThrow(/not found in storage/);

      expect(mockAsset.status).toBe("failed");
      expect(mockAsset.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("getDownloadUrl & Asset Access", () => {
    test("returns public CDN URL for public ready asset", async () => {
      const mockAsset = {
        _id: "66d000000000000000000040",
        storageKey: "games/cyber-clash/images/banner.webp",
        originalFilename: "banner.webp",
        status: "ready",
        visibility: "public",
        populate: jest.fn().mockResolvedValue({
          _id: "66d000000000000000000040",
          storageKey: "games/cyber-clash/images/banner.webp",
          originalFilename: "banner.webp",
          status: "ready",
          visibility: "public",
        }),
      };

      jest.spyOn(GameAsset, "findById").mockReturnValueOnce(mockAsset);

      const result = await assetService.getDownloadUrl({
        assetId: "66d000000000000000000040",
        user: null, // guest
        download: false,
      });

      expect(result.isPublic).toBe(true);
      expect(result.url).toBe(
        "https://cdn.example.com/games/cyber-clash/images/banner.webp",
      );
    });

    test("denies unauthenticated/non-admin user access to private asset", async () => {
      const mockAsset = {
        _id: "66d000000000000000000041",
        storageKey: "games/cyber-clash/files/v1.0.0/build.zip",
        status: "ready",
        visibility: "private",
        populate: jest.fn().mockResolvedValue({
          _id: "66d000000000000000000041",
          storageKey: "games/cyber-clash/files/v1.0.0/build.zip",
          status: "ready",
          visibility: "private",
        }),
      };

      jest.spyOn(GameAsset, "findById").mockReturnValueOnce(mockAsset);

      await expect(
        assetService.getDownloadUrl({
          assetId: "66d000000000000000000041",
          user: mockUser, // not admin
        }),
      ).rejects.toThrow(/not authorized to access this private asset/);
    });

    test("generates presigned download URL for authorized admin on private asset", async () => {
      const mockAsset = {
        _id: "66d000000000000000000042",
        storageKey: "games/cyber-clash/files/v1.0.0/build.zip",
        originalFilename: "build.zip",
        status: "ready",
        visibility: "private",
        populate: jest.fn().mockResolvedValue({
          _id: "66d000000000000000000042",
          storageKey: "games/cyber-clash/files/v1.0.0/build.zip",
          originalFilename: "build.zip",
          status: "ready",
          visibility: "private",
        }),
      };

      jest.spyOn(GameAsset, "findById").mockReturnValueOnce(mockAsset);

      const result = await assetService.getDownloadUrl({
        assetId: "66d000000000000000000042",
        user: mockAdmin,
        download: true,
      });

      expect(result.isPublic).toBe(false);
      expect(result.url).toBe("https://r2.test/download-presigned-url");
      expect(mockStorage.createDownloadUrl).toHaveBeenCalledTimes(1);
    });

    test("rejects download if asset is not in ready status", async () => {
      const mockAsset = {
        _id: "66d000000000000000000043",
        status: "pending",
        populate: jest.fn().mockResolvedValue({
          _id: "66d000000000000000000043",
          status: "pending",
        }),
      };

      jest.spyOn(GameAsset, "findById").mockReturnValueOnce(mockAsset);

      await expect(
        assetService.getDownloadUrl({
          assetId: "66d000000000000000000043",
          user: mockAdmin,
        }),
      ).rejects.toThrow(/Asset is not in ready status/);
    });
  });

  describe("deleteAsset", () => {
    test("deletes object from storage and removes database record", async () => {
      const mockAsset = {
        _id: "66d000000000000000000050",
        storageKey: "games/cyber-clash/files/v1.0.0/old-build.zip",
        originalFilename: "old-build.zip",
        deleteOne: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(GameAsset, "findById").mockResolvedValueOnce(mockAsset);

      const result = await assetService.deleteAsset({
        assetId: "66d000000000000000000050",
        user: mockAdmin,
      });

      expect(mockStorage.deleteObject).toHaveBeenCalledWith({
        key: mockAsset.storageKey,
      });
      expect(mockAsset.deleteOne).toHaveBeenCalledTimes(1);
      expect(result.message).toContain("deleted successfully");
    });
  });
});
