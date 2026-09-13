// backend/src/services/gameService.js

const crypto = require('crypto');
const gameDataService = require('./gameDataService');
const { getDefaultStorageService } = require('./storage/storageFactory');
const Game = require("../models/Game");
const GameAsset = require("../models/GameAsset");
const { ApiError } = require("../utils/apiResponse");

class GameService {
  isLive(game) { return game?.isActive === true && game?.isDisabled !== true; }

  async validatePublication(game, storage = getDefaultStorageService()) {
    const missing = ['title', 'slug', 'description', 'genre', 'developer', 'image']
      .filter(key => !String(game[key] || '').trim());
    if (game.isDisabled) missing.push('Enable game before publishing');
    if (game.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug)) missing.push('Valid slug');
    const duplicate = game.slug && await Game.findOne({ slug: game.slug, _id: { $ne: game._id } });
    if (duplicate) missing.push('Unique slug');
    const references = [
      ['thumbnail', game.image], ['banner', game.banner],
      ...(game.screenshots || []).map(url => ['screenshot', url]),
      ...(game.videos || []).map(url => ['trailer', url]), ['build', game.gameLink],
    ];
    for (const [category, url] of references) {
      if (!url || (url === '#' && category === 'build')) continue;
      try { await this.validateReference(game, category, url, storage); }
      catch (error) { missing.push(`${category}: ${error.message}`); }
    }
    return { publishable: missing.length === 0, missing };
  }

  async validateReference(game, category, url, storage = getDefaultStorageService()) {
    if (String(url).startsWith('/api/games/assets/')) {
      const path = require('path');
      const relative = decodeURIComponent(String(url).slice('/api/games/assets/'.length));
      const root = path.resolve(__dirname, '../games');
      const target = path.resolve(root, relative);
      if (!target.startsWith(root + path.sep) || path.extname(target) === '.json' ||
        !require('fs').existsSync(target) || !require('fs').statSync(target).isFile()) throw new Error('Legacy file is unavailable');
      return;
    }
    const managed = String(url).match(/^\/api\/assets\/([a-f0-9]{24})\/content(?:\?|$)/i);
    if (managed) {
      const asset = await GameAsset.findById(managed[1]);
      if (!asset || String(asset.game) !== String(game._id) || asset.category !== category || asset.status !== 'ready') {
        throw new Error('Missing, unfinished, or mismatched game asset');
      }
      if (category !== 'build' && asset.visibility !== 'public') throw new Error('Presentation asset is private');
      if (storage.assertInRoot) await storage.assertInRoot(asset.metadata?.driveFileId);
      if (!(await storage.objectExists({ key: asset.storageKey, fileId: asset.metadata?.driveFileId }))) throw new Error('File is missing from storage');
      return;
    }
    const drive = String(url).match(/^\/api\/assets\/drive\/([\w-]+)(?:\?|$)/);
    if (drive) {
      if (!storage.assertInRoot) throw new Error('Drive reference requires Drive storage');
      await storage.assertInRoot(drive[1]);
      return;
    }
    let external;
    try { external = new URL(url); } catch { throw new Error('Use an HTTPS URL or a managed asset'); }
    if (external.pathname.startsWith('/api/assets/')) throw new Error('Use a relative backend asset URL');
    if (!['http:', 'https:'].includes(external.protocol)) throw new Error('Unsupported URL scheme');
    if (/googleusercontent\.com$|google\.com$/.test(external.hostname)) throw new Error('Use an environment-checked backend Drive URL');
    const opposite = process.env.NODE_ENV === 'production' ? process.env.DEV_BACKEND_URL : process.env.PROD_BACKEND_URL;
    if (opposite && external.origin === new URL(opposite).origin) throw new Error('Asset belongs to the other environment');
  }

  // Serialize every managed mutation across backend processes. Never steal a lock:
  // a crashed operation requires inspection/reconciliation, not concurrent Drive writes.
  async mutate(identifier, change, storage = getDefaultStorageService(), afterCommit, recover = false) {
    const found = await this.findGameByIdOrSlug(identifier);
    if (!found) throw new ApiError(404, 'GAME_NOT_FOUND', 'Game not found');
    const token = crypto.randomUUID();
    const lockFilter = recover
      ? { _id: found._id, managementLock: { $ne: null }, managementHeartbeat: { $lt: new Date(Date.now() - 120000) } }
      : { _id: found._id, managementLock: null };
    const game = await Game.findOneAndUpdate(lockFilter,
      { $set: { managementLock: token, managementHeartbeat: new Date() } }, { new: true });
    if (!game) throw new ApiError(409, 'GAME_BUSY', 'Another operation is managing this game. Retry after it finishes.');
    let lockLost = false;
    const heartbeat = setInterval(() => {
      Game.updateOne({ _id: game._id, managementLock: token }, { $set: { managementHeartbeat: new Date() } })
        .then(result => { if (result?.matchedCount === 0) lockLost = true; }).catch(() => { lockLost = true; });
    }, 10000);
    heartbeat.unref();
    const checkLock = async () => {
      const result = await Game.updateOne({ _id: game._id, managementLock: token }, { $set: { managementHeartbeat: new Date() } });
      if (lockLost || result?.matchedCount === 0) throw new ApiError(409, 'GAME_LOCK_LOST', 'Operation interrupted; retry synchronization');
    };
    const previous = game.toObject();
    let attemptedWrite = false;
    let committed = false;
    try {
      await change(game);
      if (game.isDisabled) game.isActive = false;
      await game.validate();
      if (this.isLive(game)) {
        const validation = await this.validatePublication(game, storage);
        if (!validation.publishable) throw new ApiError(400, 'NOT_PUBLISHABLE', validation.missing.join('; '), validation);
      }
      await checkLock();
      attemptedWrite = true;
      try {
        const manifest = await gameDataService.generate(game, storage);
        game.gameDataSync = { ...manifest, status: 'synced' };
      } catch (error) {
        // The website uses MongoDB, not this legacy mirror. Keep admin work usable
        // with service-account storage that cannot create human-owned files.
        game.gameDataSync = { ...game.gameDataSync, status: 'pending', message: error.message };
      }
      await checkLock();
      await game.save();
      committed = true;
      if (afterCommit) await afterCommit(game);
      return game;
    } catch (error) {
      if (attemptedWrite && !committed) {
        try { await checkLock(); await gameDataService.generate(previous, storage); }
        catch (rollbackError) {
          // Fail closed if the remote result is uncertain. Metadata and assets remain intact.
          await Game.updateOne({ _id: game._id, managementLock: token }, { $set: {
            isActive: false, gameDataSync: { status: 'error', message: 'Drive synchronization requires retry' },
          } });
        }
      }
      throw error;
    } finally {
      clearInterval(heartbeat);
      await Game.updateOne({ _id: game._id, managementLock: token }, { $unset: { managementLock: '', managementHeartbeat: '' } });
    }
  }

  async setPublication(identifier, action) {
    if (!['publish', 'unpublish', 'disable', 'enable'].includes(action)) throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown publication action');
    return this.mutate(identifier, game => {
      if (action === 'publish') {
        if (game.isDisabled) throw new ApiError(400, 'GAME_DISABLED', 'Enable this game before publishing');
        game.isActive = true;
      } else {
        game.isActive = false;
        if (action === 'disable') game.isDisabled = true;
        if (action === 'enable') game.isDisabled = false;
      }
    });
  }

  /**
   * Finds a game by MongoDB _id or slug
   */
  async findGameByIdOrSlug(identifier) {
    if (!identifier) return null;

    let game = null;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      game = await Game.findById(identifier);
    }

    if (!game) {
      game = await Game.findOne({ slug: identifier });
    }

    return game;
  }

  /**
   * Lists games with optional filters
   */
  async getGames({
    genre,
    search,
    isFeatured,
    // null means "no isActive filter" (admin all-games mode)
    // true/false filters by that value
    // undefined defaults to true (public listing)
    isActive = true,
    page = 1,
    limit = 50,
  }) {
    const filter = {};

    // Only apply isActive filter when it is not null
    if (isActive !== undefined && isActive !== null) {
      filter.isActive = isActive;
      if (isActive) filter.isDisabled = { $ne: true };
    }

    if (genre) {
      filter.genre = { $regex: new RegExp(`^${genre}$`, "i") };
    }

    if (isFeatured !== undefined && isFeatured !== null) {
      filter.isFeatured = isFeatured;
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { developer: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    page = Math.max(1, parseInt(page, 10) || 1);
    const skip = (page - 1) * limitNum;

    const [games, total] = await Promise.all([
      Game.find(filter)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Game.countDocuments(filter),
    ]);

    return {
      games,
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Creates a new game record
   */
  async createGame(data) {
    const title = data.title || data.name;
    if (!title || !data.description || !data.genre || !data.developer) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "title, description, genre, and developer are required",
      );
    }

    if (data.isActive === true) throw new ApiError(400, "EXPLICIT_PUBLISH_REQUIRED", "Create a draft, then use Publish");
    const game = await Game.create({
      title: title.trim(),
      name: title.trim(),
      slug: data.slug,
      description: data.description.trim(),
      fullStory: data.fullStory ? data.fullStory.trim() : "",
      genre: data.genre.trim(),
      developer: data.developer.trim(),
      image:
        data.image || "",
      banner: data.banner || "",
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      videos: Array.isArray(data.videos) ? data.videos : [],
      gameLink: data.gameLink || "",
      platforms: Array.isArray(data.platforms) ? data.platforms : ["Windows"],
      gameFolder: data.gameFolder || undefined,
      gameFile: data.gameFile,
      info: data.info || {
        players: "1",
        year: new Date().getFullYear().toString(),
      },
      isFeatured: Boolean(data.isFeatured),
      isActive: false,
    });

    // Preserve a created draft on remote failure so the admin can retry it.
    try { return await this.mutate(String(game._id), current => {
      if (!current.gameFolder) current.gameFolder = String(current._id);
    }); } catch (error) {
      throw new ApiError(503, 'DRAFT_SYNC_FAILED', `Draft created but Drive sync failed: ${error.message}`, { gameId: String(game._id) });
    }
  }

  /**
   * Updates an existing game
   */
  async updateGame(identifier, updates) {
    if (updates.isActive !== undefined || updates.isDisabled !== undefined) {
      throw new ApiError(400, 'EXPLICIT_PUBLISH_REQUIRED', 'Use the publication endpoint to change visibility');
    }
    return this.mutate(identifier, async game => {
    const title = updates.title || updates.name;
    if (title !== undefined) {
      game.title = title.trim();
      game.name = title.trim();
    }
    if (updates.slug !== undefined) game.slug = updates.slug;
    if (updates.gameFile !== undefined) game.gameFile = updates.gameFile;
    if (updates.gameFolder !== undefined && updates.gameFolder !== game.gameFolder) throw new ApiError(400, "STABLE_FOLDER", "Game folder is stable after creation");
    if (updates.description !== undefined)
      game.description = updates.description.trim();
    if (updates.fullStory !== undefined)
      game.fullStory = updates.fullStory.trim();
    if (updates.genre !== undefined) game.genre = updates.genre.trim();
    if (updates.developer !== undefined)
      game.developer = updates.developer.trim();
    if (updates.image !== undefined) game.image = updates.image;
    if (updates.banner !== undefined) game.banner = updates.banner;
    if (updates.screenshots !== undefined)
      game.screenshots = updates.screenshots;
    if (updates.videos !== undefined) game.videos = updates.videos;
    if (updates.gameLink !== undefined) game.gameLink = updates.gameLink;
    if (updates.platforms !== undefined) game.platforms = updates.platforms;
    if (updates.info !== undefined)
      game.info = { ...game.info, ...updates.info };
    if (updates.isFeatured !== undefined)
      game.isFeatured = Boolean(updates.isFeatured);

    });
  }

  /**
   * Deletes a game and marks its associated assets as deleted
   */
  async deleteGame(identifier, storageService) {
    const game = await this.findGameByIdOrSlug(identifier);
    if (!game) {
      throw new ApiError(
        404,
        "GAME_NOT_FOUND",
        `Game '${identifier}' not found`,
      );
    }

    // Write an inactive tombstone first; retain Drive files for recovery.
    await this.mutate(identifier, current => { current.isActive = false; }, storageService, async current => {
      await GameAsset.updateMany({ game: current._id }, { $set: { status: 'deleted' } });
      await current.deleteOne();
    });

    return {
      message: `Game "${game.title}" and its assets were removed successfully`,
    };
  }
}

module.exports = new GameService();
