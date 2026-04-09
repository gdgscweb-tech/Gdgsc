// backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
const session = require('express-session'); // Required for Passport OAuth
const MongoStore = require('connect-mongo'); // To store sessions in MongoDB

// Load environment variables
dotenv.config({ path: './.env' }); // Make sure this path is correct

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';

const config = {
    frontendUrl: isProduction ? process.env.PROD_FRONTEND_URL : process.env.DEV_FRONTEND_URL,
    backendUrl: isProduction ? process.env.PROD_BACKEND_URL : process.env.DEV_BACKEND_URL,
    googleCallbackUrl: isProduction ? process.env.PROD_GOOGLE_CALLBACK_URL : process.env.DEV_GOOGLE_CALLBACK_URL,
    discordCallbackUrl: isProduction ? process.env.PROD_DISCORD_CALLBACK_URL : process.env.DEV_DISCORD_CALLBACK_URL
};

console.log(`Running in ${process.env.NODE_ENV} mode`);
console.log(`Frontend URL: ${config.frontendUrl}`);
console.log(`Backend URL: ${config.backendUrl}`);

// Passport config
require('./src/config/passport')(passport);

// Connect to database
connectDB();

const app = express();

// CORS Middleware - Environment dependent
const allowedOrigins = isProduction
    ? [
        'https://gdgsc.dev',
        'https://www.gdgsc.dev',
        config.frontendUrl, // Include the configured frontend URL
        process.env.PROD_FRONTEND_URL // Include env variable for safety
    ].filter(Boolean) // Remove any undefined values
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        config.frontendUrl, // Include the configured frontend URL
        process.env.DEV_FRONTEND_URL // Include env variable for safety
    ].filter(Boolean); // Remove any undefined values

app.use(cors({
    origin: allowedOrigins,
    credentials: true // Allow cookies/headers to be sent
}));

// Body parser middleware
app.use(express.json()); // For JSON data
app.use(express.urlencoded({ extended: false })); // For form data

// Session Middleware (needed for Passport.js OAuth flows)
app.use(
    session({
        secret: process.env.SESSION_SECRET, // Secret for signing the session ID cookie
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Don't create session until something stored
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI, // MongoDB connection string
            collectionName: 'sessions', // Name of the session collection
            ttl: 14 * 24 * 60 * 60, // Session TTL (14 days)
            autoRemove: 'interval', // Auto-remove expired sessions
            autoRemoveInterval: 10 // Interval in minutes to check for expired sessions
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day in milliseconds
            secure: process.env.NODE_ENV === 'production', // true in production
            httpOnly: true, // Prevents client-side JS from reading the cookie
            sameSite: 'lax' // CSRF protection
        }
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session()); // Use session only for OAuth flow

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/user', require('./src/routes/userRoutes'));
app.use('/api/events', require('./src/routes/eventRoutes'));          // NEW
app.use('/api/registrations', require('./src/routes/registrationRoutes')); // NEW

// Serve game assets (images, downloads) from /src/games as static files
app.use('/api/games/assets', express.static(path.join(__dirname, 'src/games')));

app.use('/api/games', require('./src/routes/gamesRoutes'));               // Games & Categories


// Serve frontend in production (if applicable)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    app.get('*', (req, res) =>
        res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'))
    );
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));