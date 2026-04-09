// backend/src/models/Games.js

const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    fullStory: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    genre: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    developer: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    image: {
        type: String, // Cover image URL
        required: true,
    },
    screenshots: {
        type: [String], // Array of screenshot URLs
        default: [],
    },
    gameLink: {
        type: String, // External link to play/download
        required: true,
    },
    platforms: {
        type: [String], // e.g. ["Windows", "Android", "iOS"]
        enum: ['Windows', 'Android', 'iOS', 'macOS', 'Linux', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Web'],
        default: [],
    },
    gameFolder: {
        type: String, // Folder name in /src/games/ e.g. "Car goes brr"
        trim: true,
    },
    gameFile: {
        type: String, // Downloadable file name e.g. "Car_goes_Brrr .rar"
        trim: true,
    },
    info: {
        players: {
            type: String, // e.g. "40k"
            default: '0',
        },
        year: {
            type: String, // e.g. "2021"
            required: true,
        },
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

// Index for genre-based filtering & text search
GameSchema.index({ genre: 1 });
GameSchema.index({ title: 'text', description: 'text' });

const Game = mongoose.model('Game', GameSchema);

module.exports = Game;
