// backend/src/services/gameService.js

const Game = require("../models/Game");
const GameAsset = require("../models/GameAsset");
const { ApiError } = require("../utils/apiResponse");

class GameService {
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
    isActive = true,
    page = 1,
    limit = 50,
  }) {
    const filter = {};

    if (isActive !== undefined && isActive !== null) {
      filter.isActive = isActive;
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

    const skip =
      (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

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

    const game = await Game.create({
      title: title.trim(),
      name: title.trim(),
      slug: data.slug,
      description: data.description.trim(),
      fullStory: data.fullStory ? data.fullStory.trim() : "",
      genre: data.genre.trim(),
      developer: data.developer.trim(),
      image:
        data.image ||
        "https://images.unsplash.com/photo-1542751371-adc38448a05e",
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      videos: Array.isArray(data.videos) ? data.videos : [],
      gameLink: data.gameLink || "",
      platforms: Array.isArray(data.platforms) ? data.platforms : ["Windows"],
      gameFolder: data.gameFolder,
      gameFile: data.gameFile,
      info: data.info || {
        players: "1",
        year: new Date().getFullYear().toString(),
      },
      isFeatured: Boolean(data.isFeatured),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    });

    return game;
  }

  /**
   * Updates an existing game
   */
  async updateGame(identifier, updates) {
    const game = await this.findGameByIdOrSlug(identifier);
    if (!game) {
      throw new ApiError(
        404,
        "GAME_NOT_FOUND",
        `Game '${identifier}' not found`,
      );
    }

    const title = updates.title || updates.name;
    if (title !== undefined) {
      game.title = title.trim();
      game.name = title.trim();
    }
    if (updates.slug !== undefined) game.slug = updates.slug;
    if (updates.description !== undefined)
      game.description = updates.description.trim();
    if (updates.fullStory !== undefined)
      game.fullStory = updates.fullStory.trim();
    if (updates.genre !== undefined) game.genre = updates.genre.trim();
    if (updates.developer !== undefined)
      game.developer = updates.developer.trim();
    if (updates.image !== undefined) game.image = updates.image;
    if (updates.screenshots !== undefined)
      game.screenshots = updates.screenshots;
    if (updates.videos !== undefined) game.videos = updates.videos;
    if (updates.gameLink !== undefined) game.gameLink = updates.gameLink;
    if (updates.platforms !== undefined) game.platforms = updates.platforms;
    if (updates.info !== undefined)
      game.info = { ...game.info, ...updates.info };
    if (updates.isFeatured !== undefined)
      game.isFeatured = Boolean(updates.isFeatured);
    if (updates.isActive !== undefined)
      game.isActive = Boolean(updates.isActive);

    await game.save();
    return game;
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

    // Find all assets associated with this game
    const assets = await GameAsset.find({ game: game._id });

    // Optionally delete objects from R2
    if (storageService) {
      for (const asset of assets) {
        try {
          await storageService.deleteObject({ key: asset.storageKey });
        } catch (err) {
          console.error(
            `Failed to delete storage key '${asset.storageKey}':`,
            err.message,
          );
        }
      }
    }

    await GameAsset.deleteMany({ game: game._id });
    await game.deleteOne();

    return {
      message: `Game "${game.title}" and its assets were removed successfully`,
    };
  }
}

module.exports = new GameService();
