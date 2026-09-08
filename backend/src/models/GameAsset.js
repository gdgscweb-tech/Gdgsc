// backend/src/models/GameAsset.js

const mongoose = require("mongoose");
const storageConfig = require("../config/storageConfig");

const PartSchema = new mongoose.Schema(
  {
    partNumber: {
      type: Number,
      required: true,
    },
    etag: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
    },
  },
  { _id: false },
);

const GameAssetSchema = new mongoose.Schema(
  {
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: storageConfig.types,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: storageConfig.categories,
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    version: {
      type: String,
      trim: true,
      default: null,
    },
    checksum: {
      type: String, // ETag or sha256 hash
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "uploading", "ready", "failed", "deleted"],
      default: "pending",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    uploadId: {
      type: String,
      default: null, // For tracking active multipart uploads
    },
    parts: {
      type: [PartSchema],
      default: [],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  },
);

// Compound indexes for efficient lookup
GameAssetSchema.index({ game: 1, status: 1 });
GameAssetSchema.index({ game: 1, category: 1, status: 1 });
GameAssetSchema.index({ game: 1, version: 1 });

const GameAsset =
  mongoose.models.GameAsset || mongoose.model("GameAsset", GameAssetSchema);

module.exports = GameAsset;
