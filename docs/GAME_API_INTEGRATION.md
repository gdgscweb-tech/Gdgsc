# Game Assets & File Storage API Integration Guide

Comprehensive integration contract and API reference for the **GDGSC Game Assets & File Storage API** powered by **Google Drive** (with Cloudflare R2 alternative support) and **MongoDB**.

---

## 1. Architecture & Core Principles

```text
                    ┌─────────────────────────┐
                    │      Frontend Client    │
                    └───────────┬─────────────┘
                                │
          1. Request Resumable  │  3. Direct Binary Transfer
             Upload / Download  │     (Upload: PUT / Download: GET)
                                ▼
  ┌─────────────────────────────┐        ┌─────────────────────────────┐
  │         Backend API         │        │        Google Drive         │
  │   - Auth / Admin Guards     │        │   (Object Storage Engine)   │
  │   - MIME & Size Validation  ├───────►│  - Game Builds (.zip/.exe)  │
  │   - Resumable URL Generator │ Direct │  - Screenshots / Covers     │
  │   - Metadata DB & Lifecycle │ Access │  - Trailers & Video Media   │
  └─────────────────────────────┘        └─────────────────────────────┘
```

### Core Design Rules

1. **Zero Backend Proxying**: The backend never receives large binary files (5GB+ builds) in Node.js memory. All binary uploads and downloads go directly between the browser client and Google Drive / Storage.
2. **Resumable Upload Sessions**: Client initiates an upload request with backend metadata validation, receives a direct Google Drive Resumable Upload session URI, and uploads directly via HTTP `PUT`.
3. **Public vs. Private Assets**:
   - **Public**: Screenshots, covers, trailers can be streamed or embedded directly via Google Drive CDN (`https://lh3.googleusercontent.com/d/:id` for images) without expiring tokens.
   - **Private**: Game builds or prereleases require authentication and generate direct authorized download URLs.
4. **State Verification**: Assets transition through `pending` / `uploading` $\rightarrow$ `ready` only after backend verifies file completion in Google Drive via `objectExists` and `getObjectMetadata`.

---

## 2. API Endpoints Reference

All responses adhere to the standard GDGSC response envelope:
- **Success**: `{ "success": true, "data": { ... } }`
- **Error**: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }`

---

### Games Management

#### List Games
```http
GET /api/games?genre=Racing&search=cyber&isFeatured=true
```

#### Get Game Detail by ID or Slug
```http
GET /api/games/:gameId
```

#### Create Game (Admin)
```http
POST /api/games
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "title": "Chrono Drift",
  "description": "Fast-paced arcade drifter",
  "genre": "Racing",
  "developer": "GDGSC Studios",
  "image": "https://lh3.googleusercontent.com/d/YOUR_COVER_FILE_ID"
}
```

---

### Game Asset Upload (Direct Resumable Upload)

Used for images, videos, and game builds.

#### Step 1: Request Upload URL from Backend
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
    "uploadUrl": "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=...",
    "storageKey": "games/chrono-drift/files/v1.0.0/a1b2c3d4-game-v1.0.0.zip",
    "expiresIn": 900
  }
}
```

#### Step 2: Client Uploads Directly to Google Drive
```http
PUT <uploadUrl>
Content-Type: application/zip

<binary file payload>
```

#### Step 3: Complete & Verify Upload
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

#### Get Download / Direct Access URL
```http
GET /api/assets/:assetId/url?download=true
Authorization: Bearer <TOKEN>   # (Required if asset is private)
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "url": "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID",
    "expiresIn": 3600,
    "isPublic": false,
    "filename": "game-v1.0.0.zip"
  }
}
```

---

### Large File Chunked Multipart Upload

For builds above 20MB up to 5GB+:

1. **Start**: `POST /api/games/:gameId/assets/multipart/start`
2. **Sign Part**: `POST /api/assets/:assetId/multipart/sign` with `{ "partNumber": 1 }`
3. **Upload Chunk**: Client executes `PUT <presignedUrl>` with `Content-Range: bytes START-END/TOTAL`.
4. **Complete**: `POST /api/assets/:assetId/multipart/complete` with `{ "parts": [...] }`
5. **Abort (if cancelled)**: `POST /api/assets/:assetId/multipart/abort`

---

## 3. Frontend Integration Example

```typescript
import api from "./api";
import axios from "axios";

export async function uploadGameBuild({
  gameId,
  file,
  version,
  onProgress,
}: {
  gameId: string;
  file: File;
  version: string;
  onProgress?: (pct: number) => void;
}) {
  // 1. Request direct upload URL from backend
  const initRes = await api.post(`/api/games/${gameId}/assets/upload`, {
    filename: file.name,
    contentType: file.type || "application/zip",
    size: file.size,
    type: "file",
    category: "build",
    version,
    visibility: "private",
  });

  const { assetId, uploadUrl } = initRes.data.data;

  // 2. Direct upload to Google Drive
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

  // 3. Complete and verify with backend
  const completeRes = await api.post(`/api/assets/${assetId}/complete`);
  return completeRes.data.data.asset;
}
```

---

## 4. Environment Configuration

### Backend (`backend/.env`)

```env
# Storage Provider: google_drive (default) | r2
STORAGE_PROVIDER=google_drive

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
GOOGLE_DRIVE_CLIENT_EMAIL=your_service_account@project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Or OAuth2 Refresh Token:
GOOGLE_DRIVE_REFRESH_TOKEN=your_oauth_refresh_token
```

