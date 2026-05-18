const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const User = require('../models/User'); // Your Mongoose User model
const { v4: uuidv4 } = require('uuid'); // To generate unique temporary usernames (though we won't use it for `username` directly anymore)

module.exports = function(passport) {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id).select('-password');
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // --- Local Strategy (Email/Password) ---
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                const user = await User.findOne({ email });

                if (!user) {
                    return done(null, false, { message: 'That email is not registered' });
                }

                if (!user.password) {
                    return done(null, false, { message: 'This account was created via social login. Please use Google or Discord.' });
                }

                const isMatch = await user.matchPassword(password);

                if (!isMatch) {
                    return done(null, false, { message: 'Password incorrect' });
                }

                return done(null, user);
            } catch (err) {
                console.error(err);
                return done(err);
            }
        })
    );

    // --- Google Strategy ---
    const isProduction = process.env.NODE_ENV === 'production';
    const googleCallbackUrl = isProduction ? process.env.PROD_GOOGLE_CALLBACK_URL : process.env.DEV_GOOGLE_CALLBACK_URL;
    const discordCallbackUrl = isProduction ? process.env.PROD_DISCORD_CALLBACK_URL : process.env.DEV_DISCORD_CALLBACK_URL;

    passport.use(
        new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: googleCallbackUrl
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
                
                // First, try to find user by googleId
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    // Existing user with googleId, proceed normally
                    if (!user.username && user.isProfileComplete) { // Edge case: if username was cleared but flag not reset
                        user.isProfileComplete = false;
                        await user.save();
                    }
                    return done(null, user);
                }

                // If no user found by googleId, check if user exists with same email
                if (email) {
                    user = await User.findOne({ email: email });
                    if (user) {
                        // User exists with same email, link the Google account
                        user.googleId = profile.id;
                        if (profile.photos && profile.photos.length > 0) {
                            user.profilePicture = profile.photos[0].value;
                        }
                        await user.save();
                        return done(null, user);
                    }
                }

                // No existing user found, create new user
                user = await User.create({
                    googleId: profile.id,
                    email: email,
                    profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : 'https://i.ibb.co/L8G77yW/default-avatar.png',
                });
                return done(null, user);
                
            } catch (err) {
                console.error('Google Auth Error:', err);
                return done(err, null);
            }
        })
    );

    // --- Discord Strategy ---
    passport.use(
        new DiscordStrategy({
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: discordCallbackUrl,
            scope: ['identify', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.email || null; // Discord email might be null
                
                // First, try to find user by discordId
                let user = await User.findOne({ discordId: profile.id });

                if (user) {
                    // Existing user with discordId, proceed normally
                    if (!user.username && user.isProfileComplete) { // Edge case
                        user.isProfileComplete = false;
                        await user.save();
                    }
                    return done(null, user);
                }

                // If no user found by discordId, check if user exists with same email (if email is available)
                if (email) {
                    user = await User.findOne({ email: email });
                    if (user) {
                        // User exists with same email, link the Discord account
                        user.discordId = profile.id;
                        if (profile.avatar) {
                            user.profilePicture = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
                        }
                        await user.save();
                        return done(null, user);
                    }
                }

                // No existing user found, create new user
                user = await User.create({
                    discordId: profile.id,
                    email: email,
                    profilePicture: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : 'https://i.ibb.co/L8G77yW/default-avatar.png',
                });
                return done(null, user);
                
            } catch (err) {
                console.error('Discord Auth Error:', err);
                return done(err, null);
            }
        })
    );
};