// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User'); // Required for signup logic
const generateToken = require('../utils/generateToken'); // <-- CORRECT IMPORT HERE

// @route   POST /api/auth/signup
// @desc    Register user (Local Strategy)
// @access  Public
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        let userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with that email or username already exists' });
        }

        const newUser = await User.create({
            username,
            email,
            password // Hashing handled by pre-save hook in User model
        });

        const token = generateToken(newUser._id, newUser.isProfileComplete); // Pass isProfileComplete

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profilePicture: newUser.profilePicture,
                bio: newUser.bio,
                isProfileComplete: newUser.isProfileComplete
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `${field} already exists` });
        }
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (Local Strategy)
// @access  Public
router.post('/login', (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Server error during login' });
        }
        if (!user) {
            return res.status(401).json({ message: info.message || 'Authentication failed' });
        }

        // If user is found and authenticated, generate JWT
        const token = generateToken(user._id, user.isProfileComplete); // Pass isProfileComplete
        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                bio: user.bio,
                isProfileComplete: user.isProfileComplete
            }
        });
    })(req, res, next);
});

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth Callback
// @access  Public
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: (process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.DEV_FRONTEND_URL) + '/login?error=google_failed',
        session: false
    }),
    (req, res) => {
        try {
            console.log('Google OAuth callback - User:', req.user);
            
            // Successful authentication, redirect to frontend with token
            const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.DEV_FRONTEND_URL;
            console.log('Frontend URL:', frontendUrl);
            
            if (!req.user) {
                console.error('No user found in req.user');
                return res.redirect(`${frontendUrl}/login?error=auth_failed`);
            }
            
            const token = generateToken(req.user._id, req.user.isProfileComplete);
            console.log('Generated token successfully');
            
            const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;
            console.log('Redirecting to:', redirectUrl);
            
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.DEV_FRONTEND_URL;
            res.redirect(`${frontendUrl}/login?error=callback_failed`);
        }
    }
);

// @route   GET /api/auth/discord
// @desc    Initiate Discord OAuth
// @access  Public
router.get(
    '/discord',
    passport.authenticate('discord', { scope: ['identify', 'email'] })
);

// @route   GET /api/auth/discord/callback
// @desc    Discord OAuth Callback
// @access  Public
router.get(
    '/discord/callback',
    passport.authenticate('discord', {
        failureRedirect: (process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.DEV_FRONTEND_URL) + '/login?error=discord_failed',
        session: false
    }),
    (req, res) => {
        // Successful authentication, redirect to frontend with token
        const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.PROD_FRONTEND_URL : process.env.DEV_FRONTEND_URL;
        const token = generateToken(req.user._id, req.user.isProfileComplete);
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
);

// @route   GET /api/auth/logout
// @desc    Logout user (client-side token removal for JWT)
// @access  Public
router.get('/logout', (req, res) => {
    res.status(200).json({ message: 'Logged out (client must remove token)' });
});

module.exports = router;