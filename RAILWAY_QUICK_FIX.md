# Railway Deployment - Quick Fix Guide

## What Was Fixed

### 1. Backend API Routing

- ✅ Added `/api` prefix to all backend routes
- ✅ Routes are now properly accessible at `/api/v1/auth/...`, `/api/v1/scans/...`, etc.

### 2. Frontend API Calls

- ✅ Created `apiFetch()` utility in [frontend/src/utils/api.js](frontend/src/utils/api.js)
- ✅ Updated all 35+ fetch calls across 10+ pages to use `apiFetch()`
- ✅ Frontend now properly uses `VITE_API_URL` environment variable

### 3. CORS Configuration

- ✅ Added `https://dashboard.atlanticitsupport.com` to CORS whitelist
- ✅ Backend now accepts requests from dashboard subdomain

## What You Need to Do Next

### Step 1: Deploy Backend to Railway

```powershell
# Railway will auto-deploy from git push, or manually trigger:
railway up --service backend
```

### Step 2: Get Backend URL

In Railway dashboard:

1. Go to your backend service
2. Copy the service URL (e.g., `https://security-dashboard-backend-production.up.railway.app`)

### Step 3: Configure Frontend Environment

In Railway dashboard, go to Frontend service → Variables:

```
VITE_API_URL=https://your-backend-service.railway.app
```

**IMPORTANT**:

- NO trailing slash!
- Must be the exact backend service URL from Railway

### Step 4: Configure Backend Environment

In Railway dashboard, go to Backend service → Variables:

```
ENVIRONMENT=production
ENV=production
SECRET_KEY=<generate-a-strong-32+-character-key>
MONGO_URI=<your-railway-mongodb-url>
REDIS_URL=<your-railway-redis-url>
CORS_ORIGINS=https://dashboard.atlanticitsupport.com,https://atlanticitsupport.com
```

### Step 5: Deploy Frontend

```powershell
railway up --service frontend
```

Or trigger redeploy in Railway dashboard (frontend must rebuild after setting VITE_API_URL)

### Step 6: Configure DNS

Add CNAME record:

```
dashboard.atlanticitsupport.com → your-frontend-service.railway.app
```

### Step 7: Add Custom Domain in Railway

1. Go to Frontend service in Railway
2. Settings → Domains
3. Add: `dashboard.atlanticitsupport.com`
4. Wait 5-10 minutes for SSL certificate

## Testing

1. **Check backend health**:

   ```
   curl https://your-backend.railway.app/health
   ```

   Should return: `{"status":"ok"}`

2. **Check API endpoint**:

   ```
   curl https://your-backend.railway.app/api/health
   ```

   Should return: `{"status":"ok"}`

3. **Open frontend**:
   ```
   https://dashboard.atlanticitsupport.com
   ```
   Should show "Server is online and ready" banner

## Common Issues

### "Backend is offline" banner:

**Cause**: `VITE_API_URL` not set or incorrect

**Fix**:

1. Set `VITE_API_URL` in Railway frontend service
2. Redeploy frontend (must rebuild with new env var)

### CORS errors in browser console:

**Cause**: Backend doesn't allow frontend origin

**Fix**:

1. Set `CORS_ORIGINS=https://dashboard.atlanticitsupport.com` in backend
2. Redeploy backend

### 404 errors on API calls:

**Cause**: API routes mismatch

**Fix**: Already fixed in code - redeploy backend

### Dashboard domain not working:

**Cause**: DNS not configured or SSL not ready

**Fix**:

1. Check DNS propagation: `nslookup dashboard.atlanticitsupport.com`
2. Wait for Railway SSL (5-10 min)
3. Check Railway custom domain status

## Architecture

```
[User Browser]
     ↓
[dashboard.atlanticitsupport.com] (Frontend on Railway)
     ↓ (via VITE_API_URL)
[backend-service.railway.app] (Backend API on Railway)
     ↓
[MongoDB & Redis on Railway]
```

## Important Notes

1. **Environment Variables**:
   - Frontend: `VITE_API_URL` must be set BEFORE build
   - Backend: `CORS_ORIGINS` must include frontend domain

2. **Deployment Order**:
   - Deploy backend first
   - Get backend URL
   - Set frontend VITE_API_URL
   - Deploy frontend

3. **Rebuilds Required**:
   - Frontend: After changing VITE_API_URL
   - Backend: After code changes

4. **Health Checks**:
   - `/health` - Root health check
   - `/api/health` - API health check (redundant but works)

## Quick Commands

```powershell
# View logs
railway logs --service backend
railway logs --service frontend

# Restart service
railway restart --service backend

# Open dashboard
railway open

# Check status
railway status
```
