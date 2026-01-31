# Security Dashboard - Railway Deployment Guide

## Prerequisites

- Railway account (sign up at railway.app)
- Railway CLI installed
- Git repository (Railway deploys from Git)

## Step 1: Install Railway CLI

```powershell
# Install via npm (if you have Node.js)
npm install -g @railway/cli

# Or download from: https://docs.railway.app/develop/cli#installing-the-cli
```

## Step 2: Initialize Railway Project

```powershell
# Login to Railway
railway login

# Initialize project in this directory
railway init

# Link to a new project (Railway will create it)
railway link
```

## Step 3: Add Railway Services

Railway will automatically detect your `docker-compose.yml` and create services for:

- MongoDB
- Redis
- Backend API
- Frontend
- Background Worker

## Step 4: Set Environment Variables

Railway will need these environment variables set:

### Backend Service:

```
MONGO_URI=mongodb://mongo:27017/securitydb
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<generate-a-strong-secret-key>
ACCESS_TOKEN_EXPIRE_MINUTES=60
ENVIRONMENT=production
```

### Frontend Service:

```
VITE_API_URL=https://<your-backend-url>.railway.app
```

You can set these via Railway dashboard or CLI:

```powershell
railway variables set SECRET_KEY="your-secret-key-here"
railway variables set ENVIRONMENT="production"
```

## Step 5: Deploy

```powershell
# Deploy all services
railway up

# Or deploy from Git (recommended)
git add .
git commit -m "Deploy to Railway"
git push railway main
```

## Step 6: Get Your URLs

```powershell
# Get service URLs
railway status

# Open Railway dashboard
railway open
```

Your app will be available at:

- Frontend: `https://<your-project>.railway.app`
- Backend API: `https://<your-backend>.railway.app`

## Step 7: Configure Custom Domain (Optional)

In Railway dashboard:

1. Go to your frontend service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Important Notes

1. **MongoDB Persistence**: Railway automatically handles volume persistence
2. **SSL/TLS**: Automatically provided by Railway
3. **Logs**: View with `railway logs` or in dashboard
4. **Scaling**: Upgrade plan in dashboard for more resources
5. **Cost**: ~$5/month credit free, then ~$15-25/month for all services

## Troubleshooting

### Services not connecting:

- Check Railway internal networking uses service names (mongo, redis)
- Environment variables are automatically shared between services

### Build failures:

```powershell
railway logs --service backend
railway logs --service frontend
```

### Restart services:

```powershell
railway restart
```

## Alternative: Deploy Individual Services

If docker-compose deployment has issues, you can deploy each service separately:

```powershell
# Add MongoDB database
railway add --database mongodb

# Add Redis
railway add --database redis

# Deploy backend
cd backend
railway up

# Deploy frontend
cd ../frontend
railway up
```

Then link services using Railway's internal URLs in environment variables.
