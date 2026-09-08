// backend/tests/googleDriveStorage.test.js

const GoogleDriveStorageService = require("../src/services/storage/GoogleDriveStorageService");
const { getStorageService } = require("../src/services/storage/storageFactory");
const R2StorageService = require("../src/services/storage/R2StorageService");

describe("GoogleDriveStorageService Unit Tests", () => {
  let storageService;

  beforeEach(() => {
    storageService = new GoogleDriveStorageService({
      folderId: "test_folder_123",
      publicUrl: "https://drive.google.com",
    });
  });

  describe("File ID Extraction & Sanitization", () => {
    test("extracts raw Google Drive file ID correctly", () => {
      const id = "1BxiMVs0XRA5nFMdKvBHKVNbdB20Dp5W_e";
      expect(storageService.extractFileId(id)).toBe(id);
    });

    test("extracts ID with gdrive: prefix", () => {
      const id = "1BxiMVs0XRA5nFMdKvBHKVNbdB20Dp5W_e";
      expect(storageService.extractFileId(`gdrive:${id}`)).toBe(id);
    });

    test("falls back safely for composite storage keys", () => {
      const key = "games/cyber-racer/files/v1.0.0/build.zip";
      expect(storageService.extractFileId(key)).toBe(key);
    });

    test("handles null or undefined safely", () => {
      expect(storageService.extractFileId(null)).toBeNull();
      expect(storageService.extractFileId("")).toBeNull();
    });
  });

  describe("getPublicUrl", () => {
    test("returns high-speed Google CDN link for image files", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBHKVNbdB20Dp5W_e";
      const pngUrl = storageService.getPublicUrl({ key: `${fileId}.png` });
      expect(pngUrl).toBe(`https://lh3.googleusercontent.com/d/${fileId}.png`);

      const webpUrl = storageService.getPublicUrl({ key: `images/banner.webp` });
      expect(webpUrl).toBe(`https://lh3.googleusercontent.com/d/images%2Fbanner.webp`);
    });

    test("returns direct Google Drive download link for game builds and other binaries", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBHKVNbdB20Dp5W_e";
      const zipUrl = storageService.getPublicUrl({ key: `${fileId}.zip` });
      expect(zipUrl).toBe(`https://drive.google.com/uc?export=download&id=${fileId}.zip`);

      const rarUrl = storageService.getPublicUrl({ key: "game.rar" });
      expect(rarUrl).toBe(`https://drive.google.com/uc?export=download&id=game.rar`);
    });

    test("returns null when key is missing", () => {
      expect(storageService.getPublicUrl({})).toBeNull();
      expect(storageService.getPublicUrl({ key: "" })).toBeNull();
    });
  });

  describe("createUploadUrl", () => {
    test("generates Google Drive resumable upload URL", async () => {
      const uploadUrl = await storageService.createUploadUrl({
        key: "games/cyber-racer/images/cover.webp",
        contentType: "image/webp",
        size: 2048,
      });

      expect(uploadUrl).toContain("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable");
      expect(uploadUrl).toContain("upload_id=");
    });

    test("throws error if key or contentType is missing", async () => {
      await expect(
        storageService.createUploadUrl({ contentType: "image/webp" }),
      ).rejects.toThrow("Object key is required");

      await expect(
        storageService.createUploadUrl({ key: "games/test.zip" }),
      ).rejects.toThrow("Content-Type is required");
    });
  });

  describe("Multipart / Resumable Chunked Upload", () => {
    test("creates multipart upload session", async () => {
      const res = await storageService.createMultipartUpload({
        key: "games/cyber-racer/files/v1.0.0/game.zip",
        contentType: "application/zip",
      });

      expect(res).toHaveProperty("uploadId");
      expect(res.key).toBe("games/cyber-racer/files/v1.0.0/game.zip");
      expect(res.uploadUrl).toContain("uploadType=resumable");
    });

    test("signs individual part upload URLs", async () => {
      const upload = await storageService.createMultipartUpload({
        key: "games/cyber-racer/files/v1.0.0/game.zip",
        contentType: "application/zip",
      });

      const partUrl = await storageService.signPart({
        key: upload.key,
        uploadId: upload.uploadId,
        partNumber: 1,
      });

      expect(partUrl).toContain("uploadType=resumable");
      expect(partUrl).toContain("partNumber=1");
    });

    test("validates partNumber properly", async () => {
      await expect(
        storageService.signPart({
          key: "test.zip",
          uploadId: "mock-id",
          partNumber: 0,
        }),
      ).rejects.toThrow("Valid partNumber is required");
    });

    test("completes multipart upload", async () => {
      const res = await storageService.completeMultipartUpload({
        key: "games/cyber-racer/files/v1.0.0/game.zip",
        uploadId: "mock-upload-id",
        parts: [{ partNumber: 1, etag: "etag123" }],
      });

      expect(res.key).toBe("games/cyber-racer/files/v1.0.0/game.zip");
      expect(res).toHaveProperty("etag");
      expect(res).toHaveProperty("location");
    });

    test("aborts multipart upload", async () => {
      const aborted = await storageService.abortMultipartUpload({
        key: "games/cyber-racer/files/v1.0.0/game.zip",
        uploadId: "mock-upload-id",
      });
      expect(aborted).toBe(true);
    });
  });

  describe("Download, Metadata, and Object Operations", () => {
    test("creates direct download URL", async () => {
      const downloadUrl = await storageService.createDownloadUrl({
        key: "1BxiMVs0XRA5nFMdKvBHKVNbdB20Dp5W_e",
      });
      expect(downloadUrl).toBe("https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBHKVNbdB20Dp5W_e");
    });

    test("objectExists returns true for tracked/created object", async () => {
      const key = "games/racer/cover.png";
      await storageService.createUploadUrl({
        key,
        contentType: "image/png",
        size: 5000,
      });

      const exists = await storageService.objectExists({ key });
      expect(exists).toBe(true);
    });

    test("getObjectMetadata returns normalized metadata", async () => {
      const key = "games/racer/cover.png";
      await storageService.createUploadUrl({
        key,
        contentType: "image/png",
        size: 5000,
      });

      const meta = await storageService.getObjectMetadata({ key });
      expect(meta.contentLength).toBe(5000);
      expect(meta.contentType).toBe("image/png");
      expect(meta).toHaveProperty("etag");
      expect(meta).toHaveProperty("lastModified");
    });

    test("deleteObject removes object", async () => {
      const key = "games/racer/cover.png";
      await storageService.createUploadUrl({
        key,
        contentType: "image/png",
      });

      const deleted = await storageService.deleteObject({ key });
      expect(deleted).toBe(true);

      const exists = await storageService.objectExists({ key });
      expect(exists).toBe(false);
    });
  });

  describe("Storage Factory", () => {
    test("returns GoogleDriveStorageService by default or when google_drive is specified", () => {
      const service = getStorageService("google_drive");
      expect(service).toBeInstanceOf(GoogleDriveStorageService);

      const defaultService = getStorageService();
      expect(defaultService).toBeInstanceOf(GoogleDriveStorageService);
    });

    test("returns R2StorageService when r2 is specified", () => {
      const service = getStorageService("r2");
      expect(service).toBeInstanceOf(R2StorageService);
    });
  });
});

