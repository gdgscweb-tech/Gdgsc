// backend/src/controllers/gamesController.js

const Game = require('../models/Game');
const Category = require('../models/Category');
const GameAsset = require('../models/GameAsset');
const asyncHandler = require('express-async-handler');
const gameService = require('../services/gameService');
const { sendSuccess, sendError, ApiError } = require('../utils/apiResponse');

// ==================== GAME CONTROLLERS ====================

/**
 * @desc    Get all games (with optional genre/search filtering)
 * @route   GET /api/games
 * @access  Public
 */
exports.getGames = asyncHandler(async (req, res) => {
    const { genre, search, isFeatured, page, limit } = req.query;

    const result = await gameService.getGames({
        genre,
        search,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
        isActive: true,
        page,
        limit,
    });

    // For backwards-compatibility with frontend expecting array directly:
    // If Accept header is application/json without strict envelope request, return array directly if requested
    // or standard envelope. Let's return the standard games array when called from legacy frontend or envelope if query envelope=true.
    // To ensure full backward compatibility with both legacy frontend `gamesRes.data` array and REST envelope clients,
    // let's attach the games array or response.
    if (req.query.envelope === 'true') {
        return sendSuccess(res, result.games, 200, { total: result.total, page: result.page, pages: result.pages });
    }

    // Default returns array directly so existing frontend (Gamepage.js) works seamlessly
    return res.status(200).json(result.games);
});

/**
 * @desc    Get a single game by ID or slug
 * @route   GET /api/games/:id
 * @access  Public
 */
exports.getGameById = asyncHandler(async (req, res) => {
    const game = await gameService.findGameByIdOrSlug(req.params.id);

    if (!game) {
        throw new ApiError(404, 'GAME_NOT_FOUND', `Game with ID or slug '${req.params.id}' not found`);
    }

    // Include ready public assets for this game
    const assets = await GameAsset.find({
        game: game._id,
        status: 'ready',
        visibility: 'public',
    }).select('-parts -uploadId');

    const gameObj = game.toObject();
    gameObj.assets = assets;

    if (req.query.envelope === 'true') {
        return sendSuccess(res, gameObj, 200);
    }

    return res.status(200).json(gameObj);
});

/**
 * @desc    Get featured games
 * @route   GET /api/games/featured
 * @access  Public
 */
exports.getFeaturedGames = asyncHandler(async (req, res) => {
    const games = await Game.find({ isFeatured: true, isActive: true })
        .sort({ createdAt: -1 })
        .limit(5);

    if (req.query.envelope === 'true') {
        return sendSuccess(res, games, 200);
    }

    return res.status(200).json(games);
});

/**
 * @desc    Create a new game
 * @route   POST /api/games
 * @access  Private/Admin
 */
exports.createGame = asyncHandler(async (req, res) => {
    const game = await gameService.createGame(req.body);

    if (req.query.envelope === 'true') {
        return sendSuccess(res, game, 201);
    }

    return res.status(201).json(game);
});

/**
 * @desc    Update a game
 * @route   PATCH /api/games/:id
 * @route   PUT /api/games/:id
 * @access  Private/Admin
 */
exports.updateGame = asyncHandler(async (req, res) => {
    const updatedGame = await gameService.updateGame(req.params.id, req.body);

    if (req.query.envelope === 'true') {
        return sendSuccess(res, updatedGame, 200);
    }

    return res.status(200).json(updatedGame);
});

/**
 * @desc    Delete a game
 * @route   DELETE /api/games/:id
 * @access  Private/Admin
 */
exports.deleteGame = asyncHandler(async (req, res) => {
    const result = await gameService.deleteGame(req.params.id);

    if (req.query.envelope === 'true') {
        return sendSuccess(res, result, 200);
    }

    return res.status(200).json(result);
});


// ==================== CATEGORY CONTROLLERS ====================

/**
 * @desc    Get all categories (auto-derived from game genres + manual ones)
 * @route   GET /api/games/categories
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
    // First try the Category collection
    let categories = await Category.find({ isActive: true }).sort({ name: 1 });

    // If no manual categories exist, auto-derive from game genres
    if (categories.length === 0) {
        const games = await Game.find({ isActive: true });
        const genreMap = {};

        games.forEach((game) => {
            if (game.genre && !genreMap[game.genre]) {
                genreMap[game.genre] = {
                    _id: game.genre.toLowerCase().replace(/\s+/g, '-'),
                    name: game.genre,
                    image: game.image, // Use the first game's cover as category image
                    isActive: true,
                };
            }
        });

        categories = Object.values(genreMap).sort((a, b) => a.name.localeCompare(b.name));
    }

    if (req.query.envelope === 'true') {
        return sendSuccess(res, categories, 200);
    }

    return res.status(200).json(categories);
});

/**
 * @desc    Create a new category
 * @route   POST /api/games/categories
 * @access  Private/Admin
 */
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, image } = req.body;

    if (!name || !image) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Please provide both name and image for the category');
    }

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
        throw new ApiError(400, 'DUPLICATE_CATEGORY', `Category "${name}" already exists`);
    }

    const category = await Category.create({
        name: name.trim(),
        image,
    });

    if (req.query.envelope === 'true') {
        return sendSuccess(res, category, 201);
    }

    return res.status(201).json(category);
});

/**
 * @desc    Update a category
 * @route   PUT /api/games/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const { name, image, isActive } = req.body;

    if (name !== undefined) category.name = name.trim();
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    const updatedCategory = await category.save();

    if (req.query.envelope === 'true') {
        return sendSuccess(res, updatedCategory, 200);
    }

    return res.status(200).json(updatedCategory);
});

/**
 * @desc    Delete a category
 * @route   DELETE /api/games/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    await category.deleteOne();

    const response = { message: `Category "${category.name}" removed successfully` };
    if (req.query.envelope === 'true') {
        return sendSuccess(res, response, 200);
    }

    return res.status(200).json(response);
});
