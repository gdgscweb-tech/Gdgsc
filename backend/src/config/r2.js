// backend/src/config/r2.js

const { S3Client } = require("@aws-sdk/client-s3");
const storageConfig = require("./storageConfig");

let s3ClientInstance = null;

/**
 * Initializes and returns the AWS S3 client configured for Cloudflare R2.
 * @param {object} [customConfig] - Optional override config (useful for testing)
 * @returns {S3Client}
 */
const getR2Client = (customConfig = {}) => {
  if (s3ClientInstance && !Object.keys(customConfig).length) {
    return s3ClientInstance;
  }

  const accountId = customConfig.accountId || storageConfig.r2.accountId;
  const accessKeyId = customConfig.accessKeyId || storageConfig.r2.accessKeyId;
  const secretAccessKey =
    customConfig.secretAccessKey || storageConfig.r2.secretAccessKey;

  // Build endpoint: if custom endpoint provided use that, otherwise use Cloudflare R2 endpoint
  const endpoint =
    customConfig.endpoint ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  const client = new S3Client({
    region: customConfig.region || "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId || "dummy_access_key",
      secretAccessKey: secretAccessKey || "dummy_secret_key",
    },
    // Cloudflare R2 requires standard path-style or virtual-hosted requests; standard v4 signing is used
  });

  if (!Object.keys(customConfig).length) {
    s3ClientInstance = client;
  }

  return client;
};

module.exports = { getR2Client };
