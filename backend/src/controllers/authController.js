const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User with that email or username already exists' });
        }

        user = await User.create({
            username,
            email,
            password // Mongoose pre-save hook will hash this
        });

        res.status(201).json({
            message: 'User registered successfully',
            token: generateToken(user._id),
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
                isProfileComplete: user.isProfileComplete
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log("LOGIN DEBUG - User:", user.username, "Role:", user.role); // Debugging

        res.status(200).json({
            message: 'Logged in successfully',
            token: generateToken(user._id),
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
                isProfileComplete: user.isProfileComplete
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// ... (Google and Discord OAuth callbacks - these are more complex, involve Passport.js and redirect)
// Example structure for a Google callback (Passport.js handled):
exports.googleCallback = (req, res) => {
    // Passport.js places the user on req.user after successful authentication
    if (req.user) {
        const token = generateToken(req.user._id);
        // Redirect to frontend with token (e.g., via query params or a specific route)
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } else {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};

// Same for Discord
exports.discordCallback = (req, res) => {
    if (req.user) {
        const token = generateToken(req.user._id);
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } else {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};