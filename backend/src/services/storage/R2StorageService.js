// backend/src/services/storage/R2StorageService.js

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const IStorageService = require("./IStorageService");
const { getR2Client } = require("../../config/r2");
const storageConfig = require("../../config/storageConfig");

class R2StorageService extends IStorageService {
  /**
   * @param {object} [options]
   * @param {import('@aws-sdk/client-s3').S3Client} [options.client] - Injected S3 client
   * @param {string} [options.bucket] - Bucket name
   * @param {string} [options.publicUrl] - Public CDN / R2 custom domain URL
   */
  constructor(options = {}) {
    super();
    this.client = options.client || getR2Client();
    this.bucket = options.bucket || storageConfig.r2.bucketName;
    this.publicUrl =
      options.publicUrl !== undefined
        ? options.publicUrl
        : storageConfig.r2.publicUrl;
  }

  /**
   * Generates a presigned PUT URL for single upload.
   */
  async createUploadUrl({
    key,
    contentType,
    size,
    expiresIn = storageConfig.presignedExpiry.upload,
  }) {
    if (!key) throw new Error("Object key is required");
    if (!contentType) throw new Error("Content-Type is required");

    const commandParams = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    };

    if (size) {
      commandParams.ContentLength = size;
    }

    const command = new PutObjectCommand(commandParams);
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return signedUrl;
  }

  /**
   * Initiates multipart upload on R2.
   */
  async createMultipartUpload({ key, contentType, metadata = {} }) {
    if (!key) throw new Error("Object key is required");

    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      Metadata: metadata,
    });

    const response = await this.client.send(command);
    return {
      uploadId: response.UploadId,
      key: response.Key || key,
    };
  }

  /**
   * Presigns an upload URL for a single part in a multipart upload.
   */
  async signPart({
    key,
    uploadId,
    partNumber,
    expiresIn = storageConfig.presignedExpiry.upload,
  }) {
    if (!key) throw new Error("Object key is required");
    if (!uploadId) throw new Error("UploadId is required");
    if (!partNumber || partNumber < 1)
      throw new Error("Valid partNumber is required");

    const command = new UploadPartCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: parseInt(partNumber, 10),
    });

    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return signedUrl;
  }

  /**
   * Completes multipart upload on R2.
   */
  async completeMultipartUpload({ key, uploadId, parts }) {
    if (!key) throw new Error("Object key is required");
    if (!uploadId) throw new Error("UploadId is required");
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("Non-empty parts array is required");
    }

    // S3/R2 requires parts sorted strictly by PartNumber ascending
    const sortedParts = [...parts]
      .map((p) => ({
        PartNumber: parseInt(p.partNumber, 10),
        ETag: p.etag ? p.etag.replace(/"/g, "") : "",
      }))
      .sort((a, b) => a.PartNumber - b.PartNumber);

    const command = new CompleteMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts.map((p) => ({
          PartNumber: p.PartNumber,
          ETag: `"${p.ETag}"`,
        })),
      },
    });

    const response = await this.client.send(command);
    return {
      location: response.Location,
      etag: response.ETag ? response.ETag.replace(/"/g, "") : null,
      key: response.Key || key,
    };
  }

  /**
   * Aborts an in-progress multipart upload on R2.
   */
  async abortMultipartUpload({ key, uploadId }) {
    if (!key) throw new Error("Object key is required");
    if (!uploadId) throw new Error("UploadId is required");

    const command = new AbortMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
    });

    await this.client.send(command);
    return true;
  }

  /**
   * Generates a presigned GET URL for secure download.
   */
  async createDownloadUrl({
    key,
    expiresIn = storageConfig.presignedExpiry.download,
    responseContentDisposition,
  }) {
    if (!key) throw new Error("Object key is required");

    const commandParams = {
      Bucket: this.bucket,
      Key: key,
    };

    if (responseContentDisposition) {
      commandParams.ResponseContentDisposition = responseContentDisposition;
    }

    const command = new GetObjectCommand(commandParams);
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
    return signedUrl;
  }

  /**
   * Deletes an object from R2.
   */
  async deleteObject({ key }) {
    if (!key) throw new Error("Object key is required");

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    return true;
  }

  /**
   * Checks if an object exists in R2 without reading the payload.
   */
  async objectExists({ key }) {
    if (!key) return false;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      // If permissions/network error, rethrow
      throw error;
    }
  }

  /**
   * Retrieves object metadata (ContentLength, ContentType, ETag, LastModified).
   */
  async getObjectMetadata({ key }) {
    if (!key) throw new Error("Object key is required");

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return {
      contentLength: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
      etag: response.ETag ? response.ETag.replace(/"/g, "") : null,
      lastModified: response.LastModified || new Date(),
    };
  }

  /**
   * Returns public CDN URL if configured.
   */
  getPublicUrl({ key }) {
    if (!key) return null;
    if (!this.publicUrl) return null;
    return `${this.publicUrl}/${key.replace(/^\/+/, "")}`;
  }
}

module.exports = R2StorageService;
