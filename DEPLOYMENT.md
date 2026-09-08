# Deployment Guide

## Environment Configuration

This application automatically detects whether it's running in development or production based on the hostname.

### Automatic Detection

- **localhost** or **127.0.0.1** → Development mode (uses `http://localhost:5000`)
- **Any other domain** → Production mode (uses `https://gdgsc-33246d1cdab1.herokuapp.com`)

### Manual Override

You can explicitly set the environment using the `REACT_APP_ENV` variable.

## Frontend Deployment (Vercel)

### Option 1: Using Environment Variables in Vercel Dashboard

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add these variables:

```
REACT_APP_ENV=production
REACT_APP_PROD_API_URL=https://gdgsc-33246d1cdab1.herokuapp.com
REACT_APP_DEV_API_URL=http://localhost:5000
Get_In_Touch_Form_Key=b49af77b-8712-41c6-b091-93909761f205
```

4. Redeploy your application

### Option 2: Using .env.production (Recommended)

The `.env.production` file is already configured and will be automatically used by Vercel during production builds.

Just push your code:

```bash
git add .
git commit -m "Add production environment config"
git push
```

Vercel will automatically use `.env.production` for production builds.

## Backend Deployment (Render)

### Environment Variables on Render

Set these environment variables in your Render dashboard:

```
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
PROD_FRONTEND_URL=https://your-vercel-domain.vercel.app
PROD_BACKEND_URL=https://gdgsc-33246d1cdab1.herokuapp.com
PROD_GOOGLE_CALLBACK_URL=https://gdgsc-33246d1cdab1.herokuapp.com/api/auth/google/callback
PROD_DISCORD_CALLBACK_URL=https://gdgsc-33246d1cdab1.herokuapp.com/api/auth/discord/callback
DEV_FRONTEND_URL=http://localhost:3000
DEV_BACKEND_URL=http://localhost:5000
DEV_GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
DEV_DISCORD_CALLBACK_URL=http://localhost:5000/api/auth/discord/callback
PORT=5000
```

## Local Development

### Quick Start

1. **Install dependencies:**

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. **Start development servers:**

```bash
# Backend (in backend directory)
npm start

# Frontend (in frontend directory)
npm start
```

The app will automatically use development URLs (localhost).

### Switching Environments Manually

Use the helper script:

```bash
# Switch to development
node switch-env.js development

# Switch to production
node switch-env.js production
```

## OAuth Configuration

### Google OAuth

Update your Google Cloud Console with these authorized redirect URIs:

- Development: `http://localhost:5000/api/auth/google/callback`
- Production: `https://gdgsc-33246d1cdab1.herokuapp.com/api/auth/google/callback`

### Discord OAuth

Update your Discord Developer Portal with these redirect URIs:

- Development: `http://localhost:5000/api/auth/discord/callback`
- Production: `https://gdgsc-33246d1cdab1.herokuapp.com/api/auth/discord/callback`

## Troubleshooting

### "Network Error" or "ERR_BLOCKED_BY_CLIENT"

This means the frontend is trying to connect to localhost while deployed. Check:

1. Environment variables are set correctly in Vercel
2. `.env.production` file exists and is committed
3. Clear browser cache and hard reload

### CORS Errors

Make sure:

1. Backend `PROD_FRONTEND_URL` matches your Vercel domain
2. Backend is deployed and running
3. Both frontend and backend are using the same environment (both production or both development)

### OAuth Redirect Issues

Verify:

1. OAuth callback URLs in Google/Discord console match your backend URL
2. Backend environment variables for callback URLs are correct
3. Frontend is redirecting to the correct backend URL for OAuth
