// backend/src/utils/storageKey.js

const path = require("path");
const crypto = require("crypto");

/**
 * Sanitizes a filename to prevent path traversal, null-byte injection,
 * and unsafe URL characters.
 * @param {string} rawFilename
 * @returns {string} safe sanitized filename
 */
const sanitizeFilename = (rawFilename) => {
  if (!rawFilename || typeof rawFilename !== "string") {
    return "file.bin";
  }

  // Strip path traversal characters and null bytes
  let cleaned = rawFilename.replace(/[\0\x00-\x1F\x7F]/g, "");
  cleaned = path.basename(cleaned); // Drops any ../ or C:\ path components

  // Extract extension (lowercase)
  const rawExt = path.extname(cleaned);
  const ext = rawExt.toLowerCase();

  // Extract baseName without extension
  const baseName = rawExt ? cleaned.slice(0, -rawExt.length) : cleaned;

  // Slugify the base filename: normalize dots, spaces, underscores, symbols to dashes
  let safeBase = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!safeBase) {
    safeBase = "asset";
  }

  // Limit length to prevent overly long keys
  safeBase = safeBase.slice(0, 64);

  return `${safeBase}${ext}`;
};

/**
 * Normalizes version strings (e.g. "1.0.0" -> "v1.0.0", "v2.1" -> "v2.1")
 * @param {string} [rawVersion]
 * @returns {string}
 */
const sanitizeVersion = (rawVersion) => {
  if (!rawVersion || typeof rawVersion !== "string") {
    return "v1.0.0";
  }

  let cleaned = rawVersion
    .trim()
    .replace(/^[^a-zA-Z0-9]+/, "") // Strip leading dots or slashes
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 32);

  if (!cleaned) return "v1.0.0";

  if (!cleaned.startsWith("v") && !cleaned.startsWith("V")) {
    cleaned = `v${cleaned}`;
  }

  return cleaned.toLowerCase();
};

/**
 * Generates a safe, predictable, collision-resistant object key for Cloudflare R2.
 *
 * Rules:
 * - games/{gameId}/files/{version}/{uniqueId}-{filename}
 * - games/{gameId}/images/{uniqueId}-{filename}
 * - games/{gameId}/videos/{uniqueId}-{filename}
 * - games/{gameId}/assets/{uniqueId}-{filename}
 *
 * @param {object} params
 * @param {string} params.gameId - Game identifier or slug
 * @param {string} params.type - 'file' | 'image' | 'video'
 * @param {string} params.category - 'build' | 'thumbnail' | 'banner' | 'screenshot' | 'trailer' | 'asset' | 'other'
 * @param {string} params.filename - Original raw filename
 * @param {string} [params.version] - Version (used for 'build' / 'file' type)
 * @param {boolean} [params.includeUniquePrefix=true] - Whether to prepend random hex for collision resistance
 * @returns {string} generated storage key
 */
const generateStorageKey = ({
  gameId,
  type,
  category,
  filename,
  version,
  includeUniquePrefix = true,
}) => {
  if (!gameId) {
    throw new Error("gameId is required to generate storage key");
  }

  // Sanitize game ID (strip slashes/unsafe characters)
  const safeGameId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");
  const safeName = sanitizeFilename(filename);
  const uniquePrefix = includeUniquePrefix
    ? `${crypto.randomBytes(4).toString("hex")}-`
    : "";
  const finalFilename = `${uniquePrefix}${safeName}`;

  if (type === "file" || category === "build") {
    const safeVer = sanitizeVersion(version);
    return `games/${safeGameId}/files/${safeVer}/${finalFilename}`;
  }

  if (type === "image") {
    return `games/${safeGameId}/images/${finalFilename}`;
  }

  if (type === "video") {
    return `games/${safeGameId}/videos/${finalFilename}`;
  }

  // Fallback for general assets
  return `games/${safeGameId}/assets/${finalFilename}`;
};

module.exports = {
  sanitizeFilename,
  sanitizeVersion,
  generateStorageKey,
};
