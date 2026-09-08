# Cloudflare R2 Game Assets & File Storage API

Production-ready, high-performance object storage and asset management API for game builds (`.zip`, `.rar`, `.7z`, installers), images (`.png`, `.jpg`, `.webp`), videos (`.mp4`, `.webm`), and metadata using **Cloudflare R2** and **MongoDB**.

---

## Table of Contents

1. [Architecture & Design Principles](#architecture--design-principles)
2. [Cloudflare R2 Setup](#cloudflare-r2-setup)
3. [Bucket CORS Configuration](#bucket-cors-configuration)
4. [Environment Variables](#environment-variables)
5. [Storage Structure](#storage-structure)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
   - [Games API](#games-api)
   - [Asset Upload (Single Presigned URL)](#asset-upload-single-presigned-url)
   - [Asset Download & Serving](#asset-download--serving)
   - [Multipart Upload (Large Game Files)](#multipart-upload-large-game-files)
8. [Frontend Integration Examples](#frontend-integration-examples)
9. [Running Tests](#running-tests)

---

## Architecture & Design Principles

```text
                    ┌─────────────────────────┐
                    │      Frontend Client    │
                    └───────────┬─────────────┘
                                │
          1. Request Presigned  │  3. Direct Binary Transfer
             Upload / Download  │     (Upload: PUT / Download: GET)
                                ▼
  ┌─────────────────────────────┐        ┌─────────────────────────────┐
  │         Backend API         │        │        Cloudflare R2        │
  │   - Auth / Admin Guards     │        │    (S3-Compatible Storage)  │
  │   - MIME & Size Validation  ├───────►│  - Game Builds (5GB+)       │
  │   - Presigned URL Generator │ Signed │  - Screenshots / Banners    │
  │   - Metadata DB & Status    │  URL   │  - Trailers & Video Media   │
  └─────────────────────────────┘        └─────────────────────────────┘
```

### Core Rules

- **Zero Backend Proxying**: The backend never receives large binary files in memory or proxies downloads.
- **Presigned URLs**: Direct client-to-R2 transfers for both single uploads and multipart chunks.
- **Public vs. Private Assets**:
  - **Public**: Screenshots, covers, trailers can be served directly through Cloudflare R2 Custom Domain / CDN without repeated signed URLs.
  - **Private**: Game builds, prerelease builds, internal assets require authentication and generate short-lived (1 hour) presigned GET URLs.
- **State Verification**: Assets transition through `pending` / `uploading` $\rightarrow$ `ready` only after backend verifies object existence in R2 via `HeadObject`.

---

## Cloudflare R2 Setup

1. **Log in to Cloudflare Dashboard** and navigate to **R2** in the sidebar.
2. Click **Create bucket** and name it `gdgsc-game-assets` (or your preferred name).
3. Under **R2** > **Manage R2 API Tokens**, click **Create API Token**:
   - **Permissions**: `Object Read & Write`
   - **Apply to**: Specific bucket (`gdgsc-game-assets`) or All buckets
   - **TTL**: Optional expiration or permanent
4. Copy:
   - **Account ID** (found on R2 overview page)
   - **Access Key ID**
   - **Secret Access Key**
5. _(Optional for Public Assets)_ Under Bucket Settings > **Public Access**, enable **Custom Domain** (e.g. `assets.gdgsc.tech`) or **R2.dev subdomain**.

---

## Bucket CORS Configuration

To allow browser clients to upload directly to R2 using presigned PUT URLs, configure CORS on the bucket:

In Cloudflare Dashboard: **Bucket** > **Settings** > **CORS Policy** > **Edit JSON**:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://www.gdgsc.tech",
      "https://gdgsc.tech",
      "https://www.gdgsc.dev",
      "https://gdgsc.dev"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Environment Variables

Add the following to your `backend/.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=gdgsc-game-assets
R2_PUBLIC_URL=https://pub-yourbucketid.r2.dev

# Storage Limits & Expiry (Optional)
MAX_FILE_SIZE_GAME_BYTES=5368709120   # 5 GB
MAX_FILE_SIZE_VIDEO_BYTES=524288000   # 500 MB
MAX_FILE_SIZE_IMAGE_BYTES=20971520    # 20 MB
PRESIGNED_UPLOAD_EXPIRY_SECONDS=900    # 15 minutes
PRESIGNED_DOWNLOAD_EXPIRY_SECONDS=3600 # 1 hour
MULTIPART_THRESHOLD_BYTES=20971520     # 20 MB
```

---

## Storage Structure

Object keys in R2 follow deterministic, sanitized paths:

```text
games/{gameId}/files/{version}/{uniquePrefix}-{sanitizedFilename}
games/{gameId}/images/{uniquePrefix}-{sanitizedFilename}
games/{gameId}/videos/{uniquePrefix}-{sanitizedFilename}
games/{gameId}/assets/{uniquePrefix}-{sanitizedFilename}
```

### Examples:

- `games/cyber-racer/files/v1.0.0/a1b2c3d4-cyber-racer-win64.zip`
- `games/cyber-racer/images/e5f6g7h8-cover-banner.webp`
- `games/cyber-racer/videos/9i0j1k2l-gameplay-trailer.mp4`

---

## Database Schema

### `Game` Model

| Field            | Type     | Description                              |
| :--------------- | :------- | :--------------------------------------- |
| `id` / `_id`     | ObjectId | Unique identifier                        |
| `title` / `name` | String   | Game display title                       |
| `slug`           | String   | URL-friendly unique identifier (indexed) |
| `description`    | String   | Short synopsis                           |
| `fullStory`      | String   | Extended lore & narrative                |
| `genre`          | String   | Genre category                           |
| `developer`      | String   | Student dev / studio name                |
| `image`          | String   | Cover artwork URL                        |
| `platforms`      | [String] | Supported OS / platforms                 |
| `isFeatured`     | Boolean  | Highlight in store spotlight             |
| `isActive`       | Boolean  | Visibility status                        |

### `GameAsset` Model

| Field              | Type                                                                             | Description                      |
| :----------------- | :------------------------------------------------------------------------------- | :------------------------------- |
| `id` / `_id`       | ObjectId                                                                         | Unique asset identifier          |
| `game`             | ObjectId (Ref: Game)                                                             | Associated game                  |
| `type`             | Enum (`file`, `image`, `video`)                                                  | Asset media type                 |
| `category`         | Enum (`build`, `thumbnail`, `banner`, `screenshot`, `trailer`, `asset`, `other`) | Semantic category                |
| `originalFilename` | String                                                                           | Original client filename         |
| `storageKey`       | String                                                                           | Cloudflare R2 object key         |
| `mimeType`         | String                                                                           | Validated MIME type              |
| `fileSize`         | Number                                                                           | File size in bytes               |
| `version`          | String                                                                           | Semantic version (e.g. `v1.0.0`) |
| `checksum`         | String                                                                           | ETag / hash from R2              |
| `status`           | Enum (`pending`, `uploading`, `ready`, `failed`, `deleted`)                      | Upload lifecycle status          |
| `visibility`       | Enum (`public`, `private`)                                                       | Public CDN vs. Signed GET        |
| `uploadId`         | String                                                                           | Active multipart upload ID       |
| `parts`            | Array                                                                            | Multipart parts metadata         |

---

## API Reference

All responses follow the unified envelope:

- **Success**: `{ "success": true, "data": { ... } }`
- **Error**: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }`

---

### Games API

#### 1. List Games

```http
GET /api/games?genre=Racing&search=cyber&isFeatured=true
```

#### 2. Get Game by ID or Slug

```http
GET /api/games/:gameId
```

#### 3. Create Game (Admin)

```http
POST /api/games
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "title": "Chrono Drift",
  "description": "Fast-paced arcade drifter",
  "genre": "Racing",
  "developer": "GDGSC Studios",
  "image": "https://cdn.gdgsc.dev/games/chrono-drift/images/banner.webp"
}
```

#### 4. Update Game (Admin)

```http
PATCH /api/games/:gameId
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "isFeatured": true,
  "description": "Updated description"
}
```

#### 5. Delete Game (Admin)

```http
DELETE /api/games/:gameId
Authorization: Bearer <ADMIN_TOKEN>
```

---

### Asset Upload (Single Presigned URL)

Used for images, videos, and builds under 20MB.

#### Step 1: Request Upload URL

```http
POST /api/games/:gameId/assets/upload
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "filename": "game-v1.0.0.zip",
  "contentType": "application/zip",
  "size": 15728640,
  "type": "file",
  "category": "build",
  "version": "1.0.0",
  "visibility": "private"
}
```

**Response (`201 Created`):**

```json
{
  "success": true,
  "data": {
    "assetId": "66d0a1b2c3d4e5f678901234",
    "uploadUrl": "https://gdgsc-game-assets.r2.cloudflarestorage.com/games/chrono-drift/files/v1.0.0/a1b2c3d4-game-v1.0.0.zip?X-Amz-Algorithm=...",
    "storageKey": "games/chrono-drift/files/v1.0.0/a1b2c3d4-game-v1.0.0.zip",
    "expiresIn": 900
  }
}
```

#### Step 2: Upload Directly to R2

```http
PUT <uploadUrl>
Content-Type: application/zip

<binary file content>
```

#### Step 3: Complete Upload Verification

```http
POST /api/assets/:assetId/complete
Authorization: Bearer <ADMIN_TOKEN>
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "message": "Asset upload verified and ready",
    "asset": {
      "id": "66d0a1b2c3d4e5f678901234",
      "status": "ready",
      "fileSize": 15728640,
      "checksum": "d41d8cd98f00b204e9800998ecf8427e"
    }
  }
}
```

---

### Asset Download & Serving

#### Get Asset Download / Stream URL

```http
GET /api/assets/:assetId/url?download=true
Authorization: Bearer <TOKEN>   # (Required if asset is private)
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "url": "https://gdgsc-game-assets.r2.cloudflarestorage.com/games/chrono-drift/files/v1.0.0/build.zip?X-Amz-Algorithm=...&response-content-disposition=attachment...",
    "expiresIn": 3600,
    "isPublic": false,
    "filename": "game-v1.0.0.zip"
  }
}
```

---

### Multipart Upload (Large Game Files)

Recommended for files $> 20\text{ MB}$ up to $5\text{ GB}$.

#### 1. Start Multipart Upload

```http
POST /api/games/:gameId/assets/multipart/start
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "filename": "large-game-installer.exe",
  "contentType": "application/x-msdownload",
  "size": 1073741824,
  "type": "file",
  "category": "build",
  "version": "1.0.0"
}
```

**Response (`201 Created`):**

```json
{
  "success": true,
  "data": {
    "assetId": "66d0a1b2c3d4e5f678905678",
    "uploadId": "ibR1F5z3V_bZ...",
    "storageKey": "games/chrono-drift/files/v1.0.0/a1b2c3d4-large-game-installer.exe",
    "partSizeRecommendation": 10485760
  }
}
```

#### 2. Sign Part

```http
POST /api/assets/:assetId/multipart/sign
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "partNumber": 1
}
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "partNumber": 1,
    "presignedUrl": "https://gdgsc-game-assets.r2.cloudflarestorage.com/...?partNumber=1&uploadId=..."
  }
}
```

_Client executes: `PUT <presignedUrl>` with chunk bytes, and captures the `ETag` response header._

#### 3. Complete Multipart Upload

```http
POST /api/assets/:assetId/multipart/complete
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "parts": [
    { "partNumber": 1, "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"" },
    { "partNumber": 2, "etag": "\"b10a8db164e0754105b7a99be72e3fe5\"" }
  ]
}
```

#### 4. Abort Multipart Upload (if canceled or error)

```http
POST /api/assets/:assetId/multipart/abort
Authorization: Bearer <ADMIN_TOKEN>
```

---

## Frontend Integration Examples

### Example 1: Single File Upload with Axios

```typescript
import axios from "axios";

async function uploadGameAsset({
  gameId,
  file,
  category,
  version,
  token,
  onProgress,
}: {
  gameId: string;
  file: File;
  category: "build" | "banner" | "screenshot" | "trailer";
  version?: string;
  token: string;
  onProgress?: (pct: number) => void;
}) {
  // Determine asset type
  const type = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "file";

  // 1. Request presigned upload URL from backend
  const initRes = await axios.post(
    `/api/games/${gameId}/assets/upload`,
    {
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      type,
      category,
      version,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const { assetId, uploadUrl } = initRes.data.data;

  // 2. Upload directly to Cloudflare R2
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

  // 3. Notify backend that upload completed
  const completeRes = await axios.post(
    `/api/assets/${assetId}/complete`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return completeRes.data.data.asset;
}
```

### Example 2: Large File Chunked Multipart Upload

```typescript
import axios from "axios";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks

async function uploadLargeGameBuild({
  gameId,
  file,
  version,
  token,
  onProgress,
}: {
  gameId: string;
  file: File;
  version: string;
  token: string;
  onProgress?: (pct: number) => void;
}) {
  // 1. Start multipart upload
  const startRes = await axios.post(
    `/api/games/${gameId}/assets/multipart/start`,
    {
      filename: file.name,
      contentType: file.type || "application/zip",
      size: file.size,
      type: "file",
      category: "build",
      version,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const { assetId } = startRes.data.data;
  const totalParts = Math.ceil(file.size / CHUNK_SIZE);
  const uploadedParts: { partNumber: number; etag: string }[] = [];

  try {
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // 2. Get signed URL for this part
      const signRes = await axios.post(
        `/api/assets/${assetId}/multipart/sign`,
        { partNumber },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const { presignedUrl } = signRes.data.data;

      // 3. Upload chunk to R2
      const partUploadRes = await axios.put(presignedUrl, chunk);
      const etag =
        partUploadRes.headers["etag"] || partUploadRes.headers["ETag"];

      uploadedParts.push({ partNumber, etag });

      if (onProgress) {
        onProgress(Math.round((partNumber / totalParts) * 100));
      }
    }

    // 4. Complete multipart upload
    const completeRes = await axios.post(
      `/api/assets/${assetId}/multipart/complete`,
      { parts: uploadedParts },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return completeRes.data.data.asset;
  } catch (err) {
    // If upload fails, abort to clean up partial parts in R2
    await axios.post(
      `/api/assets/${assetId}/multipart/abort`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    throw err;
  }
}
```

---

## Running Tests

Run the complete test suite with Jest:

```bash
cd backend
npm test
```

### Test Coverage includes:

- `tests/storage.test.js`: Filename sanitization, version normalization, key generator, R2 service methods.
- `tests/games.test.js`: Game CRUD, slug auto-generation, filtering, and authorization guards.
- `tests/assets.test.js`: Single upload lifecycle, MIME/size validations, upload completion verification, public/private access rules.
- `tests/multipart.test.js`: Multipart upload start, part signing, completion, and abort flows.
