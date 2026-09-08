// backend/tests/multipart.test.js

const AssetService = require("../src/services/assetService");
const GameAsset = require("../src/models/GameAsset");

describe("Multipart Upload Lifecycle Unit Tests", () => {
  let mockStorage;
  let assetService;

  const mockAdmin = {
    _id: "66d000000000000000000099",
    role: "admin",
    name: "Admin",
  };

  const mockGame = {
    _id: "66d000000000000000000010",
    title: "Cyber Clash 2",
    slug: "cyber-clash-2",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorage = {
      createMultipartUpload: jest.fn().mockResolvedValue({
        uploadId: "test-multipart-upload-id-999",
        key: "games/cyber-clash-2/files/v1.0.0/biggame.zip",
      }),
      signPart: jest
        .fn()
        .mockResolvedValue("https://r2.test/part-presigned-url?partNumber=1"),
      completeMultipartUpload: jest.fn().mockResolvedValue({
        location:
          "https://r2.test/games/cyber-clash-2/files/v1.0.0/biggame.zip",
        etag: "combined-multipart-etag-1234",
        key: "games/cyber-clash-2/files/v1.0.0/biggame.zip",
      }),
      abortMultipartUpload: jest.fn().mockResolvedValue(true),
      getObjectMetadata: jest.fn().mockResolvedValue({
        contentLength: 524288000,
        contentType: "application/zip",
        etag: "combined-multipart-etag-1234",
      }),
    };

    assetService = new AssetService(mockStorage);
    jest.spyOn(assetService, "resolveGame").mockResolvedValue(mockGame);
  });

  test("startMultipartUpload initiates R2 multipart and creates uploading asset", async () => {
    jest.spyOn(GameAsset, "findOne").mockResolvedValueOnce(null);
    jest.spyOn(GameAsset, "create").mockImplementationOnce(async (doc) => ({
      _id: "66d000000000000000000060",
      ...doc,
    }));

    const result = await assetService.startMultipartUpload({
      gameId: "cyber-clash-2",
      filename: "biggame.zip",
      contentType: "application/zip",
      size: 524288000,
      type: "file",
      category: "build",
      version: "1.0.0",
      user: mockAdmin,
    });

    expect(result.uploadId).toBe("test-multipart-upload-id-999");
    expect(result.asset.status).toBe("uploading");
    expect(result.partSizeRecommendation).toBeGreaterThan(0);
    expect(mockStorage.createMultipartUpload).toHaveBeenCalledTimes(1);
  });

  test("signMultipartPart generates presigned PUT URL for valid part number", async () => {
    const mockAsset = {
      _id: "66d000000000000000000061",
      status: "uploading",
      uploadId: "test-multipart-upload-id-999",
      storageKey: "games/cyber-clash-2/files/v1.0.0/biggame.zip",
    };

    jest.spyOn(GameAsset, "findById").mockResolvedValueOnce(mockAsset);

    const result = await assetService.signMultipartPart({
      assetId: "66d000000000000000000061",
      partNumber: 1,
    });

    expect(result.partNumber).toBe(1);
    expect(result.presignedUrl).toBe(
      "https://r2.test/part-presigned-url?partNumber=1",
    );
    expect(mockStorage.signPart).toHaveBeenCalledWith({
      key: mockAsset.storageKey,
      uploadId: mockAsset.uploadId,
      partNumber: 1,
      expiresIn: expect.any(Number),
    });
  });

  test("signMultipartPart rejects invalid part numbers", async () => {
    const mockAsset = {
      _id: "66d000000000000000000062",
      status: "uploading",
      uploadId: "test-multipart-upload-id-999",
      storageKey: "games/cyber-clash-2/files/v1.0.0/biggame.zip",
    };

    jest.spyOn(GameAsset, "findById").mockResolvedValue(mockAsset);

    await expect(
      assetService.signMultipartPart({
        assetId: "66d000000000000000000062",
        partNumber: 0,
      }),
    ).rejects.toThrow(/partNumber must be between 1 and 10000/);

    await expect(
      assetService.signMultipartPart({
        assetId: "66d000000000000000000062",
        partNumber: 10001,
      }),
    ).rejects.toThrow(/partNumber must be between 1 and 10000/);
  });

  test("completeMultipartUpload completes multipart and marks asset ready", async () => {
    const mockAsset = {
      _id: "66d000000000000000000063",
      status: "uploading",
      uploadId: "test-multipart-upload-id-999",
      storageKey: "games/cyber-clash-2/files/v1.0.0/biggame.zip",
      parts: [],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(GameAsset, "findById").mockResolvedValueOnce(mockAsset);

    const parts = [
      { partNumber: 1, etag: '"etag-part-1"', size: 10485760 },
      { partNumber: 2, etag: '"etag-part-2"', size: 10485760 },
    ];

    const result = await assetService.completeMultipartUpload({
      assetId: "66d000000000000000000063",
      parts,
    });

    expect(mockStorage.completeMultipartUpload).toHaveBeenCalledWith({
      key: mockAsset.storageKey,
      uploadId: "test-multipart-upload-id-999",
      parts,
    });

    expect(mockAsset.status).toBe("ready");
    expect(mockAsset.checksum).toBe("combined-multipart-etag-1234");
    expect(mockAsset.parts).toHaveLength(2);
    expect(mockAsset.uploadId).toBeNull();
    expect(mockAsset.save).toHaveBeenCalledTimes(1);
    expect(result.message).toContain("completed successfully");
  });

  test("abortMultipartUpload aborts R2 multipart and sets status failed", async () => {
    const mockAsset = {
      _id: "66d000000000000000000064",
      status: "uploading",
      uploadId: "test-multipart-upload-id-999",
      storageKey: "games/cyber-clash-2/files/v1.0.0/biggame.zip",
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(GameAsset, "findById").mockResolvedValueOnce(mockAsset);

    const result = await assetService.abortMultipartUpload({
      assetId: "66d000000000000000000064",
    });

    expect(mockStorage.abortMultipartUpload).toHaveBeenCalledWith({
      key: mockAsset.storageKey,
      uploadId: "test-multipart-upload-id-999",
    });

    expect(mockAsset.status).toBe("failed");
    expect(mockAsset.uploadId).toBeNull();
    expect(mockAsset.save).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
