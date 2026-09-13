const { ApiError } = require('../utils/apiResponse');
const { getDefaultStorageService } = require('./storage/storageFactory');

// Same per-game document consumed by loadGames; never serialize database internals.
const buildGameData = (game) => ({
  title: game.title || '',
  description: game.description || '',
  fullStory: game.fullStory || '',
  genre: game.genre || '',
  developer: game.developer || '',
  image: game.image || '',
  ...(game.banner ? { banner: game.banner } : {}),
  screenshots: (game.screenshots || []).filter(Boolean),
  videos: (game.videos || []).filter(Boolean),
  gameLink: game.gameLink || '',
  platforms: (game.platforms || []).filter(Boolean),
  gameFolder: game.gameFolder || String(game._id),
  gameFile: game.gameFile || null,
  info: { players: game.info?.players || '1', year: game.info?.year || '' },
  isFeatured: Boolean(game.isFeatured),
  isActive: game.isActive === true && game.isDisabled !== true,
});

class GameDataService {
  build(game) { return buildGameData(game); }
  serialize(game) { return JSON.stringify(this.build(game), null, 2) + '\n'; }
  async prepare(game, storage = getDefaultStorageService()) {
    const safe = this.build(game);
    if (!safe.isActive) {
      const validate = require('./gameService').validateReference.bind(require('./gameService'));
      for (const [field, category] of [['image','thumbnail'],['banner','banner'],['gameLink','build']]) {
        if (safe[field] && safe[field] !== '#') {
          try { await validate(game, category, safe[field], storage); } catch { safe[field] = ''; }
        }
      }
      for (const [field, category] of [['screenshots','screenshot'],['videos','trailer']]) {
        const urls = [];
        for (const url of safe[field]) { try { await validate(game, category, url, storage); urls.push(url); } catch {} }
        safe[field] = urls;
      }
    }
    return safe;
  }
  async generate(game, storage = getDefaultStorageService()) {
    if (typeof storage.writeGameData !== 'function') {
      throw new ApiError(503, 'GAME_DATA_STORAGE_UNAVAILABLE', 'Game data synchronization requires Google Drive storage.');
    }
    const safe = await this.prepare(game, storage);
    try { return await storage.writeGameData({
      gameId: String(game._id),
      folderName: game.gameFolder || String(game._id),
      content: JSON.stringify(safe, null, 2) + "\n",
    }); } catch (error) {
      const quota = error.response?.data?.error?.errors?.some(item => item.reason === 'storageQuotaExceeded');
      if (quota) throw new ApiError(503, 'GAME_DATA_SETUP_REQUIRED', 'Upload the generated gameData.json once using your Drive account, give the service account Editor access, then retry synchronization. No manual JSON editing is required.');
      throw new ApiError(503, 'GAME_DATA_SYNC_FAILED', error.response?.data?.error?.message || error.message);
    }
  }
}
module.exports = new GameDataService();
module.exports.buildGameData = buildGameData;
