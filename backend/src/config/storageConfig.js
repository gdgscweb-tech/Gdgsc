// backend/src/config/storageConfig.js

/**
 * Centralized Storage & File Upload Configuration
 * All file size limits, MIME type validations, URL expirations, and thresholds
 * are defined here to ensure consistency and avoid magic numbers.
 */

const parseEnvInt = (val, fallback) => {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const { getEnvironment } = require("./db");

const STORAGE_ROOT_VARIABLE_BY_ENVIRONMENT = Object.freeze({
  development: "DEV_STORAGE_ROOT_FOLDER_ID",
  production: "PROD_STORAGE_ROOT_FOLDER_ID",
  test: "TEST_STORAGE_ROOT_FOLDER_ID",
});

const getStorageRootConfig = () => {
  const environment = getEnvironment();
  const variable = STORAGE_ROOT_VARIABLE_BY_ENVIRONMENT[environment];

  if (!variable) {
    throw new Error(
      `Unsupported NODE_ENV "${environment}". Use development, production, or test.`,
    );
  }

  const folderId = String(process.env[variable] || "").trim();
  if (!folderId) {
    throw new Error(
      `${variable} is required for ${environment} Google Drive storage.`,
    );
  }

  const otherRoots = Object.values(STORAGE_ROOT_VARIABLE_BY_ENVIRONMENT)
    .filter(name => name !== variable).map(name => String(process.env[name] || '').trim()).filter(Boolean);
  if (otherRoots.includes(folderId)) throw new Error('Drive environment roots must be distinct');
  return { environment, variable, folderId };
};

const sanitizePrivateKey = (val) => {
  if (!val) return "";
  let key = String(val).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
};

const storageConfig = {
  // Cloudflare R2 Credentials & Endpoints
  // Storage Provider ('google_drive' | 'r2')
  provider: process.env.STORAGE_PROVIDER || "google_drive",

  // Google Drive Configuration
  googleDrive: {
    teamFolderId: process.env.GOOGLE_DRIVE_TEAM_FOLDER_ID || "",
    clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || "",
    privateKey: sanitizePrivateKey(process.env.GOOGLE_DRIVE_PRIVATE_KEY),
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "",
    publicUrl: (process.env.GOOGLE_DRIVE_PUBLIC_URL || "https://drive.google.com").replace(/\/+$/, ""),
  },

  // Cloudflare R2 Credentials & Endpoints (Alternative Provider)
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME || "gdgsc-game-assets",
    publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, ""), // strip trailing slash
  },

  // Maximum File Sizes in Bytes
  limits: {
    file: parseEnvInt(
      process.env.MAX_FILE_SIZE_GAME_BYTES,
      5 * 1024 * 1024 * 1024,
    ), // 5 GB default for builds
    video: parseEnvInt(
      process.env.MAX_FILE_SIZE_VIDEO_BYTES,
      500 * 1024 * 1024,
    ), // 500 MB default for videos
    image: parseEnvInt(process.env.MAX_FILE_SIZE_IMAGE_BYTES, 20 * 1024 * 1024), // 20 MB default for images
    asset: parseEnvInt(
      process.env.MAX_FILE_SIZE_ASSET_BYTES,
      100 * 1024 * 1024,
    ), // 100 MB default for config/other
  },

  // Allowed MIME types mapped by Asset Type
  allowedMimeTypes: {
    file: [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/vnd.rar",
      "application/x-rar",
      "application/x-7z-compressed",
      "application/octet-stream",
      "application/x-msdownload",
      "application/x-executable",
      "application/gzip",
      "application/x-tar",
      "application/x-gzip",
      "application/vnd.android.package-archive",
    ],
    image: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ],
    video: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/ogg",
      "video/x-matroska",
    ],
    asset: [
      "application/json",
      "text/plain",
      "text/csv",
      "application/pdf",
      "application/octet-stream",
      "application/zip",
    ],
  },

  // Allowed File Extensions (lowercase, with leading dot)
  allowedExtensions: {
    file: [
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
      ".exe",
      ".dmg",
      ".pkg",
      ".apk",
      ".iso",
      ".bin",
    ],
    image: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
    video: [".mp4", ".webm", ".mov", ".ogv", ".mkv"],
    asset: [".json", ".txt", ".csv", ".pdf", ".bin", ".zip", ".cfg", ".ini"],
  },

  // Drive may report generic binary MIME for archives/installers. Manual plans
  // constrain more precisely by extension while retaining that documented fallback.
  extensionMimeTypes: {
    '.zip': ['application/zip', 'application/x-zip-compressed'],
    '.rar': ['application/x-rar-compressed', 'application/vnd.rar', 'application/x-rar'],
    '.7z': ['application/x-7z-compressed'], '.tar': ['application/x-tar'],
    '.gz': ['application/gzip', 'application/x-gzip'], '.exe': ['application/x-msdownload', 'application/x-executable'],
    '.apk': ['application/vnd.android.package-archive'],
    '.png': ['image/png'], '.jpg': ['image/jpeg', 'image/jpg'], '.jpeg': ['image/jpeg', 'image/jpg'],
    '.webp': ['image/webp'], '.gif': ['image/gif'], '.svg': ['image/svg+xml'],
    '.mp4': ['video/mp4'], '.webm': ['video/webm'], '.mov': ['video/quicktime'], '.ogv': ['video/ogg'], '.mkv': ['video/x-matroska'],
  },

  // Supported Asset Types and Categories
  types: ["file", "image", "video"],
  categories: [
    "build",
    "thumbnail",
    "banner",
    "screenshot",
    "trailer",
    "asset",
    "other",
  ],

  // Mapping of category to expected type (for auto-validation)
  categoryTypeMapping: {
    build: "file",
    thumbnail: "image",
    banner: "image",
    screenshot: "image",
    trailer: "video",
    asset: "file",
    other: "file",
  },

  // Presigned URL TTL in seconds
  presignedExpiry: {
    upload: parseEnvInt(process.env.PRESIGNED_UPLOAD_EXPIRY_SECONDS, 900), // 15 minutes
    download: parseEnvInt(process.env.PRESIGNED_DOWNLOAD_EXPIRY_SECONDS, 3600), // 1 hour
  },

  // Multipart upload configuration
  multipart: {
    thresholdBytes: parseEnvInt(
      process.env.MULTIPART_THRESHOLD_BYTES,
      20 * 1024 * 1024,
    ), // 20 MB
    minPartSizeBytes: 5 * 1024 * 1024, // 5 MB minimum per part as required by S3/R2 standard
    defaultPartSizeBytes: 10 * 1024 * 1024, // 10 MB suggested part size
  },
};

module.exports = storageConfig;
module.exports.getStorageRootConfig = getStorageRootConfig;
module.exports.STORAGE_ROOT_VARIABLE_BY_ENVIRONMENT =
  STORAGE_ROOT_VARIABLE_BY_ENVIRONMENT;
