# Deploy Backend Fixes to Railway

## Issues Fixed

1. ✅ **Route duplication** - Removed duplicate `/api` prefix in routes.py
2. ✅ **CORS configuration** - Added Railway frontend domain to allowed origins

## Required Environment Variables in Railway Backend

Make sure these are set in your Railway **backend service**:

```bash
ENV=production
COOKIE_SECURE=true
COOKIE_SAMESITE=none
SECRET_KEY=<your-strong-secret-key>
MONGO_URI=<your-mongodb-connection-string>
CORS_ORIGINS=https://security-dashboard-frontend-production.up.railway.app,https://atlanticitsupport.com,https://www.atlanticitsupport.com,https://dashboard.atlanticitsupport.com
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Required Environment Variables in Railway Frontend

Make sure this is set in your Railway **frontend service**:

```bash
VITE_API_URL=https://security-dashboard-production.up.railway.app
```

## Deployment Steps

### Option 1: Deploy via Git (Recommended)

```powershell
# Commit the fixes
git add .
git commit -m "Fix: Remove duplicate API prefix and update CORS config"
git push

# Railway will auto-deploy if connected to your Git repo
```

### Option 2: Deploy via Railway CLI

```powershell
# Link to your Railway project (if not already linked)
railway link

# Deploy the backend
railway up

# Or force redeploy in Railway dashboard
```

## Verify the Fix

1. **Check the backend is running:**

   ```powershell
   # Should return {"status": "ok"}
   curl https://security-dashboard-production.up.railway.app/health
   ```

2. **Test the login endpoint:**

   ```powershell
   # Should return 401 (not 405) with invalid credentials
   curl -X POST https://security-dashboard-production.up.railway.app/api/v1/auth/login `
     -H "Content-Type: application/json" `
     -d '{"identifier":"test","password":"test"}'
   ```

3. **Check CORS headers:**
   ```powershell
   # Should include Access-Control-Allow-Origin header
   curl -I -X OPTIONS https://security-dashboard-production.up.railway.app/api/v1/auth/login `
     -H "Origin: https://security-dashboard-frontend-production.up.railway.app"
   ```

## Troubleshooting

### If login still fails:

1. **Check Railway logs:**
   - Go to Railway dashboard → Backend service → Deployments
   - Click on latest deployment → View logs
   - Look for errors or CORS warnings

2. **Verify environment variables:**
   - Railway dashboard → Backend service → Variables
   - Make sure `CORS_ORIGINS` includes your frontend URL
   - Make sure `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`

3. **Check frontend URL:**
   - Railway dashboard → Frontend service → Settings → Domains
   - Copy the exact URL and use it in backend's `CORS_ORIGINS`

4. **Frontend must be rebuilt:**
   - After changing `VITE_API_URL`, trigger a redeploy of the frontend
   - Railway dashboard → Frontend service → Redeploy

### If you see "Network error":

- Check browser console (F12) for specific error messages
- Look for CORS errors (red text mentioning "blocked by CORS policy")
- Verify the API URL is correct in frontend environment

### If cookies aren't being set:

- Ensure `COOKIE_SECURE=true` in backend
- Ensure `COOKIE_SAMESITE=none` in backend (required for cross-origin cookies)
- Both frontend and backend must use HTTPS in production
