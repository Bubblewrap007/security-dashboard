# Railway Deployment Script for Security Dashboard
# Run this script to deploy to Railway

Write-Host "🚂 Railway Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
Write-Host "Checking Railway CLI..." -ForegroundColor Yellow
$railwayCli = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayCli) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Railway CLI first:" -ForegroundColor Yellow
    Write-Host "  Option 1: npm install -g @railway/cli" -ForegroundColor White
    Write-Host "  Option 2: Download from https://docs.railway.app/develop/cli" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Railway login..." -ForegroundColor Yellow
$loginCheck = railway whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please login first:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Logged in as: $loginCheck" -ForegroundColor Green
Write-Host ""

# Check if project is linked
Write-Host "Checking Railway project..." -ForegroundColor Yellow
$projectCheck = railway status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No Railway project linked" -ForegroundColor Yellow
    Write-Host ""
    $createNew = Read-Host "Create a new Railway project? (y/n)"
    
    if ($createNew -eq 'y') {
        Write-Host "Creating new Railway project..." -ForegroundColor Yellow
        railway init
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to create project" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Project created!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "✅ Project linked" -ForegroundColor Green
}

Write-Host ""

# Generate secret key if needed
Write-Host "Setting up environment variables..." -ForegroundColor Yellow
$secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Host "Setting SECRET_KEY..." -ForegroundColor White
railway variables set SECRET_KEY="$secretKey" 2>&1 | Out-Null

Write-Host "Setting ENVIRONMENT..." -ForegroundColor White
railway variables set ENVIRONMENT="production" 2>&1 | Out-Null

Write-Host "✅ Environment variables configured" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. View your deployment: railway open" -ForegroundColor White
    Write-Host "  2. Check logs: railway logs" -ForegroundColor White
    Write-Host "  3. Get service URLs from Railway dashboard" -ForegroundColor White
    Write-Host "  4. Update VITE_API_URL in frontend service settings" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check logs: railway logs" -ForegroundColor Yellow
    Write-Host ""
}
