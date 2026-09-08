// backend/src/models/Game.js

const mongoose = require("mongoose");

const generateSlug = (text) => {
  return (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const GameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // name is supported as an alias / field for title
    name: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    fullStory: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      index: true,
    },
    developer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    image: {
      type: String, // Cover image URL (can be R2 public URL or local/external URL)
      required: true,
    },
    screenshots: {
      type: [String],
      default: [],
    },
    videos: {
      type: [String],
      default: [],
    },
    gameLink: {
      type: String, // External link, direct download URL, or placeholder
      default: "",
    },
    platforms: {
      type: [String],
      default: ["Windows"],
    },
    gameFolder: {
      type: String,
      trim: true,
    },
    gameFile: {
      type: String,
      trim: true,
    },
    info: {
      players: {
        type: String,
        default: "1",
      },
      year: {
        type: String,
        default: () => new Date().getFullYear().toString(),
      },
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        // Ensure both name and title are present
        if (!ret.name && ret.title) ret.name = ret.title;
        if (!ret.title && ret.name) ret.title = ret.name;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  },
);

// Auto-populate slug and name before saving
GameSchema.pre("save", function (next) {
  if (!this.name && this.title) {
    this.name = this.title;
  }
  if (!this.title && this.name) {
    this.title = this.name;
  }
  if (!this.slug && (this.title || this.name)) {
    this.slug = generateSlug(this.title || this.name);
  }
  next();
});

// Search and filtering indexes
GameSchema.index({ title: "text", description: "text", developer: "text" });
GameSchema.index({ genre: 1, isActive: 1 });
GameSchema.index({ isFeatured: 1, isActive: 1 });

const Game = mongoose.models.Game || mongoose.model("Game", GameSchema);

module.exports = Game;
