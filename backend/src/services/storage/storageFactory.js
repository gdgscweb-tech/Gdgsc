// backend/src/services/storage/storageFactory.js

const storageConfig = require("../../config/storageConfig");
const GoogleDriveStorageService = require("./GoogleDriveStorageService");
const R2StorageService = require("./R2StorageService");

let defaultInstance = null;

/**
 * Factory function to create a storage service instance based on provider name.
 * @param {string} [provider] - 'google_drive' | 'r2'
 * @param {object} [options] - Optional config overrides
 * @returns {import('./IStorageService')}
 */
function getStorageService(provider = storageConfig.provider, options = {}) {
  const selected = (provider || "").toLowerCase();
  if (selected === "r2") {
    return new R2StorageService(options);
  }
  // Default to Google Drive
  return new GoogleDriveStorageService(options);
}

/**
 * Returns singleton default storage service instance.
 * @returns {import('./IStorageService')}
 */
function getDefaultStorageService() {
  if (!defaultInstance) {
    defaultInstance = getStorageService();
  }
  return defaultInstance;
}

/**
 * Resets default storage service instance (useful in tests).
 */
function resetStorageService() {
  defaultInstance = null;
}

module.exports = {
  getStorageService,
  getDefaultStorageService,
  resetStorageService,
};
