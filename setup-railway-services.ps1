# Railway Setup and Deployment Script
# This will guide you through setting up your services on Railway

Write-Host "`n🚂 Railway Service Setup" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Check if logged in
Write-Host "Checking Railway login..." -ForegroundColor Yellow
$loginCheck = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host "Please run: railway login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Logged in as: $loginCheck`n" -ForegroundColor Green

# Check project
Write-Host "Current project status:" -ForegroundColor Yellow
railway status
Write-Host ""

# Prompt for backend service
Write-Host "📋 STEP 1: Backend Service" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan
$backendUrl = Read-Host "Enter your Railway BACKEND service URL (e.g., https://backend-abc123.railway.app)"

if ([string]::IsNullOrWhiteSpace($backendUrl)) {
    Write-Host "❌ Backend URL is required!" -ForegroundColor Red
    Write-Host "`nTo get your backend URL:" -ForegroundColor Yellow
    Write-Host "1. Go to Railway dashboard (railway open)" -ForegroundColor White
    Write-Host "2. Click on your backend service" -ForegroundColor White
    Write-Host "3. Go to Settings → Domains" -ForegroundColor White
    Write-Host "4. Copy the Railway-provided domain`n" -ForegroundColor White
    exit 1
}

# Remove trailing slash if present
$backendUrl = $backendUrl.TrimEnd('/')

Write-Host "`n✅ Backend URL: $backendUrl" -ForegroundColor Green

# Prompt for frontend domain
Write-Host "`n📋 STEP 2: Frontend Domain" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan
$frontendDomain = Read-Host "Enter your frontend domain (default: securitydashboardapp.com)"

if ([string]::IsNullOrWhiteSpace($frontendDomain)) {
    $frontendDomain = "securitydashboardapp.com"
}

Write-Host "`n✅ Frontend domain: $frontendDomain" -ForegroundColor Green

# Generate secret key
Write-Host "`n📋 STEP 3: Generating Secret Key" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan
$secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Write-Host "✅ Generated secret key" -ForegroundColor Green

# Summary
Write-Host "`n📋 Configuration Summary" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan
Write-Host "Backend URL: $backendUrl" -ForegroundColor White
Write-Host "Frontend Domain: $frontendDomain" -ForegroundColor White
Write-Host "Secret Key: $secretKey`n" -ForegroundColor White

$confirm = Read-Host "Do you want to apply these settings? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "`n❌ Setup cancelled" -ForegroundColor Red
    exit 0
}

Write-Host "`n🔧 Applying configuration..." -ForegroundColor Yellow
Write-Host "`nNote: You need to run these commands for each service separately" -ForegroundColor Yellow
Write-Host "Use 'railway link' to switch between services`n" -ForegroundColor Yellow

# Create configuration file for reference
$config = @"
# Railway Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Backend Service Environment Variables
Run these commands after linking to backend service (railway link):

railway variables set ENVIRONMENT="production"
railway variables set ENV="production"
railway variables set SECRET_KEY="$secretKey"
railway variables set CORS_ORIGINS="https://$frontendDomain,https://atlanticitsupport.com,https://www.atlanticitsupport.com"

## Frontend Service Environment Variables
Run these commands after linking to frontend service (railway link):

railway variables set VITE_API_URL="$backendUrl"
railway variables set ENABLE_PROXY="false"

## MongoDB Service
Make sure you have a MongoDB database added in Railway dashboard.
Get the connection string from Railway and set in backend:

railway variables set MONGO_URI="<your-mongodb-connection-string>"

## Redis Service (if using)
Make sure you have a Redis database added in Railway dashboard.
Get the connection string from Railway and set in backend:

railway variables set REDIS_URL="<your-redis-connection-string>"

## DNS Configuration
Add this CNAME record to your DNS:

$frontendDomain  →  <your-frontend-railway-url>.railway.app

## Custom Domain in Railway
1. Go to frontend service in Railway dashboard
2. Settings → Domains
3. Add custom domain: $frontendDomain

## Testing
Backend health: curl $backendUrl/health
Backend API: curl $backendUrl/api/health
Frontend: https://$frontendDomain
"@

$config | Out-File -FilePath "railway-config.txt" -Encoding UTF8
Write-Host "✅ Configuration saved to railway-config.txt`n" -ForegroundColor Green

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan
Write-Host "1. Link to backend service:" -ForegroundColor Yellow
Write-Host "   railway link" -ForegroundColor White
Write-Host "   (Select your backend service)`n" -ForegroundColor White

Write-Host "2. Set backend environment variables:" -ForegroundColor Yellow
Write-Host "   railway variables set ENVIRONMENT=production" -ForegroundColor White
Write-Host "   railway variables set ENV=production" -ForegroundColor White
Write-Host "   railway variables set SECRET_KEY=`"$secretKey`"" -ForegroundColor White
Write-Host "   railway variables set CORS_ORIGINS=`"https://$frontendDomain`"`n" -ForegroundColor White

Write-Host "3. Deploy backend:" -ForegroundColor Yellow
Write-Host "   railway up`n" -ForegroundColor White

Write-Host "4. Link to frontend service:" -ForegroundColor Yellow
Write-Host "   railway link" -ForegroundColor White
Write-Host "   (Select your frontend service)`n" -ForegroundColor White

Write-Host "5. Set frontend environment variable:" -ForegroundColor Yellow
Write-Host "   railway variables set VITE_API_URL=`"$backendUrl`"`n" -ForegroundColor White

Write-Host "6. Deploy frontend:" -ForegroundColor Yellow
Write-Host "   railway up`n" -ForegroundColor White

Write-Host "All configuration details saved to: railway-config.txt`n" -ForegroundColor Green
Write-Host "Open Railway dashboard: railway open`n" -ForegroundColor Cyan
