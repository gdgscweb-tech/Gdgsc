# Game media and manual registration

The authoritative procedure is [Manual game upload](../../../docs/manual-game-upload.md).

Use Game Admin → Manual Game Build Upload to generate the exact environment root,
filename, version, category/type and MIME requirements. Upload using your Drive account,
then register the file ID in the admin UI. Uploading a file alone does not create a GameAsset.

Binaries are currently flat files directly under the environment root. Their `games/...`
storage keys are logical metadata, not physical directories to create. Legacy imported
folders and per-game gameData.json copies are distinct from this binary upload convention.

The website reads MongoDB APIs and Game.gameLink. Generated gameData.json is a legacy
mirror; the admin panel can download it for one-time human-owned setup without hand editing.
Subsequent registrations and game mutations attempt to update the mirror through the
existing service account. Pending synchronization is reported in admin.

Local gameData files are legacy imports. loadGames now skips existing games so admin
changes are not overwritten, and imported games start as drafts. Do not use disk imports
as the day-to-day administration workflow.
