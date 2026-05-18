// backend/src/controllers/gamesController.js

const Game = require('../models/Games');
const Category = require('../models/Category');
const asyncHandler = require('express-async-handler');

// ==================== GAME CONTROLLERS ====================

// @desc    Get all games (with optional genre/search filtering)
// @route   GET /api/games
// @access  Public
exports.getGames = asyncHandler(async (req, res) => {
    const { genre, search } = req.query;
    let filter = { isActive: true };

    // Filter by genre if provided
    if (genre) {
        filter.genre = { $regex: new RegExp(`^${genre}$`, 'i') };
    }

    // Text search if provided
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    const games = await Game.find(filter).sort({ createdAt: -1 });
    res.status(200).json(games);
});

// @desc    Get a single game by ID
// @route   GET /api/games/:id
// @access  Public
exports.getGameById = asyncHandler(async (req, res) => {
    const game = await Game.findById(req.params.id);

    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }

    res.status(200).json(game);
});

// @desc    Get featured games
// @route   GET /api/games/featured
// @access  Public
exports.getFeaturedGames = asyncHandler(async (req, res) => {
    const games = await Game.find({ isFeatured: true, isActive: true })
        .sort({ createdAt: -1 })
        .limit(5);
    res.status(200).json(games);
});

// @desc    Create a new game
// @route   POST /api/games
// @access  Private/Admin
exports.createGame = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        fullStory,
        genre,
        developer,
        image,
        screenshots,
        gameLink,
        info,
        isFeatured,
        isActive,
    } = req.body;

    // Validation
    if (!title || !description || !genre || !developer || !image || !gameLink) {
        res.status(400);
        throw new Error('Please provide all required fields: title, description, genre, developer, image, gameLink');
    }

    // Parse info if it comes as a string
    let parsedInfo = info;
    if (typeof info === 'string') {
        try {
            parsedInfo = JSON.parse(info);
        } catch (err) {
            parsedInfo = { players: '0', year: new Date().getFullYear().toString() };
        }
    }

    // Parse screenshots if it comes as a string
    let parsedScreenshots = screenshots;
    if (typeof screenshots === 'string') {
        try {
            parsedScreenshots = JSON.parse(screenshots);
        } catch (err) {
            parsedScreenshots = [];
        }
    }

    const game = await Game.create({
        title: title.trim(),
        description: description.trim(),
        fullStory: fullStory ? fullStory.trim() : '',
        genre: genre.trim(),
        developer: developer.trim(),
        image,
        screenshots: Array.isArray(parsedScreenshots) ? parsedScreenshots : [],
        gameLink,
        info: parsedInfo || { players: '0', year: new Date().getFullYear().toString() },
        isFeatured: Boolean(isFeatured),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json(game);
});

// @desc    Update a game
// @route   PUT /api/games/:id
// @access  Private/Admin
exports.updateGame = asyncHandler(async (req, res) => {
    const game = await Game.findById(req.params.id);

    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }

    const {
        title,
        description,
        fullStory,
        genre,
        developer,
        image,
        screenshots,
        gameLink,
        info,
        isFeatured,
        isActive,
    } = req.body;

    // Update only provided fields
    if (title !== undefined) game.title = title.trim();
    if (description !== undefined) game.description = description.trim();
    if (fullStory !== undefined) game.fullStory = fullStory.trim();
    if (genre !== undefined) game.genre = genre.trim();
    if (developer !== undefined) game.developer = developer.trim();
    if (image !== undefined) game.image = image;
    if (gameLink !== undefined) game.gameLink = gameLink;
    if (isFeatured !== undefined) game.isFeatured = Boolean(isFeatured);
    if (isActive !== undefined) game.isActive = Boolean(isActive);

    if (screenshots !== undefined) {
        let parsedScreenshots = screenshots;
        if (typeof screenshots === 'string') {
            try { parsedScreenshots = JSON.parse(screenshots); } catch (e) { parsedScreenshots = []; }
        }
        game.screenshots = Array.isArray(parsedScreenshots) ? parsedScreenshots : [];
    }

    if (info !== undefined) {
        let parsedInfo = info;
        if (typeof info === 'string') {
            try { parsedInfo = JSON.parse(info); } catch (e) { /* keep existing */ }
        }
        if (parsedInfo && typeof parsedInfo === 'object') {
            game.info = { ...game.info.toObject(), ...parsedInfo };
        }
    }

    const updatedGame = await game.save();
    res.status(200).json(updatedGame);
});

// @desc    Delete a game
// @route   DELETE /api/games/:id
// @access  Private/Admin
exports.deleteGame = asyncHandler(async (req, res) => {
    const game = await Game.findById(req.params.id);

    if (!game) {
        res.status(404);
        throw new Error('Game not found');
    }

    await game.deleteOne();
    res.status(200).json({ message: `Game "${game.title}" removed successfully` });
});


// ==================== CATEGORY CONTROLLERS ====================

// @desc    Get all categories (auto-derived from game genres + manual ones)
// @route   GET /api/games/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
    // First try the Category collection
    let categories = await Category.find({ isActive: true }).sort({ name: 1 });

    // If no manual categories exist, auto-derive from game genres
    if (categories.length === 0) {
        const games = await Game.find({ isActive: true });
        const genreMap = {};

        games.forEach(game => {
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

    res.status(200).json(categories);
});

// @desc    Create a new category
// @route   POST /api/games/categories
// @access  Private/Admin
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, image } = req.body;

    if (!name || !image) {
        res.status(400);
        throw new Error('Please provide both name and image for the category');
    }

    // Check for duplicates
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
        res.status(400);
        throw new Error(`Category "${name}" already exists`);
    }

    const category = await Category.create({
        name: name.trim(),
        image,
    });

    res.status(201).json(category);
});

// @desc    Update a category
// @route   PUT /api/games/categories/:id
// @access  Private/Admin
exports.updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    const { name, image, isActive } = req.body;

    if (name !== undefined) category.name = name.trim();
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    const updatedCategory = await category.save();
    res.status(200).json(updatedCategory);
});

// @desc    Delete a category
// @route   DELETE /api/games/categories/:id
// @access  Private/Admin
exports.deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    await category.deleteOne();
    res.status(200).json({ message: `Category "${category.name}" removed successfully` });
});
