# Game management and publishing audit — 14 September 2026

Status: audit retained as historical context. The user's subsequent manual-upload instruction supersedes the initial requirement to block all mutations on JSON writes. The authoritative current procedure is [Manual game upload](manual-game-upload.md). Backend service-account-first authentication and environment roots remain unchanged. Registration/publication uses MongoDB as authority; failed optional JSON mirror writes are reported as pending. No production MongoDB or Drive data was modified.

## Audit evidence and original contract

The workspace already contained extensive uncommitted changes. Those were preserved. The audit covered Game/Games, GameAsset, gameService, assetService, game/asset controllers and routes, storageConfig, GoogleDriveStorageService, storage interfaces/factory, db configuration, server feature gates, seed/load/URL-sync/image-optimization scripts, GameAdminPanel, AdminPage, Gamepage, GameDetailPage, Gamescard, Banner, DetailCarousel, preview adapters, API URL resolution and the service worker. Repository searches covered gameData, publication/state terminology, build fields, storage keys, Drive IDs, game paths and caches.

| Question | Original behavior |
|---|---|
| What is live? | Game.isActive=true. There was no independent disabled state. |
| Public listing | GET /api/games filtered isActive=true; GET /api/games/featured also filtered isFeatured=true. Auto-derived categories used active games. |
| Admin listing | GET /api/games/admin?isActive=all removed the active filter, but the frontend loaded only the first 100 records. |
| Publish | Generic PATCH set isActive=true without publication validation. Creation defaulted to live. A metadata checkbox could also publish. |
| Unpublish | Generic PATCH set isActive=false. Assets and builds were retained, but public detail still returned the game. |
| Detail | GET /api/games/:id ignored isActive. The frontend detail component used the game object retained from its initial listing. |
| Build | GameAsset supported category=build and version. Uploading did not populate Game.gameLink/gameFile. Builds defaulted to private, and their download URLs did not supply authenticated Drive access. |
| Assets | Upload completion updated presentation arrays. The admin requested status=all, which backend interpreted as literal status "all", returning no matching assets. Reorder silently omitted missing assets, did not validate category, and admin reload sorted by creation time. |
| Drive on publication | No write. |
| JSON on publication | No generation or synchronization. |
| Caching | Gamepage fetched once. Drive proxy used 30-day immutable responses, a nonexpiring in-memory cache and cache-first service worker. Raw Drive proxy accepted arbitrary IDs accessible to backend credentials. |
| Other gates | ENABLE_GAMES can disable all game routes; it defaults off in production unless explicitly enabled. isFeatured affects presentation, not publication. |

Additional root causes: Drive session/upload failures created simulated records with mock-* IDs; the seed/JSON import workflow could overwrite admin edits; the legacy URL-sync script accidentally treated array indices as its download flag; pending uploads and the new game URL fields were not coordinated as a publishing lifecycle.

## Actual Drive audit (read-only)

Development root contained an empty `games` folder and an empty `events` folder before verification. It contained no gameData.json. The existing backend uploader uses flat files under the environment root, with logical `properties.storageKey` values such as `games/<gameId>/images/<unique>-name.png` or `games/<gameId>/files/<version>/<unique>-build.zip`. Logical storage keys are not physical nested directories.

The production root is named `WEB_GAME_ASSETS`. Existing manifests were read at `WEB_GAME_ASSETS/games/<gameFolder>/gameData.json`. The five game names are Car goes brr, Char Parchi, ClashGo, Flappy, and Orb Of Valor. The audit returned two manifest entries for each of the first four games and one for Orb Of Valor. These may require folder/file duplicate reconciliation; the generator refuses ambiguous folder/file names. Nothing was renamed, overwritten or deleted there.

The actual Drive manifests still contain `/api/games/assets/<gameFolder>/<file>` paths. Repository versions have already been rewritten to `/api/assets/drive/<fileId>` paths. This confirms that the old upload → rewrite-local-JSON → import-Mongo workflow does not keep the Drive copies synchronized.

There are 25 legacy references outside the development root and 11 GameAsset records with nonexistent mock-* file IDs in development. The ancestry of the Car Goes Brr thumbnail was explicitly verified to end at the production root WEB_GAME_ASSETS. Other foreign references were not copied or mutated. See `backend/development-verification.json` for the development inventory.

## Existing gameData.json contract

Per-game object, not a global manifest:

```json
{
  "title": "Game title",
  "description": "Short description",
  "fullStory": "Long description",
  "genre": "Action",
  "developer": "GDGSC",
  "image": "/api/assets/<thumbnailAssetId>/content",
  "screenshots": ["/api/assets/<screenshotAssetId>/content"],
  "videos": ["/api/assets/<videoAssetId>/content"],
  "gameLink": "/api/assets/<buildAssetId>/content?download=true",
  "platforms": ["Windows"],
  "gameFolder": "stable-folder-name",
  "gameFile": "game.zip",
  "info": { "players": "1", "year": "2026" },
  "isFeatured": false,
  "isActive": false
}
```

`banner` is emitted as an optional URL when present, matching the existing Game model/loader/public UI. `gameFile` is null without a selected package. Build versions remain in GameAsset; the legacy JSON schema has no version field. It also has no separate disabled field, slug, database IDs, upload statuses, credentials or synchronization internals. `isActive=false` represents all nonpublic states to this legacy format. Arrays preserve the explicit saved order. Field ordering and formatting are deterministic; no generated timestamp changes the JSON bytes.

Only the local loadGames importer is a repository consumer of gameData.json. No frontend or external launcher/runtime consumer of a Drive manifest was found. The website uses MongoDB-backed APIs. Compatibility with an unprovided external launcher cannot be claimed.

## Implemented lifecycle

- `isActive=true && isDisabled!==true` is live. `isActive=false,isDisabled=false` is draft/unpublished. `isDisabled=true` forces inactive. Existing missing isDisabled values retain their prior meaning.
- Create produces a draft. Generic metadata requests cannot set publication fields. Explicit admin publication actions are publish, unpublish, disable and enable. Enable returns to draft and never republishes implicitly.
- Publishing requires title, usable slug, description, genre, developer and thumbnail. Slug uniqueness is checked against other records. Selected managed references must belong to the same game and category, be ready, and exist in the selected environment's storage. Presentation assets must have application public visibility. External HTTP(S) links and existing local files remain supported; external host availability is not actively probed.
- Banner falls back to thumbnail in the public UI. Builds/game links, screenshots, videos, platforms and release year are optional because existing public showcase titles support a disabled play button and optional detail information.
- Admin shows server validation results for saved changes before Publish is enabled. Save metadata first, then publish explicitly.
- Public list, featured, category derivation, detail, asset listing, managed media and selected build downloads enforce visibility. Unpublished direct detail/build requests return 404. Admin has a separate detail endpoint and retains editing access.
- All admin pages of results are loaded. Asset listing understands status=all. Refresh after upload, reorder and state changes uses fresh backend metadata, preventing stale form fields from restoring old asset URLs.

## Mutation and failure handling

GameService.mutate serializes operations using a MongoDB per-game lock and heartbeat. It validates, attempts a JSON mirror write through GameDataService, then saves MongoDB. A mirror-only failure is recorded as pending and does not reject valid admin work; this reflects the subsequent manual-upload requirement and the absence of a public JSON consumer. JSON is private; public APIs remain backed by MongoDB. If the write/save fails, previous JSON is restored. If restoration also fails, the MongoDB game is made inactive, with gameDataSync.status=error and existing metadata/assets preserved. A quota-only mirror failure now leaves a successfully saved draft with pending synchronization. DRAFT_SYNC_FAILED applies when the coordinated mutation itself fails.

This is a compensating workflow, not a distributed transaction: Google Drive and MongoDB cannot commit together. Lock ownership is checked before remote writes and MongoDB save. Heartbeats prevent normal concurrent recovery. Admin can retry synchronization, or recover an interrupted lock after at least two minutes without a heartbeat; recovery rebuilds from persisted MongoDB data. A process or network pause around an external write still has distributed-system uncertainty and requires reconciliation. No system can revoke a file already downloaded or a legacy file shared directly outside the backend.

Deletion first writes inactive JSON and hides the game, then marks GameAsset records deleted and removes the Game. Drive media/builds and the inactive JSON tombstone are retained for recovery. Unpublish does not delete or archive any asset. Storage cleanup is deliberately not part of publication.

## Assets and builds

Uploads use the existing GameAsset/AssetService/storage flow. Real upload completion is verified; there is no simulated success. Drive files remain private at Drive level and are streamed by backend asset routes with range support. Admin previews use short-lived, asset-scoped signed links. Public access to the selected private build is authorized by the live parent Game and its current gameLink; unselected private versions remain admin-only.

A successful build sets gameLink and gameFile. New version uploads retain older versions. Selecting an existing ready build updates the current download fields. Individual replacement uploads a new file first, swaps the reference at the existing collection position, then archives the old record while retaining its Drive file. Failed replacement preserves the old game reference. Removing the last required thumbnail from a live game requires unpublishing first. Removing a build clears the link/file fields; a showcase game may remain live.

Admin supports thumbnail/banner replace/remove, screenshot/video add/remove/replace/reorder, build filename/version/status, replacement, removal and version selection. URL text fields retain management of legacy presentation references; their line order is saved. Folder identity is stable after creation so title/slug edits do not relocate manifests. New games default to their Mongo ID as folder identity and logical asset-key identity.

## JSON storage and triggers

Generated JSON: `<environment root>/games/<stable gameFolder>/gameData.json`. Legacy gameFolder names are retained. New games use a Mongo-ID folder by default. Exactly named folders/files are reused; ambiguous duplicates are rejected and require reconciliation before deployment for affected games. New JSON content+metadata is uploaded together; existing content is PATCHed through the same GoogleDriveStorageService client.

Backend generation occurs after create, metadata edits, presentation changes, gallery reorder, build upload/selection/replacement/removal, publish, unpublish, disable, enable, explicit sync/recovery and deletion (inactive tombstone). No rendering-triggered generation exists. Inactive JSON omits references that cannot be verified, while retaining the original Mongo fields for admin repair. Live games cannot publish with those references.

## Environment and security

| Runtime | Mongo database | Drive root variable |
|---|---|---|
| development | dev | DEV_STORAGE_ROOT_FOLDER_ID |
| production | test | PROD_STORAGE_ROOT_FOLDER_ID |
| automated test | gdgsc_test (mocked in lifecycle tests) | TEST_STORAGE_ROOT_FOLDER_ID (or injected mock storage) |

The existing database selection and event Cloudinary isolation were not changed. Drive root IDs must be distinct. Parent ancestry is checked before game file access or destructive Drive methods; a short 30-second positive cache avoids repeated ancestry requests. Game IDs and managed references are validated server-side. Authentication/admin middleware covers every mutation, publication, synchronization and recovery endpoint. Raw Drive proxy access requires a linked game asset or an explicit existing team-image allowlist. No credentials go to frontend code.

Drive authentication retains the existing service-account-first order. No OAuth or Shared Drive setup was introduced. The later manual workflow uses human-owned uploads and backend registration. S3-style multipart endpoints fail explicitly for Drive; use backend upload-file. R2 multipart operations remain provider-specific, but publishing JSON currently requires Google Drive storage.

## Caching

Game APIs use no-store. Managed game assets and game Drive proxy responses enforce visibility before streaming and use no-store. The service worker cache version is bumped and excludes game API/asset traffic, preserving static/team-image caching. Public Gamepage reloads on window focus and every 30 seconds, refreshes the selected game, and handles all listing pages. Local legacy asset serving also requires a live referencing game; JSON files are not exposed through the static asset route. New replacement uploads receive new asset IDs/URLs. Existing external CDN caching cannot be invalidated by this backend.

## Added API surface

- GET /api/games/admin/:id — admin detail.
- GET /api/games/:id/publication — publishability and missing fields.
- POST /api/games/:id/publication — explicit action.
- POST /api/games/:id/game-data/sync — synchronize current data.
- POST /api/games/:id/game-data/recover — recover a stale interrupted operation.
- Existing upload-file accepts replacesAssetId, validated against game/category.
- Existing reorder validates complete permutations and preserves legacy URL positions.

New service: backend/src/services/gameDataService.js. Existing gameService is the publication/mutation coordinator; no parallel storage client was introduced.

## Files touched for this task

Backend: server.js; src/models/Game.js; src/config/storageConfig.js; src/controllers/gamesController.js; src/controllers/assetController.js; src/routes/gamesRoutes.js; src/services/gameService.js; src/services/gameDataService.js (new); src/services/assetService.js; src/services/storage/GoogleDriveStorageService.js; src/utils/loadGames.js; src/utils/syncGamesWithGoogleDrive.js; tests/games.test.js; tests/assets.test.js; tests/googleDriveStorage.test.js; scripts/verify-game-lifecycle.js (new); development-verification.json (generated evidence).

Frontend: src/Pages/admin/GameAdminPanel.js; src/Pages/Gamepage.js; src/utils/gamePreviewAdapter.js; src/services/api.js; public/service-worker.js.

Documentation: this report and backend/src/games/README.md. Other preexisting workspace changes are not claimed as work from this task.

## Verification and remaining acceptance work

Latest completed backend run: 10 suites, 133 tests passed. Includes a real Express/auth/controller HTTP integration with mocked MongoDB/Drive boundaries: publish → generated JSON → public detail/build → unpublish → 404 → admin still editable. It also covers metadata/asset/build/order changes, state distinctions, reference ownership, environment roots, failure compensation and authorization.

Frontend production build compiled successfully before final UI recovery refinements; final rerun result is recorded in the final response.

Live development verification used only MongoDB dev and DEV_STORAGE_ROOT_FOLDER_ID. It created draft `6aa7070efe46e5ea43636ddf`, then stopped because Drive returned 403 storageQuotaExceeded. Google states that the service account has no storage quota. The subsequent diagnostic retry failed for the same reason. The fixture was left unpublished and editable; no production test writes were made. Small empty game-folder structures may exist in the development root from the attempted creation; no successful gameData content upload is claimed.

Therefore thumbnail/banner/gallery/video/build upload, browser playback, actual public download and the live publish → Drive → JSON → public UI chain are NOT accepted yet. A valid video fixture is also needed for the script's video portion. The current script is an API/Drive integration check, not a substitute for final browser interaction with the admin and public pages.

## Deployment prerequisites / limitations

1. Follow the current manual-upload procedure. An account with access to the development root must upload the generated fixture and optionally the generated JSON bootstrap. Keep the existing service-account authentication.
2. Re-upload development assets through admin. Existing production references/mock IDs were reported, not copied or repaired by mutating production.
3. Reconcile duplicate production gameData folder/file entries before enabling writes for those games. The generator intentionally does not rename/delete or arbitrarily choose existing production files. This is a deployment blocker for affected legacy games.
4. Set NODE_ENV=production, ENABLE_GAMES=true, STORAGE_PROVIDER=google_drive and the correct PROD_STORAGE_ROOT_FOLDER_ID; preserve the existing MongoDB test mapping. The existing service account must retain access to the production root independently. No automatic production backfill was run; admin synchronization writes each game when ready.
5. Review preexisting duplicate slugs before deployment. Publication checks slug uniqueness, but the existing nonunique slug index remains; simultaneous publication of different games with the same slug is a remaining race without a reviewed unique-index migration.
6. R2-only configurations cannot perform the required Drive JSON synchronization and receive an explicit error. Large backend uploads remain subject to hosting request-size/time limits; no claim of a successful 5GB upload is made.
7. There is no evidence of an external launcher consuming Drive JSON. Such a consumer's private-file access, URL resolution and refresh behavior need separate verification if it exists.
8. Recovering a crashed distributed mutation is compensating reconciliation, not cross-system ACID. Review sync errors before republishing. Replacement archival failure can leave an old ready record, but retains the valid new reference and reports a server warning.
