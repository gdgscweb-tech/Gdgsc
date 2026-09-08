// backend/src/controllers/assetController.js

const asyncHandler = require("express-async-handler");
const AssetService = require("../services/assetService");
const GameAsset = require("../models/GameAsset");
const { sendSuccess, sendError, ApiError } = require("../utils/apiResponse");

const assetService = new AssetService();

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
 * @desc    Notify backend that direct R2 upload completed
 * @route   POST /api/assets/:assetId/complete
 * @access  Private/Admin
 */
exports.completeUpload = asyncHandler(async (req, res) => {
  const { assetId } = req.params;

  const result = await assetService.completeUpload({
    assetId,
    user: req.user,
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

  return sendSuccess(res, result, 200);
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
