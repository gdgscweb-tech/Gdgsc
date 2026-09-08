import React from 'react';
import './SocialLoginButtons.css';

const SocialLoginButtons = () => {
    // Auto-detect environment based on hostname
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const explicitEnv = process.env.REACT_APP_ENV;
    
    const isProduction = explicitEnv 
        ? explicitEnv === 'production' 
        : !isLocalhost;
    
    const API_BASE_URL = isProduction 
        ? (process.env.REACT_APP_PROD_API_URL || 'https://gdgsc-33246d1cdab1.herokuapp.com')
        : (process.env.REACT_APP_DEV_API_URL || 'http://localhost:5000');

    const handleGoogleLogin = () => {
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    const handleDiscordLogin = () => {
        window.location.href = `${API_BASE_URL}/api/auth/discord`;
    };

    return (
        <div className="social-login-buttons">
            <p className="social-separator">Or continue with:</p>
            <button
                type="button"
                className="social-btn google-btn"
                onClick={handleGoogleLogin}
            >
                <img src="https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcRRLOiuW8UxRuAbQntCB7RB6Aoh7t2UcN_JHT9RGeSR-6nJ27N6odevUewJOpDGOyCfYehTOCU9kR7sNPJc3ckgFHQblfaCYFeYWoMEfQA" alt="Google Logo" />
                Login with Google
            </button>
            <button
                type="button"
                className="social-btn discord-btn"
                onClick={handleDiscordLogin}
            >
                <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/discord-round-color-icon.png" alt="Discord Logo" />
                Login with Discord
            </button>
        </div>
    );
};

export default SocialLoginButtons;
