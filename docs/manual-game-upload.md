# Manual game upload — authoritative admin procedure

This document describes the implemented Google Drive **service-account** workflow. It does not require OAuth, Google Workspace Shared Drives, a new storage provider, or manual MongoDB/JSON editing.

## What the application actually recognizes

Uploading a file into Drive alone does **not** create a game asset. There is no folder watcher, filename crawler or launcher importing builds automatically. Recognition occurs when an authenticated admin registers a pending upload plan in the Game Admin Page.

```text
Game Admin → pending GameAsset + exact instructions
Human Drive upload → copy file ID
Game Admin → register existing file
Backend reads Drive metadata and validates the plan
GameAsset.ready + Game.gameLink/gameFile
Public game API → public download button (only when published)
                         ↓
              gameData.json mirror update attempt
```

The public page reads `Game.gameLink`, with `Game.gameFile` as the package filename. The JSON mirror is not used by the website's download flow. A pending/failed JSON mirror is displayed separately and does not invalidate a verified build registration.

## Environment and exact physical locations

| Environment | MongoDB database | Drive root variable | Observed root name |
|---|---|---|---|
| Development | `dev` | `DEV_STORAGE_ROOT_FOLDER_ID` | `WEB_GAME_ASSETS_DEVELOPMENT` |
| Production | `test` | `PROD_STORAGE_ROOT_FOLDER_ID` | `WEB_GAME_ASSETS` |

The instructions UI obtains the root **ID, name and folder link from the running backend configuration and Drive metadata**. Always follow that generated link; do not select a similarly named folder from search. IDs are authoritative; names can change.

Current binary upload layout is flat:

```text
<configured environment root>/
  <8-random-hex>-<sanitized-filename>.zip
  <8-random-hex>-<sanitized-image-name>.png
  <8-random-hex>-<sanitized-video-name>.mp4
  games/
    <stable Game.gameFolder or Mongo game ID>/
      gameData.json                   # optional legacy mirror
```

The actual backend uploader creates files directly in the environment root using `path.basename(storageKey)`. Its logical key looks like:

```text
games/<Mongo game ID>/files/<normalized version>/<8-hex>-<sanitized filename>
games/<Mongo game ID>/images/<8-hex>-<sanitized filename>
games/<Mongo game ID>/videos/<8-hex>-<sanitized filename>
```

**Do not create those logical files/images/videos directories for manual binaries.** They describe GameAsset identity and storage metadata, not the Drive parent hierarchy. Manual registration verifies the file is a direct child of the exact root.

Legacy imported assets can exist in `games/<gameFolder>/...`; they are distinct historical imports. Existing production files are not moved by this feature.

## Admin checklist

1. Open **Admin → Game Management**, select/create a game, and save its metadata. New games are drafts. Confirm the selected title and slug.
2. Open **Manual Game Build Upload**. Choose build, thumbnail, banner, screenshot or video/trailer. For a build, enter a source filename including extension and a version such as `v1.0.0`.
3. For a new version choose **New asset / version**. For a replacement select the exact ready asset being replaced. The replacement selector carries the old build version so same-version replacement is explicit.
4. Click **Generate exact upload instructions**. This creates a `pending` GameAsset plan, not a ready file. The checklist shows environment, root name/variable/link, selected game ID/slug, exact physical folder, exact expected filename, category/type, normalized version, MIME types and application visibility.
5. Use your normal Drive account to open the generated root link. It must have upload access. Upload directly into that root.
6. Rename the uploaded file to the exact generated filename, including the random prefix and extension. Copy the displayed name rather than reconstructing it. For example, the source `My Build.zip` may become `9f82c141-my-build.zip`; each plan gets its own prefix.
7. Keep Drive sharing **Restricted**. The configured service account email is displayed in the checklist. It must be able to read/download the file, normally through inherited root access. Do not enable “Anyone with the link.” Human upload access and backend service-account access are separate requirements.
8. From the Drive file's link, copy the portion after `/file/d/` and before `/view`. For a link `https://drive.google.com/file/d/FILE_ID/view`, enter only `FILE_ID`. Do not paste a folder ID, whole URL or the logical storage key.
9. Click **Register existing Drive build/asset**. The backend verifies the real Drive file before readiness. It does not trust client-supplied filename, MIME, size, ownership or publication state.
10. After success, check the current build filename/version/status in Game Admin. Save any remaining metadata and review publication checks. Click **Publish saved game** explicitly when ready. A registered build is retained when the game is unpublished.

Closing/reopening the editor does not lose a plan: use **Resume a pending registration**. A plan generated in a different environment/root is rejected. Asset identity uses the stable Mongo game ID, so title/slug changes do not silently reassign a build.

## Filename, version and MIME requirements

- The exact Drive filename is generated by the existing `generateStorageKey`/`sanitizeFilename` logic. It lowercases/sanitizes the basename, limits it to 64 characters, preserves a supported lowercase extension and prefixes eight random hex characters.
- Manual version input must be 1–32 characters using alphanumeric segments separated by dots, dashes or underscores, with no spaces, slashes or traversal. The existing `sanitizeVersion` normalizes case and adds a `v` prefix. Use `v1.0.0`, `v1.0.1`, etc.; the checklist displays the actual stored value.
- Build category/type: `build` / `file`. `version` is required by the manual plan for file assets. Thumbnail/banner/screenshot type is `image`; trailer type is `video` and has no version.
- Supported build extensions come from storageConfig: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.exe`, `.dmg`, `.pkg`, `.apk`, `.iso`, `.bin`. The configured MIME allowlist also applies. The UI displays the extension-specific MIME list, including the `application/octet-stream` fallback Drive may report.
- For `.zip`, accepted MIME is `application/zip`, `application/x-zip-compressed`, or `application/octet-stream`. A renamed image or Google Doc is not accepted as a ZIP build based only on client input.
- Size must be nonzero, a valid integer and within the existing type limit (default 5GB builds, 20MB images, 500MB video; environment overrides remain effective). The backend reads size from Drive.
- Do not convert the binary into a Google Docs/Sheets file. The server cannot prove that game executable contents belong to the selected title; it verifies the explicit plan, root, filename, available Drive metadata and association.

## Backend verification and exact MongoDB fields

Admins do not enter these in MongoDB. They are written by the existing AssetService.

| GameAsset field | Source/meaning |
|---|---|
| `game` | Selected Game `_id`, server-resolved |
| `type` | storageConfig category mapping (`file`, `image`, `video`) |
| `category` | Validated selected role |
| `originalFilename` | Actual Drive `name` after registration |
| `storageKey` | Existing generated logical key, unique per plan |
| `mimeType` | Actual Drive `mimeType` |
| `fileSize` | Actual Drive `size` |
| `version` | Server-normalized plan version; null for presentation media |
| `checksum` | Drive `md5Checksum` when supplied |
| `status` | `pending` at preparation; `ready` only after validation; failed attachment is marked `failed` |
| `visibility` | `private` for builds, `public` for presentation assets at application level |
| `uploadedBy` | Authenticated registering admin's `_id` |
| `metadata.driveFileId` | Verified actual Drive ID |
| `metadata.publicUrl` | `/api/assets/<assetId>/content` |
| `metadata.role` | Category |
| `metadata.manualRegistration` | Marks a server-issued manual plan |
| `metadata.expectedDriveFilename` | Exact filename tied to the plan |
| `metadata.environment`, `rootFolderId` | Environment/root captured when instructions were generated |
| `metadata.replacesAssetId` | Optional validated predecessor |

Registration checks that the plan belongs to the selected game and current environment; Drive file exists, is readable, not trashed, downloadable, in the exact root, has the planned filename, valid MIME/size, and does not conflict with recorded Drive game/storage-key properties. Google may return 404 both for missing and inaccessible files; the error accurately describes both possibilities.

An already registered file produces a conflict. A partial unique index on `metadata.driveFileId` prevents two records from claiming the same file across games. Build version conflicts are checked again inside the per-game mutation lock. Existing filename/size/MIME values supplied in a registration request are ignored: registration accepts the Drive ID for a previously generated plan.

After validation, the same game-reference machinery used by normal uploads sets:

- build → `Game.gameLink=/api/assets/<id>/content?download=true` and `Game.gameFile=<Drive filename>`;
- thumbnail → `Game.image`;
- banner → `Game.banner`;
- screenshot/trailer → ordered `Game.screenshots` / `Game.videos` arrays, replacing at the old position when requested.

The backend streams the selected build from Drive. A public request requires a live parent game; older private versions remain admin-only. Unpublishing preserves all files and registrations, but direct public access returns 404.

## New version, replacement and removal

- **New version:** generate a new build plan with a new version, upload a distinct file, register it. It becomes the selected download. Previous versions remain manageable.
- **Same-version replacement:** select the old ready build in the replacement selector, prepare new instructions, upload a distinct new Drive file using the new expected name, and register it. The old record is archived after the new game reference is saved. Its Drive file is retained.
- **Presentation replacement:** choose its category and predecessor. Registration preserves collection position; thumbnail/banner use their single slot.
- **Removal:** use existing Remove/Delete controls. They detach game references and retain Drive storage for recovery. Unpublishing is not deletion.
- Never overwrite an existing registered binary in place: Drive IDs are the registered file identity. Upload a new file and use replacement to preserve rollback and avoid stale content.

## gameData.json: no manual JSON editing

Existing contract is one object per game containing `title`, `description`, `fullStory`, `genre`, `developer`, `image`, ordered `screenshots` and `videos`, `gameLink`, `platforms`, `gameFolder`, `gameFile`, `info.players/year`, `isFeatured`, `isActive`; optional `banner` follows the existing Game model. Build version lives in GameAsset, not a new JSON field. The repository has no launcher/runtime consumer of Drive JSON; the website reads MongoDB APIs.

GameDataService regenerates the mirror on registration and other game/asset/publication mutations. If the service account cannot create a new file due to quota, registration still succeeds and `Game.gameDataSync.status=pending` contains the setup/retry message. This is visible in admin.

To establish a writable mirror **without changing service-account authentication**:

1. Download **generated gameData.json** from the admin panel. Do not edit its contents.
2. Using your normal Drive account, create/open `games/<the displayed stable gameFolder>/` inside the same environment root.
3. Upload that generated file there once, named exactly `gameData.json`. It must be human-owned and editable by the service account. Do not create duplicate exactly named folders/files.
4. Click **Retry JSON synchronization**. Backend updates the existing file with current MongoDB/GameAsset data. Later mutations automatically attempt the same update.
5. Confirm status **synced**. If it remains pending, check Editor access and the displayed error. Editing an existing human-owned file is subject to Drive permissions/quota policies; successful live verification is still required in this environment.

The manifest folder is different from the flat binary parent. Existing duplicate production manifests are reported and not arbitrarily renamed/deleted. Unknown external JSON consumers must be verified separately.

## APIs

All routes use existing authentication/admin authorization:

- `POST /api/games/:gameId/assets/manual-instructions` — `{category, filename, version?, replacesAssetId?}` creates the pending plan and returns exact instructions.
- `GET /api/games/:gameId/assets/manual/:assetId` — resume instructions.
- `POST /api/games/:gameId/assets/manual/:assetId/register` — `{driveFileId}` verifies/registers the file.
- `GET /api/games/:id/game-data/download` — generated JSON download for bootstrap, no Drive write.
- Existing `POST /api/games/:id/game-data/sync` retries the mirror.

## What not to do

Do not upload development files to production; do not infer paths from a slug; do not create binary subfolders from storageKey; do not hand-edit MongoDB, JSON, ready status, IDs or size; do not make Drive files public; do not register one file against multiple games; do not reuse a plan for a different game/root; do not rename/move/overwrite a registered file behind the admin workflow; do not run legacy disk import to overwrite admin changes.

## Verification status and concrete development fixture

The real development plan was generated successfully against MongoDB `dev` and the existing service-account-accessible development root:

- Game: `6aa7070efe46e5ea43636ddf` (Vault verification fixture).
- Pending asset: `6aa70b9aa88c0196750f654c`.
- Root: `WEB_GAME_ASSETS_DEVELOPMENT`, ID `1e31CIMXxTtZtzJ0N3iNRkyWKemzQQgff`.
- Exact binary filename: `1b285349-verification-v1-0-0.zip`.
- Version: `v1.0.0`.
- Local fixture: `backend/manual-upload-fixtures/1b285349-verification-v1-0-0.zip` (tiny ZIP test package, not a playable game).
- Generated bootstrap JSON: `backend/manual-upload-fixtures/gameData.json`.
- Full plan/evidence: `backend/manual-upload-verification.json`.

The available Drive browser account (`gdgsc.web@gmail.com`) received “You need access” for the development root. No access request was sent and no permissions were changed. Manual Drive upload and live registration/public download acceptance remain pending an account with access. This is a browser account/folder permission issue, not a reason to change backend authentication.

Automated verification covers instructions, metadata authority, ready status, game/build/JSON synchronization, wrong root/name/MIME, inaccessible/missing ID, duplicate registration/version, replacement, cross-environment/game rejection and database failure. See the final response for the latest test/build totals. Production data was not modified.


## Development verification update — 2026-09-14

The user selected a replacement development root and shared it with the existing service account. DEV_STORAGE_ROOT_FOLDER_ID is now `1e31CIMXxTtZtzJ0N3iNRkyWKemzQQgff`; production configuration was not changed. Browser upload of `48a148fa-verification-v1-0-0.zip` succeeded. Backend registration against MongoDB dev created ready asset `6aa70ebb2dfac43e778d66d1`, verified Drive file `1MpbkQn1QEgJ6PDuJpBT-XuViEdBiMrMd`, and set the backend download URL on the game. Registration was exercised through the service, not the Admin UI.

The generated JSON was uploaded once through the human Drive account into `games/6aa7070efe46e5ea43636ddf/gameData.json`. The backend then successfully updated that existing file with the service account. A fresh Drive read verified that its gameLink matches MongoDB and isActive is false. JSON file ID: `19SEAMNj8Xo1MfJulzjkdBCTbhzAUp6AM`. No production files were modified. The ZIP is an empty test archive; gameplay and the complete browser publish/download/unpublish chain remain unverified. Earlier fixture IDs above are historical; use newly generated Admin instructions for every new upload.
