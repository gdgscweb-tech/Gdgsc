// backend/src/services/storage/GoogleDriveStorageService.js

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const IStorageService = require("./IStorageService");
const storageConfig = require("../../config/storageConfig");
const { getStorageRootConfig } = storageConfig;

/**
 * Google Drive Storage Service implementation of IStorageService.
 * Supports:
 *  - Google Drive Resumable Upload sessions
 *  - Service Account JWT authentication
 *  - OAuth2 Refresh Token authentication
 *  - Direct download URLs and Google CDN preview links
 *  - Metadata retrieval, object existence checks, and deletion
 *  - Strict failures; uploads are never simulated
 */
class GoogleDriveStorageService extends IStorageService {
  /**
   * @param {object} [options]
   * @param {string} [options.folderId] - Google Drive Root / Target Folder ID
   * @param {string} [options.clientEmail] - Service Account client email
   * @param {string} [options.privateKey] - Service Account private key (PEM format)
   * @param {string} [options.clientId] - OAuth2 Client ID
   * @param {string} [options.clientSecret] - OAuth2 Client Secret
   * @param {string} [options.refreshToken] - OAuth2 Refresh Token
   * @param {string} [options.publicUrl] - Base public URL
   * @param {import('axios').AxiosInstance} [options.httpClient] - Injected HTTP client
   */
  constructor(options = {}) {
    super();
    const gdConfig = storageConfig.googleDrive || {};
    const rootConfig = options.folderId === undefined ? getStorageRootConfig() : null;
    this.folderId = options.folderId !== undefined ? options.folderId : rootConfig.folderId;
    this.storageEnvironment = options.environment || rootConfig?.environment || "explicit";
    this.storageRootVariable = rootConfig?.variable || "explicit option";
    this.clientEmail = options.clientEmail !== undefined ? options.clientEmail : gdConfig.clientEmail;
    this.privateKey = options.privateKey !== undefined ? options.privateKey : gdConfig.privateKey;
    this.clientId = options.clientId !== undefined ? options.clientId : gdConfig.clientId;
    this.clientSecret = options.clientSecret !== undefined ? options.clientSecret : gdConfig.clientSecret;
    this.refreshToken = options.refreshToken !== undefined ? options.refreshToken : gdConfig.refreshToken;
    this.publicUrl = options.publicUrl !== undefined ? options.publicUrl : gdConfig.publicUrl;
    this.httpClient = options.httpClient || axios;

    // In-memory token cache: { token, expiresAt }
    this._tokenCache = null;
    this._rootChecks = new Map();


  }

  async requireToken() {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Google Drive authentication failed; no files were simulated");
    return token;
  }

  async driveRequest(method, suffix, data, params = {}) {
    const token = await this.requireToken();
    const response = await this.httpClient.request({
      method, url: `https://www.googleapis.com/drive/v3/${suffix}`, data,
      params: { supportsAllDrives: true, ...params },
      headers: { Authorization: `Bearer ${token}` }, timeout: 30000,
    });
    return response.data;
  }

  async listChildren(parentId) {
    const files = [];
    let pageToken;
    do {
      const result = await this.driveRequest('get', 'files', undefined, {
        q: `'${parentId.replace(/'/g, "\\'")}' in parents and trashed = false`,
        fields: 'nextPageToken,files(id,name,mimeType,parents,properties)',
        pageSize: 1000, pageToken, includeItemsFromAllDrives: true,
      });
      files.push(...(result.files || []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return files;
  }

  // Every read/mutation of a referenced game file must stay under this root.
  async assertInRoot(fileId) {
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) throw new Error('Missing or invalid Drive file ID');
    if ((this._rootChecks.get(fileId) || 0) > Date.now()) return true;
    const visited = new Set();
    const visit = async (id) => {
      if (id === this.folderId) return true;
      if (!id || visited.has(id) || visited.size > 50) return false;
      visited.add(id);
      const file = await this.driveRequest('get', `files/${encodeURIComponent(id)}`, undefined,
        { fields: 'id,parents,trashed' });
      if (file.trashed) return false;
      for (const parent of file.parents || []) if (await visit(parent)) return true;
      return false;
    };
    if (!(await visit(fileId))) throw new Error('Drive reference is outside the configured environment root');
    if (this._rootChecks.size > 1000) this._rootChecks.clear();
    this._rootChecks.set(fileId, Date.now() + 30000);
    return true;
  }

  async ensureFolder(parentId, name) {
    if (!name || /[\\/\x00-\x1f]/.test(name) || name === '.' || name === '..') {
      throw new Error('Invalid game folder name');
    }
    const matches = (await this.listChildren(parentId)).filter(f => f.name === name);
    if (matches.length > 1 || (matches[0] && matches[0].mimeType !== 'application/vnd.google-apps.folder')) {
      throw new Error('Ambiguous Drive folder; resolve duplicate names before continuing');
    }
    return matches[0] || this.driveRequest('post', 'files', {
      name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId],
    });
  }

  async getDriveFileDetails(fileId) {
    if (!fileId || !/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
      throw new (require('../../utils/apiResponse').ApiError)(400, 'INVALID_DRIVE_FILE_ID', 'Enter the file ID from the Drive link, not the entire URL.');
    }
    try {
      return await this.driveRequest('get', `files/${encodeURIComponent(fileId)}`, undefined,
        { fields: 'id,name,mimeType,size,md5Checksum,parents,trashed,properties,capabilities(canEdit,canDownload)' });
    } catch (error) {
      const { ApiError } = require('../../utils/apiResponse');
      if (error.response?.status === 404) throw new ApiError(404, 'DRIVE_FILE_UNAVAILABLE', 'Drive file was not found or is not accessible to the backend service account. Check the ID and sharing permissions.');
      if (error.response?.status === 403) throw new ApiError(403, 'DRIVE_FILE_INACCESSIBLE', 'Drive denied the backend service account access to this file. Share the correct folder with the service account.');
      throw new ApiError(503, 'DRIVE_UNAVAILABLE', 'Unable to read Drive metadata. Retry after checking the storage connection.');
    }
  }

  async writeGameData({ gameId, folderName, content }) {
    JSON.parse(content);
    // A deterministic path within the environment root; legacy per-game folder names survive.
    const games = await this.ensureFolder(this.folderId, 'games');
    const folder = await this.ensureFolder(games.id, folderName);
    const matches = (await this.listChildren(folder.id)).filter(f => f.name === 'gameData.json');
    if (matches.length > 1) throw new Error('Multiple gameData.json files found; refusing ambiguous update');
    let file = matches[0];
    if (file?.properties?.gameId && file.properties.gameId !== gameId) {
      throw new Error('Game data folder belongs to another game');
    }
    const token = await this.requireToken();
    if (!file) {
      const boundary = 'gdgsc_' + crypto.randomBytes(12).toString('hex');
      const metadata = { name: 'gameData.json', mimeType: 'application/json', parents: [folder.id],
        properties: { gameId, storageKey: `games/${folderName}/gameData.json` } };
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
      const response = await this.httpClient.post('https://www.googleapis.com/upload/drive/v3/files', body, {
        params: { uploadType: 'multipart', supportsAllDrives: true },
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, timeout: 30000,
      });
      file = response.data;
    } else {
      await this.httpClient.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(file.id)}`,
        content, { params: { uploadType: 'media', supportsAllDrives: true },
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 30000 });
    }

    return { fileId: file.id, folderId: folder.id, storageKey: `games/${folderName}/gameData.json` };
  }

  /**
   * Helper: Extracts file ID from storage key or raw ID.
   */
  extractFileId(key) {
    if (!key) return null;
    if (key.startsWith("gdrive:")) {
      return key.replace(/^gdrive:/, "");
    }
    if (/^[a-zA-Z0-9_-]{25,50}$/.test(key)) {
      return key;
    }
    return key;
  }

  /**
   * Generates a signed JWT and exchanges it for a Google OAuth2 Access Token.
   * Cached until 60 seconds before expiration.
   */
  async getAccessToken() {
    const nowSec = Math.floor(Date.now() / 1000);
    if (this._tokenCache && this._tokenCache.expiresAt > nowSec + 60) {
      return this._tokenCache.token;
    }

    // Existing service-account-first authentication.
    if (this.clientEmail && this.privateKey) {
      try {
        const header = { alg: "RS256", typ: "JWT" };
        const payload = {
          iss: this.clientEmail,
          scope: "https://www.googleapis.com/auth/drive",
          aud: "https://oauth2.googleapis.com/token",
          exp: nowSec + 3600,
          iat: nowSec,
        };

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
        const unsignedToken = `${encodedHeader}.${encodedPayload}`;

        const signer = crypto.createSign("RSA-SHA256");
        signer.update(unsignedToken);
        const signature = signer.sign(this.privateKey, "base64url");
        const jwt = `${unsignedToken}.${signature}`;

        const res = await this.httpClient.post(
          "https://oauth2.googleapis.com/token",
          new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
          }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        );

        const token = res.data.access_token;
        const expiresIn = res.data.expires_in || 3600;
        this._tokenCache = { token, expiresAt: nowSec + expiresIn };
        return token;
      } catch (err) {
        console.warn("[GoogleDrive] Service account token generation failed:", err.message);
      }
    }

    // 2. OAuth2 Refresh Token Authentication
    if (this.clientId && this.clientSecret && this.refreshToken) {
      try {
        const res = await this.httpClient.post(
          "https://oauth2.googleapis.com/token",
          new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
            grant_type: "refresh_token",
          }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        );

        const token = res.data.access_token;
        const expiresIn = res.data.expires_in || 3600;
        this._tokenCache = { token, expiresAt: nowSec + expiresIn };
        return token;
      } catch (err) {
        console.warn("[GoogleDrive] Refresh token exchange failed:", err.message);
      }
    }

    return null;
  }

  /**
   * Generates a Google Drive Resumable Upload session URI.
   */
  async createUploadUrl({
    key,
    contentType,
    size,
    expiresIn = storageConfig.presignedExpiry.upload,
  }) {
    if (!key) throw new Error("Object key is required");
    if (!contentType) throw new Error("Content-Type is required");

    const filename = path.basename(key);
    const token = await this.getAccessToken();

    if (token) {
      const metadata = {
        name: filename,
        properties: { storageKey: key },
      };
      if (this.folderId) {
        metadata.parents = [this.folderId];
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": contentType,
      };
      if (size) {
        headers["X-Upload-Content-Length"] = size.toString();
      }

      try {
        const response = await this.httpClient.post(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
          metadata,
          { headers },
        );

        const resumableSessionUrl =
          response.headers["location"] || response.headers["Location"];
        if (resumableSessionUrl) {
          return resumableSessionUrl;
        }
      } catch (sessionErr) {
        console.warn(
          "[GoogleDrive] Resumable session creation failed:",
          sessionErr.response?.data?.error?.message || sessionErr.message,
        );
      }
    }

    throw new Error("Google Drive upload session failed; upload was not stored");
  }

  /**
   * Uploads a local file through the backend using a Drive resumable session.
   * The browser never receives the Drive session or service-account credentials.
   */
  async uploadFile({ key, filePath, contentType, size }) {
    const token = await this.getAccessToken();

    // Step 1: Create the Drive resumable upload session (returns self-authenticated URL or mock URL)
    const uploadUrl = await this.createUploadUrl({ key, contentType, size });

    if (!token || !uploadUrl) throw new Error("Google Drive upload unavailable");

    try {
      // Step 2: PUT the file stream directly to the resumable session URL.
      const response = await this.httpClient.put(uploadUrl, fs.createReadStream(filePath), {
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          ...(size ? { "Content-Length": String(size) } : {}),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const fileId = response.data?.id || null;
      return { key, fileId, metadata: response.data || null };
    } catch (putErr) {
      const errMsg = putErr.response?.data?.error?.message || putErr.message;
      console.warn(
        `[GoogleDrive] PUT file stream failed (${putErr.response?.status || "ERR"}):`,
        errMsg,
      );
      throw new Error(`Google Drive upload failed: ${errMsg}`);
    }
  }

  async makePublic({ key, fileId }) {
    await this.assertInRoot(fileId || this.extractFileId(key));
    const resolvedFileId = fileId || this.extractFileId(key);
    const token = await this.getAccessToken();
    if (!token || !resolvedFileId || String(resolvedFileId).startsWith("mock-")) {
      return false;
    }

    try {
      await this.httpClient.post(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(resolvedFileId)}/permissions?supportsAllDrives=true`,
        { role: "reader", type: "anyone" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initiates multipart / chunked resumable upload session on Google Drive.
   */
  async createMultipartUpload() { throw new Error('Drive multipart is unsupported; use backend upload-file'); }
  async signPart() { throw new Error('Drive multipart is unsupported; use backend upload-file'); }
  async completeMultipartUpload() { throw new Error('Drive multipart is unsupported; use backend upload-file'); }
  async abortMultipartUpload() { throw new Error('Drive multipart is unsupported; use backend upload-file'); }

  /**
   * Generates a direct Google Drive download or streaming URL.
   */
  async createDownloadUrl({
    key,
    fileId,
    expiresIn = storageConfig.presignedExpiry.download,
    responseContentDisposition,
  }) {
    if (!key) throw new Error("Object key is required");

    const resolvedFileId = fileId || this.extractFileId(key);
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(resolvedFileId)}`;
  }

  /**
   * Deletes a file from Google Drive.
   */
  async deleteObject({ key, fileId }) {
    const id = fileId || this.extractFileId(key);
    await this.assertInRoot(id);
    await this.driveRequest('delete', `files/${encodeURIComponent(id)}`);
    return true;
  }

  async objectExists({ key, fileId }) {
    if (!key) return false;
    try {
      await this.assertInRoot(fileId || this.extractFileId(key));
      return true;
    } catch (error) {
      if (error.response?.status === 404) return false;
      throw error;
    }
  }

  async getObjectMetadata({ key, fileId }) {
    const id = fileId || this.extractFileId(key);
    await this.assertInRoot(id);
    const file = await this.driveRequest('get', `files/${encodeURIComponent(id)}`, undefined,
      { fields: 'id,size,mimeType,md5Checksum,modifiedTime' });
    return { contentLength: Number(file.size) || 0, contentType: file.mimeType,
      etag: file.md5Checksum || null, lastModified: new Date(file.modifiedTime), fileId: file.id };
  }

  /**
   * Streams a private Drive file through the backend without exposing Drive credentials.
   */
  async getFileStream({ fileId, range }) {
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      throw new Error("A valid Google Drive file ID is required");
    }

    const token = await this.getAccessToken();
    if (!token) throw new Error("Google Drive credentials are not configured");

    const headers = { Authorization: `Bearer ${token}` };
    if (range) headers.Range = range;

    return this.httpClient.get(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&alt=media`,
      {
        headers,
        responseType: "stream",
        validateStatus: (status) => status === 200 || status === 206,
      },
    );
  }

  /**
   * Returns a direct public link for viewing or embedding.
   */
  getPublicUrl({ key, fileId }) {
    if (!key) return null;

    const resolvedFileId = fileId || this.extractFileId(key);
    const ext = path.extname(key).toLowerCase();

    if (!resolvedFileId || String(resolvedFileId).startsWith("mock-")) {
      if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext)) {
        return "https://images.unsplash.com/photo-1542751371-adc38448a05e";
      }
      return "https://placehold.co/1200x675/11121a/ffd700?text=ASSET+PREVIEW";
    }

    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
      return `https://lh3.googleusercontent.com/d/${encodeURIComponent(resolvedFileId)}`;
    }

    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(resolvedFileId)}`;
  }
}

module.exports = GoogleDriveStorageService;
