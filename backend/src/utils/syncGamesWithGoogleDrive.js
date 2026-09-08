// Resolves local gameData.json asset paths to files uploaded under Drive/games.

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const GoogleDriveStorageService = require("../services/storage/GoogleDriveStorageService");

const GAMES_DIR = path.resolve(__dirname, "../games");
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const LOCAL_ASSET_PREFIX = "/api/games/assets/";

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const listChildren = async (token, parentId) => {
  const files = [];
  let pageToken;

  do {
    const response = await axios.get(`${DRIVE_API}/files`, {
      params: {
        q: `'${parentId}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,size)",
        pageSize: 1000,
        pageToken,
      },
      headers: authHeaders(token),
    });

    files.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
};

const findDriveTree = async (token, folderId, prefix = "", result = new Map()) => {
  const children = await listChildren(token, folderId);
  for (const child of children) {
    const relativePath = prefix ? `${prefix}/${child.name}` : child.name;
    if (child.mimeType === "application/vnd.google-apps.folder") {
      await findDriveTree(token, child.id, relativePath, result);
    } else {
      result.set(relativePath, child);
    }
  }
  return result;
};

const driveUrlFor = (fileId, value, download = false) => {
  const baseUrl = `/api/assets/drive/${encodeURIComponent(fileId)}`;
  if (!download) return baseUrl;
  return `${baseUrl}?download=true&filename=${encodeURIComponent(path.basename(value))}`;
};

const resolveReference = async ({ value, driveFiles, token, download = false }) => {
  if (typeof value !== "string" || !value.startsWith(LOCAL_ASSET_PREFIX)) {
    return value;
  }

  const relativePath = decodeURIComponent(value.slice(LOCAL_ASSET_PREFIX.length)).replace(/\\/g, "/");
  const file = driveFiles.get(relativePath);
  if (!file) {
    throw new Error(`Drive file not found for local asset: ${relativePath}`);
  }

  return driveUrlFor(file.id, relativePath, download);
};

const main = async () => {
  const storage = new GoogleDriveStorageService();
  const token = await storage.getAccessToken();
  if (!token) throw new Error("Google Drive credentials did not produce an access token");

  const rootChildren = await listChildren(token, storage.folderId);
  const gamesFolder = rootChildren.find(
    (file) =>
      file.name === "games" &&
      file.mimeType === "application/vnd.google-apps.folder",
  );
  if (!gamesFolder) throw new Error("Drive folder does not contain an uploaded games folder");

  const driveFiles = await findDriveTree(token, gamesFolder.id);
  let updatedGames = 0;
  let resolvedAssets = 0;

  const folders = fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const folder of folders) {
    const jsonPath = path.join(GAMES_DIR, folder, "gameData.json");
    if (!fs.existsSync(jsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const resolve = async (value, download = false) => {
      const resolved = await resolveReference({ value, driveFiles, token, download });
      if (resolved !== value) resolvedAssets++;
      return resolved;
    };

    data.image = await resolve(data.image);
    data.screenshots = await Promise.all(
      (Array.isArray(data.screenshots) ? data.screenshots : []).map(resolve),
    );
    data.videos = await Promise.all(
      (Array.isArray(data.videos) ? data.videos : []).map(resolve),
    );
    data.gameLink = await resolve(data.gameLink, true);

    fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
    updatedGames++;
    console.log(`Updated ${folder}`);
  }

  console.log(`Drive URL sync complete: ${updatedGames} game(s), ${resolvedAssets} asset reference(s).`);
};

main().catch((error) => {
  console.error(`Drive URL sync failed: ${error.response?.data?.error?.message || error.message}`);
  process.exitCode = 1;
});
