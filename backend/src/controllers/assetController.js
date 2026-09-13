// backend/src/controllers/assetController.js

const asyncHandler = require("express-async-handler");
const AssetService = require("../services/assetService");
const GameAsset = require("../models/GameAsset");
const fs = require("fs/promises");
const { sendSuccess, sendError, ApiError } = require("../utils/apiResponse");

const assetService = new AssetService();

exports.prepareManualUpload = asyncHandler(async (req, res) => {
  const { category, filename, version, replacesAssetId } = req.body;
  return sendSuccess(res, await assetService.prepareManualUpload({ gameId: req.params.gameId,
    category, filename, version, replacesAssetId, user: req.user }), 201);
});
exports.getManualUploadInstructions = asyncHandler(async (req, res) => {
  return sendSuccess(res, await assetService.getManualUploadInstructions(req.params));
});
exports.registerManualUpload = asyncHandler(async (req, res) => {
  return sendSuccess(res, await assetService.registerManualUpload({ ...req.params,
    driveFileId: req.body.driveFileId, user: req.user }));
});

/**
 * @desc    Request presigned upload URL for single file upload
 * @route   POST /api/games/:gameId/assets/upload
 * @access  Private/Admin
 */
exports.createUploadUrl = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { filename, contentType, size, type, category, version, visibility } =
    req.body;

  const result = await assetService.createUploadUrl({
    gameId,
    filename,
    contentType,
    size,
    type,
    category,
    version,
    visibility,
    user: req.user,
  });

  return sendSuccess(res, result, 201);
});

/**
 * Upload a game asset through the backend to the configured storage provider.
 * @route   POST /api/games/:gameId/assets/upload-file
 * @access  Private/Admin
 */
exports.uploadFile = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { category, version, visibility, replacesAssetId } = req.body;
  try {
    const result = await assetService.uploadFile({
      gameId,
      file: req.file,
      category,
      version,
      visibility,
      user: req.user,
      replacesAssetId,
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    // Log the full error detail so server logs show exactly what failed
    console.error(
      `[uploadFile] 400/500 on game=${gameId} category=${category}:`,
      err.message,
      err.code || "",
    );
    throw err; // Let asyncHandler + error middleware handle the response
  } finally {
    // Temp file is already deleted inside assetService.uploadFile's finally block.
    // This is a safety net for the case where assetService threw before it reached its own finally.
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
  }
});


/**
 * @desc    Notify backend that direct R2 upload completed
 * @route   POST /api/assets/:assetId/complete
 * @access  Private/Admin
 */
exports.completeUpload = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  const result = await assetService.completeUpload({
    assetId,
    user: req.user,
    // Drive IDs are supplied only by backend uploads.
  });

  return sendSuccess(res, result, 200);
});

/**
 * @desc    Start multipart upload for large files
 * @route   POST /api/games/:gameId/assets/multipart/start
 * @access  Private/Admin
 */
exports.startMultipartUpload = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { filename, contentType, size, type, category, version, visibility } =
    req.body;

  const result = await assetService.startMultipartUpload({
    gameId,
    filename,
    contentType,
    size,
    type,
    category,
    version,
    visibility,
    user: req.user,
  });

  return sendSuccess(res, result, 201);
});

/**
 * @desc    Sign a specific part in a multipart upload
 * @route   POST /api/assets/:assetId/multipart/sign
 * @access  Private/Admin
 */
exports.signMultipartPart = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const { partNumber } = req.body;

  if (!partNumber) {
    throw new ApiError(400, "VALIDATION_ERROR", "partNumber is required");
  }

  const result = await assetService.signMultipartPart({
    assetId,
    partNumber,
  });

  return sendSuccess(res, result, 200);
});

/**
 * @desc    Complete a multipart upload
 * @route   POST /api/assets/:assetId/multipart/complete
 * @access  Private/Admin
 */
exports.completeMultipartUpload = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const { parts } = req.body;

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "parts array is required");
  }

  const result = await assetService.completeMultipartUpload({
    assetId,
    parts,
  });

  return sendSuccess(res, result, 200);
});

/**
 * @desc    Abort a multipart upload
 * @route   POST /api/assets/:assetId/multipart/abort
 * @access  Private/Admin
 */
exports.abortMultipartUpload = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  const result = await assetService.abortMultipartUpload({
    assetId,
  });

  return sendSuccess(res, result, 200);
});

/**
 * @desc    Get download or CDN viewing URL for an asset
 * @route   GET /api/assets/:assetId/url
 * @access  Public (for public assets) / Private (for private assets)
 */
exports.getDownloadUrl = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const download = req.query.download === "true";

  const result = await assetService.getDownloadUrl({
    assetId,
    user: req.user,
    download,
  });

  const { asset, ...publicResult } = result;
  return sendSuccess(res, publicResult, 200);
});

// In-memory LRU cache for Google Drive media files
const driveMediaCache = new Map();
let currentCacheSizeBytes = 0;
const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB max in-memory cache
const MAX_FILE_CACHE_BYTES = 8 * 1024 * 1024;  // 8MB max per file

const getCacheEntry = (fileId) => {
  const entry = driveMediaCache.get(fileId);
  if (!entry) return null;
  driveMediaCache.delete(fileId);
  driveMediaCache.set(fileId, entry);
  return entry;
};

const setCacheEntry = (fileId, entry) => {
  const size = entry.buffer.length;
  if (size > MAX_FILE_CACHE_BYTES) return;

  while (currentCacheSizeBytes + size > MAX_CACHE_SIZE_BYTES && driveMediaCache.size > 0) {
    const oldestKey = driveMediaCache.keys().next().value;
    const oldestEntry = driveMediaCache.get(oldestKey);
    if (oldestEntry) {
      currentCacheSizeBytes -= oldestEntry.buffer.length;
      driveMediaCache.delete(oldestKey);
    }
  }

  driveMediaCache.set(fileId, entry);
  currentCacheSizeBytes += size;
};

/**
 * @desc    Stream a private Google Drive file through the configured storage API
 * @route   GET /api/assets/drive/:fileId
 * @access  Public app route; Drive credentials remain server-side
 */
exports.proxyDriveFile = asyncHandler(async (req, res) => {
  const fileId = req.params.fileId;
  const Game = require('../models/Game');
  const gameService = require('../services/gameService');
  const linkedAsset = await GameAsset.findOne({ 'metadata.driveFileId': fileId });
  const prefix = `/api/assets/drive/${fileId}`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reference = { $regex: `^${escaped}(?:\\?|$)` };
  const games = await Game.find({ $or: ['image','banner','screenshots','videos','gameLink'].map(field => ({ [field]: reference })) });
  if (linkedAsset || games.length) {
    if (linkedAsset) {
      await assetService.getDownloadUrl({ assetId: String(linkedAsset._id), user: req.user });
    } else if (req.user?.role !== 'admin' && !games.some(game => gameService.isLive(game))) {
      throw new ApiError(404, 'ASSET_NOT_FOUND', 'Game file is not public');
    }
    await assetService.storage.assertInRoot(fileId);
    const stream = await assetService.getDriveFileStream({ fileId, range: req.headers.range });
    res.set('Cache-Control', 'private, no-store');
    for (const header of ['content-type','content-length','content-range','accept-ranges']) if (stream.headers[header]) res.set(header, stream.headers[header]);
    if (req.query.download === 'true') res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(String(req.query.filename || fileId))}`);
    stream.data.on('error', () => res.destroy());
    res.status(stream.status); stream.data.pipe(res); return;
  }
  // Preserve only the existing explicit team image allowlist; arbitrary Drive IDs are denied.
  const manifest = require('fs').readFileSync(require('path').resolve(__dirname, '../../../frontend/src/data/teamAssetManifest.js'), 'utf8');
  if (!manifest.includes(`/api/assets/drive/${fileId}?cache=team`)) throw new ApiError(404, 'ASSET_NOT_FOUND', 'File is not an application asset');
  const isDownload = req.query.download === "true";
  const etag = `W/"drive-${fileId}"`;

  // Always set ETag for caching and revalidation
  res.setHeader("ETag", etag);

  if (isDownload) {
    const requestedName = String(req.query.filename || `drive-${fileId}`)
      .replace(/[\\"\r\n]/g, "")
      .slice(0, 180);
    res.setHeader("Content-Disposition", `attachment; filename="${requestedName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
  } else {
    // Aggressive public browser & CDN caching: 30 days max-age, 1 day stale-while-revalidate
    res.setHeader(
      "Cache-Control",
      "public, max-age=2592000, stale-while-revalidate=86400, immutable",
    );
  }

  // 304 Not Modified conditional check
  const clientEtag = req.headers["if-none-match"];
  if (clientEtag && (clientEtag === etag || clientEtag === `"${etag}"` || clientEtag.includes(`drive-${fileId}`))) {
    return res.status(304).end();
  }

  // Check in-memory buffer cache for non-download, non-range requests
  if (!req.headers.range && !isDownload) {
    const cached = getCacheEntry(fileId);
    if (cached) {
      if (cached.contentType) res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Content-Length", cached.buffer.length);
      res.setHeader("Accept-Ranges", "bytes");
      return res.status(200).send(cached.buffer);
    }
  }

  const result = await assetService.getDriveFileStream({
    fileId,
    range: req.headers.range,
  });

  const headersToForward = [
    "accept-ranges",
    "content-length",
    "content-range",
    "content-type",
    "last-modified",
  ];
  headersToForward.forEach((header) => {
    if (result.headers[header]) res.setHeader(header, result.headers[header]);
  });

  // Cache buffer in memory if size is within limits and not a range or download request
  const contentLength = Number(result.headers["content-length"]) || 0;
  if (!req.headers.range && !isDownload && (contentLength === 0 || contentLength <= MAX_FILE_CACHE_BYTES)) {
    const chunks = [];
    let totalBytes = 0;
    let overflow = false;

    result.data.on("data", (chunk) => {
      if (!overflow) {
        totalBytes += chunk.length;
        if (totalBytes <= MAX_FILE_CACHE_BYTES) {
          chunks.push(chunk);
        } else {
          overflow = true;
          chunks.length = 0;
        }
      }
    });

    result.data.on("end", () => {
      if (!overflow && chunks.length > 0) {
        setCacheEntry(fileId, {
          buffer: Buffer.concat(chunks),
          contentType: result.headers["content-type"] || "image/jpeg",
          etag,
        });
      }
    });
  }

  res.status(result.status);
  result.data.pipe(res);
});

/**
 * @desc    Get asset metadata by ID
 * @route   GET /api/assets/:assetId
 * @access  Public / Private
 */
exports.getAssetById = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  await assetService.getDownloadUrl({ assetId, user: req.user });
  const asset = await GameAsset.findById(assetId).populate(
    "game",
    "title name slug",
  );
  if (!asset || asset.status === "deleted") {
    throw new ApiError(404, "ASSET_NOT_FOUND", `Asset '${assetId}' not found`);
  }

  // Check visibility
  if (
    asset.visibility === "private" &&
    (!req.user || req.user.role !== "admin")
  ) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Not authorized to view this private asset",
    );
  }

  return sendSuccess(res, asset, 200);
});

/**
 * @desc    List all ready assets for a game
 * @route   GET /api/games/:gameId/assets
 * @access  Public / Private (Admin sees pending/private)
 */
exports.getGameAssets = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { type, category, version, status } = req.query;

  const result = await assetService.getGameAssets({
    gameId,
    type,
    category,
    version,
    status,
    user: req.user,
  });

  return sendSuccess(res, result, 200);
});

/**
 * Redirects public/private asset requests to the provider URL while keeping
 * provider credentials and storage details on the backend.
 * @route   GET /api/assets/:assetId/content
 */
exports.getAssetContent = asyncHandler(async (req, res) => {
  let user = req.user;
  if (!user && req.query.ticket) {
    try {
      const ticket = require('jsonwebtoken').verify(req.query.ticket, process.env.JWT_SECRET);
      if (ticket.purpose === 'asset-preview' && ticket.assetId === req.params.assetId) user = { role: 'admin' };
    } catch {}
  }
  const result = await assetService.getDownloadUrl({ assetId: req.params.assetId, user,
    download: req.query.download === 'true' });
  res.set('Cache-Control', 'private, no-store');
  if (!result.asset) return res.redirect(result.url);
  const stream = await assetService.getDriveFileStream({ fileId: result.asset.metadata.driveFileId, range: req.headers.range });
  for (const header of ['content-type','content-length','content-range','accept-ranges']) {
    if (stream.headers[header]) res.set(header, stream.headers[header]);
  }
  if (req.query.download === 'true') res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
  stream.data.on('error', () => res.destroy());
  res.status(stream.status); stream.data.pipe(res);
});

/**
 * @desc    Delete an asset and its storage object
 * @route   DELETE /api/assets/:assetId
 * @access  Private/Admin
 */
exports.deleteAsset = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  const result = await assetService.deleteAsset({
    assetId,
    user: req.user,
  });

  return sendSuccess(res, result, 200);
});
