// backend/src/services/assetService.js

const path = require("path");
const Game = require("../models/Game");
const GameAsset = require("../models/GameAsset");
const storageConfig = require("../config/storageConfig");
const {
  generateStorageKey,
  sanitizeFilename,
  sanitizeVersion,
} = require("../utils/storageKey");
const { ApiError } = require("../utils/apiResponse");
const { getDefaultStorageService } = require("./storage/storageFactory");

class AssetService {
  /**
   * @param {import('./storage/IStorageService')} [storageService]
   */
  constructor(storageService) {
    this.storage = storageService || getDefaultStorageService();
  }

  /**
   * Validates upload input parameters (MIME type, size, extension, category-type matching).
   */
  validateUploadInput({
    type,
    category,
    filename,
    contentType,
    size,
    version,
  }) {
    if (!filename) {
      throw new ApiError(400, "VALIDATION_ERROR", "filename is required");
    }

    if (!type || !storageConfig.types.includes(type)) {
      throw new ApiError(
        400,
        "INVALID_ASSET_TYPE",
        `type must be one of: ${storageConfig.types.join(", ")}`,
      );
    }

    if (!category || !storageConfig.categories.includes(category)) {
      throw new ApiError(
        400,
        "INVALID_ASSET_CATEGORY",
        `category must be one of: ${storageConfig.categories.join(", ")}`,
      );
    }

    // Validate category matches expected asset type
    const expectedType = storageConfig.categoryTypeMapping[category];
    if (expectedType && expectedType !== type) {
      throw new ApiError(
        400,
        "CATEGORY_TYPE_MISMATCH",
        `Category '${category}' expects asset type '${expectedType}', but received '${type}'`,
      );
    }

    // Validate MIME type
    const cleanContentType = (contentType || "").toLowerCase().trim();
    const allowedMimes = storageConfig.allowedMimeTypes[type] || [];
    if (!cleanContentType || !allowedMimes.includes(cleanContentType)) {
      throw new ApiError(
        400,
        "INVALID_MIME_TYPE",
        `MIME type '${contentType}' is not allowed for type '${type}'. Allowed: ${allowedMimes.join(", ")}`,
      );
    }

    // Validate extension
    const ext = path.extname(filename).toLowerCase();
    const allowedExts = storageConfig.allowedExtensions[type] || [];
    if (!ext || !allowedExts.includes(ext)) {
      throw new ApiError(
        400,
        "INVALID_FILE_EXTENSION",
        `File extension '${ext}' is not allowed for type '${type}'. Allowed: ${allowedExts.join(", ")}`,
      );
    }

    // Validate size
    const maxSize = storageConfig.limits[type] || storageConfig.limits.file;
    const fileSize = parseInt(size, 10);
    if (fileSize && fileSize > maxSize) {
      throw new ApiError(
        400,
        "FILE_TOO_LARGE",
        `File size ${fileSize} bytes exceeds maximum allowed ${maxSize} bytes for type '${type}'`,
      );
    }
  }

  /**
   * Resolves game by ID or slug
   */
  async resolveGame(gameIdentifier) {
    let game = null;
    if (
      typeof gameIdentifier === "string" &&
      gameIdentifier.match(/^[0-9a-fA-F]{24}$/)
    ) {
      game = await Game.findById(gameIdentifier);
    }
    if (!game) {
      game = await Game.findOne({ slug: gameIdentifier });
    }
    if (!game) {
      throw new ApiError(
        404,
        "GAME_NOT_FOUND",
        `Game '${gameIdentifier}' not found`,
      );
    }
    return game;
  }

  /**
   * Creates a single presigned upload URL for direct client -> R2 upload.
   */
  async createUploadUrl({
    gameId,
    filename,
    contentType,
    size,
    type,
    category,
    version,
    visibility,
    user,
  }) {
    const game = await this.resolveGame(gameId);

    // Validate payload
    this.validateUploadInput({
      type,
      category,
      filename,
      contentType,
      size,
      version,
    });

    // Version handling: game builds must avoid accidental overwrites
    let normalizedVersion = null;
    if (type === "file" || category === "build") {
      normalizedVersion = sanitizeVersion(version);
      const existingBuild = await GameAsset.findOne({
        game: game._id,
        category: "build",
        version: normalizedVersion,
        status: "ready",
      });

      if (existingBuild) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          `A build asset for game '${game.title}' with version '${normalizedVersion}' already exists. Please use a new version.`,
        );
      }
    }

    // Determine visibility: builds default to private, images/videos/trailers default to public
    const resolvedVisibility =
      visibility || (category === "build" ? "private" : "public");

    // Generate safe unique storage key
    const storageKey = generateStorageKey({
      gameId: game.slug || game._id.toString(),
      type,
      category,
      filename,
      version: normalizedVersion,
    });

    // Generate presigned PUT URL
    const expiresIn = storageConfig.presignedExpiry.upload;
    const uploadUrl = await this.storage.createUploadUrl({
      key: storageKey,
      contentType,
      size: size ? parseInt(size, 10) : undefined,
      expiresIn,
    });

    // Create GameAsset record in pending status
    const asset = await GameAsset.create({
      game: game._id,
      type,
      category,
      originalFilename: filename,
      storageKey,
      mimeType: contentType,
      fileSize: size ? parseInt(size, 10) : 0,
      version: normalizedVersion,
      status: "pending",
      visibility: resolvedVisibility,
      uploadedBy: user ? user._id : null,
    });

    return {
      assetId: asset._id.toString(),
      uploadUrl,
      storageKey,
      expiresIn,
      asset,
    };
  }

  /**
   * Verifies that the client finished uploading to R2 and marks the asset ready.
   */
  async completeUpload({ assetId, user }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(
        404,
        "ASSET_NOT_FOUND",
        `Asset '${assetId}' not found`,
      );
    }

    if (asset.status === "ready") {
      return { asset, message: "Asset is already marked as ready" };
    }

    // Verify object exists in Cloudflare R2
    const exists = await this.storage.objectExists({ key: asset.storageKey });
    if (!exists) {
      asset.status = "failed";
      await asset.save();
      throw new ApiError(
        400,
        "UPLOAD_VERIFICATION_FAILED",
        `Object with key '${asset.storageKey}' was not found in storage. Ensure client upload completed successfully.`,
      );
    }

    // Fetch verified metadata from storage
    try {
      const meta = await this.storage.getObjectMetadata({
        key: asset.storageKey,
      });
      asset.fileSize = meta.contentLength || asset.fileSize;
      asset.checksum = meta.etag || asset.checksum;
      asset.mimeType = meta.contentType || asset.mimeType;
    } catch (err) {
      console.warn(
        `Could not read metadata for '${asset.storageKey}':`,
        err.message,
      );
    }

    asset.status = "ready";
    await asset.save();

    return { asset, message: "Asset upload verified and ready" };
  }

  /**
   * Initiates a multipart upload for large files.
   */
  async startMultipartUpload({
    gameId,
    filename,
    contentType,
    size,
    type,
    category,
    version,
    visibility,
    user,
  }) {
    const game = await this.resolveGame(gameId);

    // Validate payload
    this.validateUploadInput({
      type,
      category,
      filename,
      contentType,
      size,
      version,
    });

    let normalizedVersion = null;
    if (type === "file" || category === "build") {
      normalizedVersion = sanitizeVersion(version);
      const existingBuild = await GameAsset.findOne({
        game: game._id,
        category: "build",
        version: normalizedVersion,
        status: "ready",
      });

      if (existingBuild) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          `A build asset for game '${game.title}' with version '${normalizedVersion}' already exists.`,
        );
      }
    }

    const resolvedVisibility =
      visibility || (category === "build" ? "private" : "public");

    const storageKey = generateStorageKey({
      gameId: game.slug || game._id.toString(),
      type,
      category,
      filename,
      version: normalizedVersion,
    });

    // Start multipart upload in R2
    const { uploadId } = await this.storage.createMultipartUpload({
      key: storageKey,
      contentType,
      metadata: {
        originalFilename: filename,
        gameId: game._id.toString(),
        category,
      },
    });

    // Create asset record in uploading status
    const asset = await GameAsset.create({
      game: game._id,
      type,
      category,
      originalFilename: filename,
      storageKey,
      mimeType: contentType,
      fileSize: size ? parseInt(size, 10) : 0,
      version: normalizedVersion,
      status: "uploading",
      visibility: resolvedVisibility,
      uploadId,
      uploadedBy: user ? user._id : null,
    });

    return {
      assetId: asset._id.toString(),
      uploadId,
      storageKey,
      partSizeRecommendation: storageConfig.multipart.defaultPartSizeBytes,
      asset,
    };
  }

  /**
   * Generates a presigned PUT URL for a single part in a multipart upload.
   */
  async signMultipartPart({ assetId, partNumber }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(
        404,
        "ASSET_NOT_FOUND",
        `Asset '${assetId}' not found`,
      );
    }

    if (asset.status !== "uploading" || !asset.uploadId) {
      throw new ApiError(
        400,
        "INVALID_ASSET_STATE",
        `Asset is not in 'uploading' status or lacks a valid uploadId`,
      );
    }

    const partNum = parseInt(partNumber, 10);
    if (!partNum || partNum < 1 || partNum > 10000) {
      throw new ApiError(
        400,
        "INVALID_PART_NUMBER",
        "partNumber must be between 1 and 10000",
      );
    }

    const presignedUrl = await this.storage.signPart({
      key: asset.storageKey,
      uploadId: asset.uploadId,
      partNumber: partNum,
      expiresIn: storageConfig.presignedExpiry.upload,
    });

    return {
      assetId: asset._id.toString(),
      partNumber: partNum,
      presignedUrl,
      expiresIn: storageConfig.presignedExpiry.upload,
    };
  }

  /**
   * Completes a multipart upload on R2.
   */
  async completeMultipartUpload({ assetId, parts }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(
        404,
        "ASSET_NOT_FOUND",
        `Asset '${assetId}' not found`,
      );
    }

    if (asset.status !== "uploading" || !asset.uploadId) {
      throw new ApiError(
        400,
        "INVALID_ASSET_STATE",
        `Asset is not in 'uploading' status`,
      );
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      throw new ApiError(
        400,
        "INVALID_PARTS",
        "parts array of { partNumber, etag } is required",
      );
    }

    // Complete multipart in R2
    const result = await this.storage.completeMultipartUpload({
      key: asset.storageKey,
      uploadId: asset.uploadId,
      parts,
    });

    // Store parts info, checksum and mark ready
    asset.parts = parts.map((p) => ({
      partNumber: p.partNumber,
      etag: p.etag ? p.etag.replace(/"/g, "") : "",
      size: p.size || 0,
    }));
    asset.checksum = result.etag || asset.checksum;
    asset.status = "ready";
    asset.uploadId = null; // Clear active upload ID

    // Update verified size
    try {
      const meta = await this.storage.getObjectMetadata({
        key: asset.storageKey,
      });
      asset.fileSize = meta.contentLength || asset.fileSize;
    } catch (err) {
      // Keep existing size
    }

    await asset.save();

    return {
      asset,
      message: "Multipart upload completed successfully",
    };
  }

  /**
   * Aborts an active multipart upload and marks the asset as failed.
   */
  async abortMultipartUpload({ assetId }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(
        404,
        "ASSET_NOT_FOUND",
        `Asset '${assetId}' not found`,
      );
    }

    if (asset.uploadId) {
      try {
        await this.storage.abortMultipartUpload({
          key: asset.storageKey,
          uploadId: asset.uploadId,
        });
      } catch (err) {
        console.warn(
          `Failed to abort multipart in R2 for key '${asset.storageKey}':`,
          err.message,
        );
      }
    }

    asset.status = "failed";
    asset.uploadId = null;
    await asset.save();

    return { success: true, message: "Multipart upload aborted" };
  }

  /**
   * Retrieves download or public viewing URL for an asset.
   */
  async getDownloadUrl({ assetId, user, download = false }) {
    const asset = await GameAsset.findById(assetId).populate("game");
    if (!asset || asset.status === "deleted") {
      throw new ApiError(
        404,
        "ASSET_NOT_FOUND",
        `Asset '${assetId}' not found`,
      );
    }

    if (asset.status !== "ready") {
      throw new ApiError(
        400,
        "ASSET_NOT_READY",
        `Asset is not in ready status (current status: ${asset.status})`,
      );
    }

    // Authorization check for private assets
    if (asset.visibility === "private") {
      // Check if user is authenticated admin or authorized
      const isAdmin = user && user.role === "admin";
      if (!isAdmin) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "You are not authorized to access this private asset",
        );
      }
    }

    // For public assets with a configured public CDN/R2 URL, return public URL directly
    const publicUrl = this.storage.getPublicUrl({ key: asset.storageKey });
    if (asset.visibility === "public" && publicUrl && !download) {
      return {
        url: publicUrl,
        expiresIn: null,
        isPublic: true,
        storageKey: asset.storageKey,
        filename: asset.originalFilename,
      };
    }

    // Generate presigned GET download URL
    const contentDisposition = download
      ? `attachment; filename="${encodeURIComponent(asset.originalFilename)}"`
      : undefined;

    const expiresIn = storageConfig.presignedExpiry.download;
    const presignedUrl = await this.storage.createDownloadUrl({
      key: asset.storageKey,
      expiresIn,
      responseContentDisposition: contentDisposition,
    });

    return {
      url: presignedUrl,
      expiresIn,
      isPublic: false,
      storageKey: asset.storageKey,
      filename: asset.originalFilename,
    };
  }

  /**
   * Lists assets for a game with visibility filtering.
   */
  async getGameAssets({ gameId, type, category, version, status, user }) {
    const game = await this.resolveGame(gameId);

    const filter = { game: game._id };

    const isAdmin = user && user.role === "admin";

    // Non-admins can only see ready and public assets
    if (!isAdmin) {
      filter.status = "ready";
      filter.visibility = "public";
    } else if (status) {
      filter.status = status;
    }

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (version) filter.version = sanitizeVersion(version);

    const assets = await GameAsset.find(filter).sort({ createdAt: -1 });

    return {
      game: {
        id: game._id,
        title: game.title,
        slug: game.slug,
      },
      assets,
      total: assets.length,
    };
  }

  /**
   * Deletes an asset from storage and marks/removes it from database.
   */
  async deleteAsset({ assetId, user }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(
        404,
        "ASSET_NOT_FOUND",
        `Asset '${assetId}' not found`,
      );
    }

    // Delete from R2 object storage
    try {
      await this.storage.deleteObject({ key: asset.storageKey });
    } catch (err) {
      console.error(
        `Failed to delete object '${asset.storageKey}' from storage:`,
        err.message,
      );
    }

    await asset.deleteOne();

    return {
      message: `Asset '${asset.originalFilename}' (${asset.storageKey}) deleted successfully`,
    };
  }
}

module.exports = AssetService;
