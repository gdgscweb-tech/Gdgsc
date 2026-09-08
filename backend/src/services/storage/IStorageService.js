// backend/src/services/storage/IStorageService.js

/**
 * Interface contract for Storage Service.
 * Isolates the storage provider (Cloudflare R2, AWS S3, MinIO, etc.)
 * so the application layer remains decoupled from provider-specific SDKs.
 */

class IStorageService {
  /**
   * Generates a presigned PUT URL for direct client-to-storage upload.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @param {string} params.contentType - MIME type
   * @param {number} [params.size] - Expected content length
   * @param {number} [params.expiresIn] - Expiration in seconds
   * @returns {Promise<string>} presigned upload URL
   */
  async createUploadUrl(params) {
    throw new Error(
      "createUploadUrl() must be implemented by storage provider",
    );
  }

  /**
   * Initiates a multipart upload for large files.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @param {string} params.contentType - MIME type
   * @param {object} [params.metadata] - Optional object metadata
   * @returns {Promise<{ uploadId: string, key: string }>}
   */
  async createMultipartUpload(params) {
    throw new Error(
      "createMultipartUpload() must be implemented by storage provider",
    );
  }

  /**
   * Generates a presigned PUT URL for a specific part in a multipart upload.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @param {string} params.uploadId - Multipart upload ID
   * @param {number} params.partNumber - 1-based part number
   * @param {number} [params.expiresIn] - Expiration in seconds
   * @returns {Promise<string>} presigned part upload URL
   */
  async signPart(params) {
    throw new Error("signPart() must be implemented by storage provider");
  }

  /**
   * Completes a multipart upload after all parts are uploaded.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @param {string} params.uploadId - Multipart upload ID
   * @param {Array<{ partNumber: number, etag: string }>} params.parts - Uploaded parts list
   * @returns {Promise<{ location?: string, etag?: string, key: string }>}
   */
  async completeMultipartUpload(params) {
    throw new Error(
      "completeMultipartUpload() must be implemented by storage provider",
    );
  }

  /**
   * Aborts an in-progress multipart upload and cleans up incomplete parts.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @param {string} params.uploadId - Multipart upload ID
   * @returns {Promise<boolean>}
   */
  async abortMultipartUpload(params) {
    throw new Error(
      "abortMultipartUpload() must be implemented by storage provider",
    );
  }

  /**
   * Generates a presigned GET URL for secure, time-limited downloads.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @param {number} [params.expiresIn] - Expiration in seconds
   * @param {string} [params.responseContentDisposition] - Optional Content-Disposition header
   * @returns {Promise<string>} presigned download URL
   */
  async createDownloadUrl(params) {
    throw new Error(
      "createDownloadUrl() must be implemented by storage provider",
    );
  }

  /**
   * Deletes an object from storage.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @returns {Promise<boolean>}
   */
  async deleteObject(params) {
    throw new Error("deleteObject() must be implemented by storage provider");
  }

  /**
   * Checks if an object exists in storage without downloading it.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @returns {Promise<boolean>}
   */
  async objectExists(params) {
    throw new Error("objectExists() must be implemented by storage provider");
  }

  /**
   * Fetches metadata for an object (size, ETag, MIME type).
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @returns {Promise<{ contentLength: number, contentType: string, etag: string, lastModified: Date }>}
   */
  async getObjectMetadata(params) {
    throw new Error(
      "getObjectMetadata() must be implemented by storage provider",
    );
  }

  /**
   * Returns the direct public CDN URL if configured.
   * @param {object} params
   * @param {string} params.key - Storage object key
   * @returns {string|null}
   */
  getPublicUrl(params) {
    throw new Error("getPublicUrl() must be implemented by storage provider");
  }
}

module.exports = IStorageService;
