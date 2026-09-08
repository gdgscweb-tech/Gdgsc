// backend/server.js

// Global safety net: prevent unhandled promise rejections (e.g., MongoDB DNS failures)
// from crashing the Heroku dyno. Log them instead.
process.on("unhandledRejection", (reason, promise) => {
  console.error("[unhandledRejection] Unhandled promise rejection:", reason);
  // Do NOT call process.exit() — let the server keep running
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] Uncaught exception:", err.message);
  // Do NOT exit for non-fatal errors; the server may continue to handle requests
});

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const { getMongoUri } = require("./src/config/db");
const cors = require("cors");
const passport = require("passport");
const path = require("path");
const fs = require("fs");
const session = require("express-session"); // Required for Passport OAuth
const MongoStore = require("connect-mongo"); // To store sessions in MongoDB
const errorHandler = require("./src/middleware/errorHandler");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Environment-based configuration
const isProduction = process.env.NODE_ENV === "production";
const gamesFlag = process.env.ENABLE_GAMES;
const isGamesEnabled =
  gamesFlag === "true" || (gamesFlag !== "false" && !isProduction);

const config = {
  frontendUrl: isProduction
    ? process.env.PROD_FRONTEND_URL
    : process.env.DEV_FRONTEND_URL,
  backendUrl: isProduction
    ? process.env.PROD_BACKEND_URL
    : process.env.DEV_BACKEND_URL,
  googleCallbackUrl: isProduction
    ? process.env.PROD_GOOGLE_CALLBACK_URL
    : process.env.DEV_GOOGLE_CALLBACK_URL,
  discordCallbackUrl: isProduction
    ? process.env.PROD_DISCORD_CALLBACK_URL
    : process.env.DEV_DISCORD_CALLBACK_URL,
};

if (process.env.NODE_ENV !== "test") {
  console.log(`Running in ${process.env.NODE_ENV} mode`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log(`Backend URL: ${config.backendUrl}`);
  console.log(`Games feature enabled: ${isGamesEnabled}`);
}

// Passport config
require("./src/config/passport")(passport);

// Connect to database (only if not in test or if test explicitly handles db)
if (process.env.NODE_ENV !== "test") {
  connectDB().catch((err) => {
    console.error("[server] MongoDB connection failed at startup:", err.message);
    // Do not exit — the server continues running so health checks and CORS still work
  });
}

const app = express();

// CORS Middleware - Environment dependent
const allowedOrigins = isProduction
  ? [
      "https://gdgsc.tech",
      "https://www.gdgsc.tech",
      "https://gdgsc.dev",
      "https://www.gdgsc.dev",
      config.frontendUrl, // Include the configured frontend URL
      process.env.PROD_FRONTEND_URL, // Include env variable for safety
    ].filter(Boolean)
  : [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      config.frontendUrl,
      process.env.DEV_FRONTEND_URL,
    ].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies/headers to be sent
  }),
);

// Body parser middleware
app.use(express.json()); // For JSON data
app.use(express.urlencoded({ extended: false })); // For form data

// Session Middleware (needed for Passport.js OAuth flows)
if (process.env.NODE_ENV !== "test") {
  try {
    const mongoUrl = getMongoUri();
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "gdgsc_session_secret",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          mongoUrl: mongoUrl,
          collectionName: "sessions",
          ttl: 14 * 24 * 60 * 60,
          autoRemove: "interval",
          autoRemoveInterval: 10,
        }),
        cookie: {
          maxAge: 1000 * 60 * 60 * 24,
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: "lax",
        },
      }),
    );
  } catch (err) {
    console.warn(`Session store initialization warning: ${err.message}`);
  }
}

// Passport middleware
app.use(passport.initialize());
if (process.env.NODE_ENV !== "test" && process.env.MONGO_URI) {
  app.use(passport.session());
}

// Routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/user", require("./src/routes/userRoutes"));
app.use("/api/events", require("./src/routes/eventRoutes"));
app.use("/api/registrations", require("./src/routes/registrationRoutes"));

// Game Assets & File Storage Routes
app.use("/api/assets", require("./src/routes/assetRoutes"));

if (isGamesEnabled) {
  // Serve legacy local game assets as static fallback if needed
  app.use(
    "/api/games/assets",
    express.static(path.join(__dirname, "src/games")),
  );
  app.use("/api/games", require("./src/routes/gamesRoutes"));
} else {
  app.use("/api/games/assets", (_req, res) => {
    res.status(404).json({ message: "Games are not live yet." });
  });
  app.use("/api/games", (_req, res) => {
    res.status(404).json({ message: "Games are not live yet." });
  });
}

// Health check route
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date() });
});

// Serve frontend in production (only if frontend build directory exists locally)
const frontendBuildPath = path.resolve(__dirname, "../frontend/build");
if (
  process.env.NODE_ENV === "production" &&
  fs.existsSync(path.join(frontendBuildPath, "index.html"))
) {
  app.use(express.static(frontendBuildPath));

  app.get("*", (req, res) =>
    res.sendFile(path.join(frontendBuildPath, "index.html")),
  );
} else {
  app.get("/", (req, res) => {
    res.json({ status: "API is running...", service: "GDGSC Backend" });
  });
}

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
