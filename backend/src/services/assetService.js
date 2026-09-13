// backend/src/services/assetService.js

const path = require("path");
const fs = require("fs/promises");
const gameService = require('./gameService');
const jwt = require('jsonwebtoken');
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

  // ─── Utility ──────────────────────────────────────────────────────────────

  assetContentUrl(assetId) {
    return `/api/assets/${assetId}/content`;
  }

  // ─── Game reference sync ──────────────────────────────────────────────────

  /**
   * After an asset is marked ready, update the parent Game's reference fields
   * (image, banner, screenshots[], videos[]) so the public page always reflects
   * the current asset state.
   */
  async syncGameReference(asset) {
    if (!asset?.game || !asset.category || asset.status !== "ready") return;
    const publicUrl = this.assetContentUrl(asset._id);
    asset.metadata = { ...asset.metadata, publicUrl, role: asset.category };
    await asset.save();
    await gameService.mutate(String(asset.game), async game => {
      await this.applyGameReference(game, asset);
    }, this.storage, async () => {
      if (asset.metadata?.replacesAssetId) {
        try {
          await GameAsset.updateOne({ _id: asset.metadata.replacesAssetId, game: asset.game },
            { $set: { status: 'deleted', 'metadata.replacedBy': String(asset._id) } });
        } catch (error) { console.warn('Replacement succeeded; old asset archival needs retry:', error.message); }
      }
    });
  }

  async applyGameReference(game, asset) {
    const publicUrl = this.assetContentUrl(asset._id);
  const replaceId = asset.metadata?.replacesAssetId;
  const old = replaceId ? await GameAsset.findById(replaceId) : null;
  if (replaceId && (!old || String(old.game) !== String(game._id) || old.category !== asset.category)) {
    throw new ApiError(400, 'INVALID_REPLACEMENT', 'Replacement must belong to the same game and category');
  }
  if (asset.category === 'thumbnail') game.image = publicUrl;
  else if (asset.category === 'banner') game.banner = publicUrl;
  else if (asset.category === 'build') {
    game.gameLink = publicUrl + '?download=true'; game.gameFile = asset.originalFilename;
  } else if (['screenshot','trailer'].includes(asset.category)) {
    const field = asset.category === 'screenshot' ? 'screenshots' : 'videos';
    const values = [...(game[field] || [])];
    const index = old ? values.indexOf(this.assetContentUrl(old._id)) : -1;
    if (old && index < 0) throw new ApiError(409, 'STALE_REPLACEMENT', 'The replaced item is no longer in the gallery');
    if (index >= 0) values[index] = publicUrl;
    else if (!values.includes(publicUrl)) values.push(publicUrl);
    game[field] = values;
  }
  }

  async removeGameReference(asset) {
    await gameService.mutate(String(asset.game), game => {
      const url = this.assetContentUrl(asset._id);
      if (game.image === url) game.image = '';
      if (game.banner === url) game.banner = '';
      game.screenshots = (game.screenshots || []).filter(value => value !== url);
      game.videos = (game.videos || []).filter(value => value !== url);
      if ((game.gameLink || '').split('?')[0] === url) { game.gameLink = ''; game.gameFile = ''; }
    }, this.storage, async () => { asset.status = 'deleted'; await asset.save(); });
  }

  async prepareManualUpload({ gameId, category = 'build', filename, version, replacesAssetId, user }) {
    const game = await this.resolveGame(gameId);
    if (!this.storage.getDriveFileDetails) throw new ApiError(400, 'DRIVE_REQUIRED', 'Manual registration requires the existing Google Drive provider');
    const type = storageConfig.categoryTypeMapping[category];
    if (!filename || /[\\/]/.test(filename)) throw new ApiError(400, 'INVALID_FILENAME', 'Enter a filename with its extension, without folders');
    if (type === 'file' && (!version || version.length > 32 || !/^v?[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/.test(version))) {
      throw new ApiError(400, 'INVALID_VERSION', 'Enter a version such as v1.0.0; use letters, digits, dots, dashes or underscores, with no spaces or paths');
    }
    const normalizedVersion = type === 'file' ? sanitizeVersion(version) : null;
    this.validateUploadInput({ type, category, filename, contentType: 'application/octet-stream', version: normalizedVersion });
    if (replacesAssetId) {
      const previous = await GameAsset.findById(replacesAssetId);
      if (!previous || String(previous.game) !== String(game._id) || previous.category !== category || previous.status !== 'ready') {
        throw new ApiError(400, 'INVALID_REPLACEMENT', 'Choose a ready asset of the same game and category to replace');
      }
    }
    if (category === 'build') {
      const duplicate = await GameAsset.findOne({ game: game._id, category, version: normalizedVersion, status: 'ready',
        ...(replacesAssetId ? { _id: { $ne: replacesAssetId } } : {}) });
      if (duplicate) throw new ApiError(409, 'VERSION_CONFLICT', 'This build version already exists. Select it as the replacement or choose a new version');
    }
    const root = await this.storage.getDriveFileDetails(this.storage.folderId);
    if (root.trashed || root.mimeType !== 'application/vnd.google-apps.folder') throw new ApiError(400, 'INVALID_DRIVE_ROOT', 'Configured Drive root is not an accessible folder');
    const storageKey = generateStorageKey({ gameId: String(game._id), type, category, filename, version: normalizedVersion });
    const expectedDriveFilename = path.posix.basename(storageKey);
    const asset = await GameAsset.create({ game: game._id, type, category, originalFilename: filename, storageKey,
      mimeType: 'application/octet-stream', version: normalizedVersion, visibility: category === 'build' ? 'private' : 'public',
      status: 'pending', uploadedBy: user._id, metadata: { manualRegistration: true, expectedDriveFilename,
        environment: this.storage.storageEnvironment, rootFolderId: this.storage.folderId,
        ...(replacesAssetId ? { replacesAssetId } : {}) } });
    return this.describeManualUpload(game, asset, root);
  }

  describeManualUpload(game, asset, root) {
    return {
      assetId: String(asset._id), game: { id: String(game._id), title: game.title, slug: game.slug },
      environment: this.storage.storageEnvironment, rootVariable: this.storage.storageRootVariable,
      root: { id: this.storage.folderId, name: root.name, url: `https://drive.google.com/drive/folders/${this.storage.folderId}` },
      physicalFolder: root.name + '/', subfolder: '(none - upload directly into the root)',
      expectedFilename: asset.metadata.expectedDriveFilename, logicalStorageKey: asset.storageKey, version: asset.version,
      category: asset.category, type: asset.type, allowedMimeTypes: storageConfig.allowedMimeTypes[asset.type], allowedExtensions: storageConfig.allowedExtensions[asset.type],
      expectedMimeTypes: [...(storageConfig.extensionMimeTypes[path.extname(asset.metadata.expectedDriveFilename).toLowerCase()] || []), 'application/octet-stream'],
      maxSize: storageConfig.limits[asset.type], applicationVisibility: asset.visibility,
      drivePermission: 'Keep Restricted. The configured service account must be able to read/download this file (normally inherited from the root folder).',
      serviceAccountEmail: this.storage.clientEmail,
      gameData: { path: `games/${game.gameFolder || game._id}/gameData.json`, filename: 'gameData.json',
        downloadUrl: `/api/games/${game._id}/game-data/download`,
        note: 'The website reads MongoDB, not this JSON. To enable the legacy Drive mirror without service-account quota, upload the generated JSON once as a human owner and give the service account Editor access. Later registrations/mutations update it automatically.' },
    };
  }

  async getManualUploadInstructions({ gameId, assetId }) {
    const game = await this.resolveGame(gameId);
    const asset = await GameAsset.findById(assetId);
    if (!asset || String(asset.game) !== String(game._id) || !asset.metadata?.manualRegistration || asset.status === 'deleted') {
      throw new ApiError(404, 'MANUAL_PLAN_NOT_FOUND', 'No manual registration plan exists for this game and asset');
    }
    if (asset.metadata.rootFolderId !== this.storage.folderId) throw new ApiError(400, 'WRONG_ENVIRONMENT', 'Generate instructions for the current environment');
    return this.describeManualUpload(game, asset, await this.storage.getDriveFileDetails(this.storage.folderId));
  }

  async registerManualUpload({ gameId, assetId, driveFileId, user }) {
    const game = await this.resolveGame(gameId);
    let asset = await GameAsset.findById(assetId);
    if (!asset || String(asset.game) !== String(game._id) || !asset.metadata?.manualRegistration) {
      throw new ApiError(400, 'MANUAL_PLAN_MISMATCH', 'Generate instructions for this game first; this registration does not belong to the selected game');
    }
    if (asset.status === 'ready') throw new ApiError(409, 'ALREADY_REGISTERED', 'This file has already been registered. Use a new plan for another version or replacement');
    if (!['pending','failed'].includes(asset.status)) throw new ApiError(400, 'INVALID_ASSET_STATE', 'This registration plan is no longer available');
    if (asset.metadata.rootFolderId !== this.storage.folderId || asset.metadata.environment !== this.storage.storageEnvironment) {
      throw new ApiError(400, 'WRONG_ENVIRONMENT', 'These instructions were generated for a different environment/root. Generate new instructions here');
    }
    const file = await this.storage.getDriveFileDetails(driveFileId);
    if (file.trashed) throw new ApiError(400, 'DRIVE_FILE_TRASHED', 'Restore the Drive file before registering it');
    if (!(file.parents || []).includes(this.storage.folderId)) {
      throw new ApiError(400, 'WRONG_DRIVE_ROOT', 'Upload directly into the exact root folder shown in the instructions. This file is in a different root or subfolder');
    }
    if (file.name !== asset.metadata.expectedDriveFilename) {
      throw new ApiError(400, 'WRONG_FILENAME', `Rename the uploaded file to exactly: ${asset.metadata.expectedDriveFilename}`);
    }
    if ((file.properties?.storageKey && file.properties.storageKey !== asset.storageKey) ||
      (file.properties?.gameId && file.properties.gameId !== String(game._id))) {
      throw new ApiError(400, 'GAME_PATH_MISMATCH', 'Drive metadata associates this file with a different game/storage key');
    }
    if (file.capabilities?.canDownload === false) throw new ApiError(403, 'DRIVE_DOWNLOAD_DENIED', 'The backend service account can see this file but cannot download it');
    if (!Number(file.size) || !Number.isSafeInteger(Number(file.size))) throw new ApiError(400, 'EMPTY_DRIVE_FILE', 'The uploaded file must have a valid, nonzero size');
    this.validateUploadInput({ type: asset.type, category: asset.category, filename: file.name,
      contentType: file.mimeType, size: file.size, version: asset.version });
    const expectedMimes = [...(storageConfig.extensionMimeTypes[path.extname(file.name).toLowerCase()] || []), 'application/octet-stream'];
    if (!expectedMimes.includes(file.mimeType)) throw new ApiError(400, 'INVALID_MIME_TYPE', `Drive reports ${file.mimeType}; this filename expects ${expectedMimes.join(', ')}`);
    let attached = false;
    try {
      const updatedGame = await gameService.mutate(String(game._id), async current => {
        asset = await GameAsset.findById(assetId);
        if (asset.status === 'ready') throw new ApiError(409, 'ALREADY_REGISTERED', 'This plan was already registered');
        const duplicate = await GameAsset.findOne({ 'metadata.driveFileId': file.id, _id: { $ne: asset._id } });
        if (duplicate) throw new ApiError(409, 'DRIVE_FILE_ALREADY_REGISTERED', 'This Drive file is already registered. Upload a distinct file for a new asset/version');
        if (asset.category === 'build') {
          const versionExists = await GameAsset.findOne({ game: current._id, category: 'build', version: asset.version, status: 'ready',
            _id: { $nin: [asset._id, ...(asset.metadata.replacesAssetId ? [asset.metadata.replacesAssetId] : [])] } });
          if (versionExists) throw new ApiError(409, 'VERSION_CONFLICT', 'This version was registered meanwhile. Generate a new version or replacement plan');
        }
        asset.originalFilename = file.name; asset.mimeType = file.mimeType; asset.fileSize = Number(file.size);
        asset.checksum = file.md5Checksum || null; asset.status = 'ready'; asset.uploadedBy = user._id;
        asset.metadata = { ...asset.metadata, driveFileId: file.id, publicUrl: this.assetContentUrl(asset._id), role: asset.category };
        await asset.save(); attached = true;
        await this.applyGameReference(current, asset);
      }, this.storage, async () => {
        if (asset.metadata.replacesAssetId) {
          try { await GameAsset.updateOne({ _id: asset.metadata.replacesAssetId, game: game._id },
            { $set: { status: 'deleted', 'metadata.replacedBy': String(asset._id) } }); }
          catch (error) { console.warn('Registered replacement; old record archival requires retry:', error.message); }
        }
      });
      return { asset, game: updatedGame, gameDataSync: updatedGame.gameDataSync,
        message: updatedGame.gameDataSync?.status === 'synced' ? 'Drive file registered and JSON synchronized' : 'Drive file registered. JSON mirror needs setup or retry; the game/build reference is saved.' };
    } catch (error) {
      if (attached) { asset.status = 'failed'; await asset.save(); }
      if (error.code === 11000) throw new ApiError(409, 'DRIVE_FILE_ALREADY_REGISTERED', 'This Drive file is already registered');
      throw error;
    }
  }

  validateUploadInput({ type, category, filename, contentType, size, version, skipMimeCheck = false }) {
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

    // Validate MIME type — skip for backend-proxied uploads when browser sends
    // unreliable MIME types (e.g. 'application/octet-stream' for images).
    // The extension check below is always enforced as the authoritative check.
    if (!skipMimeCheck) {
      const cleanContentType = (contentType || "").toLowerCase().trim();
      const allowedMimes = storageConfig.allowedMimeTypes[type] || [];
      // Allow 'application/octet-stream' as a fallback for any type
      if (
        cleanContentType &&
        cleanContentType !== "application/octet-stream" &&
        !allowedMimes.includes(cleanContentType)
      ) {
        throw new ApiError(
          400,
          "INVALID_MIME_TYPE",
          `MIME type '${contentType}' is not allowed for type '${type}'. Allowed: ${allowedMimes.join(", ")}`,
        );
      }
    }

    // Extension is always validated — this is the authoritative check
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

  // ─── Game resolver ────────────────────────────────────────────────────────

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

  // ─── Backend-proxied upload ───────────────────────────────────────────────

  /**
   * Receives the file from the Express multipart upload (multer temp file),
   * streams it through the backend to the storage provider, creates a GameAsset
   * record, and syncs the Game reference fields — all in one step.
   *
   * Flow: Admin UI → multer temp file → this.storage.uploadFile() → Drive/R2 → DB
   * Credentials never reach the browser.
   */
  async uploadFile({ gameId, file, category, version, visibility, user, replacesAssetId }) {
    if (!file?.path)
      throw new ApiError(400, "FILE_REQUIRED", "An asset file is required");

    const game = await this.resolveGame(gameId);
    const type =
      category === "trailer"
        ? "video"
        : category === "build" ||
            category === "asset" ||
            category === "other"
          ? "file"
          : "image";

    this.validateUploadInput({
      type,
      category,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      version,
      skipMimeCheck: true,
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
      if (existingBuild && String(existingBuild._id) !== String(replacesAssetId || "")) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          `A build asset for game '${game.title}' with version '${normalizedVersion}' already exists.`,
        );
      }
    }

    const storageKey = generateStorageKey({
      gameId: game._id.toString(),
      type,
      category,
      filename: file.originalname,
      version: normalizedVersion,
    });

    const asset = await GameAsset.create({
      game: game._id,
      type,
      category,
      originalFilename: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      fileSize: file.size || 0,
      version: normalizedVersion,
      status: "uploading",
      visibility: visibility || (category === "build" ? "private" : "public"),
      uploadedBy: user ? user._id : null,
      metadata: { role: category, ...(replacesAssetId ? { replacesAssetId } : {}) },
    });

    try {
      if (typeof this.storage.uploadFile !== "function") {
        throw new ApiError(
          500,
          "STORAGE_UPLOAD_UNAVAILABLE",
          "The configured storage provider does not support backend uploads.",
        );
      }
      const uploadResult = await this.storage.uploadFile({
        key: storageKey,
        filePath: file.path,
        contentType: file.mimetype,
        size: file.size,
      });

      // completeUpload: verify existence, set ready, sync game references
      return await this.completeUpload({
        assetId: asset._id,
        user,
        fileId: uploadResult?.fileId,
      });
    } catch (error) {
      asset.status = "failed";
      await asset.save();
      throw error;
    } finally {
      // Always clean up the multer temp file regardless of success or failure
      await fs.unlink(file.path).catch(() => {});
    }
  }

  // ─── Presigned URL upload (client → R2 directly) ─────────────────────────

  /**
   * Creates a single presigned upload URL for direct client → R2 upload.
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
          `A build asset for game '${game.title}' with version '${normalizedVersion}' already exists. Please use a new version.`,
        );
      }
    }

    const resolvedVisibility =
      visibility || (category === "build" ? "private" : "public");

    const storageKey = generateStorageKey({
      gameId: game._id.toString(),
      type,
      category,
      filename,
      version: normalizedVersion,
    });

    const expiresIn = storageConfig.presignedExpiry.upload;
    const uploadUrl = await this.storage.createUploadUrl({
      key: storageKey,
      contentType,
      size: size ? parseInt(size, 10) : undefined,
      expiresIn,
    });

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

  // ─── Complete upload (verify + mark ready) ────────────────────────────────

  /**
   * Verifies the upload reached storage, marks the asset ready, and syncs the
   * parent Game's reference fields.
   *
   * Works for both:
   *  - Backend-proxied uploads (called automatically after uploadFile)
   *  - Direct client→R2 uploads (called explicitly via POST /api/assets/:id/complete)
   *
   * @param {string} assetId
   * @param {object} user  - The authenticated user (for future audit)
   * @param {string} [fileId] - Drive file ID returned by GoogleDriveStorageService.uploadFile
   */
  async completeUpload({ assetId, user, fileId }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
    }

    if (asset.status === "ready") {
      return { asset, message: "Asset is already marked as ready" };
    }

    // Build existence check params — pass Drive fileId when available so
    // objectExists uses the real Drive file ID instead of the storage key path
    const existingMetadata =
      asset.metadata && typeof asset.metadata === "object"
        ? asset.metadata
        : {};
    const resolvedFileId = fileId || existingMetadata.driveFileId;
    const existsParams = { key: asset.storageKey };
    if (resolvedFileId) existsParams.fileId = resolvedFileId;

    if (this.storage.assertInRoot) await this.storage.assertInRoot(resolvedFileId);
    const exists = await this.storage.objectExists(existsParams);
    if (!exists) {
      asset.status = "failed";
      await asset.save();
      throw new ApiError(
        400,
        "UPLOAD_VERIFICATION_FAILED",
        `Object with key '${asset.storageKey}' was not found in storage. Ensure upload completed successfully.`,
      );
    }

    // Fetch confirmed metadata from storage (size, checksum, MIME)
    try {
      const meta = await this.storage.getObjectMetadata({
        key: asset.storageKey,
        fileId: resolvedFileId,
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
    // Persist the Drive file ID so download URL generation and future objectExists
    // calls use the real Drive file ID rather than the storage key path string
    asset.metadata = {
      ...existingMetadata,
      ...(resolvedFileId ? { driveFileId: resolvedFileId } : {}),
    };

    await asset.save();
    // Update game.image / game.banner / game.screenshots / game.videos
    try { await this.syncGameReference(asset); }
    catch (error) { asset.status = 'failed'; await asset.save(); throw error; }

    return { asset, message: "Asset upload verified and ready" };
  }

  // ─── Multipart upload (large files via chunked S3-compatible API) ─────────

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
      gameId: game._id.toString(),
      type,
      category,
      filename,
      version: normalizedVersion,
    });

    const { uploadId } = await this.storage.createMultipartUpload({
      key: storageKey,
      contentType,
      metadata: {
        originalFilename: filename,
        gameId: game._id.toString(),
        category,
      },
    });

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

  async signMultipartPart({ assetId, partNumber }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
    }

    if (asset.status !== "uploading" || !asset.uploadId) {
      throw new ApiError(
        400,
        "INVALID_ASSET_STATE",
        "Asset is not in 'uploading' status or lacks a valid uploadId",
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

  async completeMultipartUpload({ assetId, parts }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
    }

    if (asset.status !== "uploading" || !asset.uploadId) {
      throw new ApiError(400, "INVALID_ASSET_STATE", "Asset is not in 'uploading' status");
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      throw new ApiError(
        400,
        "INVALID_PARTS",
        "parts array of { partNumber, etag } is required",
      );
    }

    const result = await this.storage.completeMultipartUpload({
      key: asset.storageKey,
      uploadId: asset.uploadId,
      parts,
    });

    asset.parts = parts.map((p) => ({
      partNumber: p.partNumber,
      etag: p.etag ? p.etag.replace(/"/g, "") : "",
      size: p.size || 0,
    }));
    asset.checksum = result.etag || asset.checksum;
    asset.status = "ready";
    asset.uploadId = null;

    try {
      const meta = await this.storage.getObjectMetadata({ key: asset.storageKey });
      asset.fileSize = meta.contentLength || asset.fileSize;
    } catch (err) {
      // Keep existing size
    }

    await asset.save();

    await this.syncGameReference(asset);
    return { asset, message: "Multipart upload completed successfully" };
  }

  async abortMultipartUpload({ assetId }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
    }

    if (asset.uploadId) {
      try {
        await this.storage.abortMultipartUpload({
          key: asset.storageKey,
          uploadId: asset.uploadId,
        });
      } catch (err) {
        console.warn(
          `Failed to abort multipart in storage for key '${asset.storageKey}':`,
          err.message,
        );
      }
    }

    asset.status = "failed";
    asset.uploadId = null;
    await asset.save();

    return { success: true, message: "Multipart upload aborted" };
  }

  // ─── Download URL ─────────────────────────────────────────────────────────

  async getDownloadUrl({ assetId, user, download = false }) {
    const asset = await GameAsset.findById(assetId).populate("game");
    if (!asset || asset.status === "deleted") {
      throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
    }

    if (asset.status !== "ready") {
      throw new ApiError(
        400,
        "ASSET_NOT_READY",
        `Asset is not in ready status (current status: ${asset.status})`,
      );
    }

    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (!gameService.isLive(asset.game) || (asset.visibility === 'private' &&
      !(asset.category === 'build' && (asset.game.gameLink || '').split('?')[0] === this.assetContentUrl(asset._id))))) {
      throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset is not publicly available');
    }
    if (this.storage.getFileStream) {
      if (this.storage.assertInRoot) await this.storage.assertInRoot(asset.metadata?.driveFileId);
      let url = this.assetContentUrl(asset._id) + (download ? '?download=true' : '?view=true');
      if (isAdmin) {
        const ticket = jwt.sign({ assetId: String(asset._id), purpose: 'asset-preview' }, process.env.JWT_SECRET, { expiresIn: '5m' });
        url += '&ticket=' + encodeURIComponent(ticket);
      }
      return { url, expiresIn: isAdmin ? 300 : null, filename: asset.originalFilename, asset };
    }

    // For public assets with a stored Drive file ID, build a direct CDN URL
    const driveFileId = asset.metadata?.driveFileId;
    const publicUrl = this.storage.getPublicUrl({
      key: asset.storageKey,
      fileId: driveFileId || undefined,
    });
    if (asset.visibility === "public" && publicUrl && !download) {
      return {
        url: publicUrl,
        expiresIn: null,
        isPublic: true,
        storageKey: asset.storageKey,
        filename: asset.originalFilename,
      };
    }

    const contentDisposition = download
      ? `attachment; filename="${encodeURIComponent(asset.originalFilename)}"`
      : undefined;

    const expiresIn = storageConfig.presignedExpiry.download;
    const presignedUrl = await this.storage.createDownloadUrl({
      key: asset.storageKey,
      fileId: driveFileId || undefined,
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

  // ─── Drive file streaming ─────────────────────────────────────────────────

  async getDriveFileStream({ fileId, range }) {
    return this.storage.getFileStream({ fileId, range });
  }

  // ─── Asset listing ────────────────────────────────────────────────────────

  async getGameAssets({ gameId, type, category, version, status, user }) {
    const game = await this.resolveGame(gameId);

    const filter = { game: game._id };

    const isAdmin = user && user.role === "admin";

    if (!isAdmin && !gameService.isLive(game)) throw new ApiError(404, "GAME_NOT_FOUND", "Game not available");
    if (!isAdmin) {
      filter.status = "ready";
      filter.visibility = "public";
    } else if (status && status !== "all") {
      filter.status = status;
    }

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (version) filter.version = sanitizeVersion(version);

    const assets = await GameAsset.find(filter).sort({ createdAt: 1, _id: 1 });
    const order = [...(game.screenshots || []), ...(game.videos || [])];
    assets.sort((a,b) => {
      const ai = order.indexOf(this.assetContentUrl(a._id)), bi = order.indexOf(this.assetContentUrl(b._id));
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
    });

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

  // ─── Asset deletion ───────────────────────────────────────────────────────

  /**
   * Deletes an asset from storage, removes it from the DB, and cleans up the
   * parent Game's reference fields (image, banner, screenshots[], videos[]).
   */
  async deleteAsset({ assetId, user }) {
    const asset = await GameAsset.findById(assetId);
    if (!asset) {
      throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
    }

    await this.removeGameReference(asset);

    return {
      message: `Asset '${asset.originalFilename}' (${asset.storageKey}) removed from the game (storage retained)`,
    };
  }
}

module.exports = AssetService;
