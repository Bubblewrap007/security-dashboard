# Railway Complete Setup Script
# This script will set up your entire Security Dashboard on Railway

Write-Host "🚂 Railway Complete Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Generate a secure secret key
$secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host "Step 1: Setting up environment variables..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Setting SECRET_KEY..." -ForegroundColor White
railway variables set SECRET_KEY="$secretKey"

Write-Host "Setting ENVIRONMENT..." -ForegroundColor White
railway variables set ENVIRONMENT="production"

Write-Host "Setting ENV..." -ForegroundColor White
railway variables set ENV="production"

Write-Host ""
Write-Host "✅ Environment variables set!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Add databases in Railway Dashboard:" -ForegroundColor Yellow
Write-Host "  1. Go to your Railway project: railway open" -ForegroundColor White
Write-Host "  2. Click '+ New' → 'Database' → 'Add MongoDB'" -ForegroundColor White
Write-Host "  3. Click '+ New' → 'Database' → 'Add Redis'" -ForegroundColor White
Write-Host ""
Write-Host "Step 3: After databases are created, set these variables:" -ForegroundColor Yellow
Write-Host "  railway variables set MONGO_URI='<MongoDB connection string>'" -ForegroundColor White
Write-Host "  railway variables set REDIS_URL='<Redis connection string>'" -ForegroundColor White
Write-Host ""
Write-Host "Step 4: Deploy!" -ForegroundColor Yellow
Write-Host "  railway up" -ForegroundColor White
Write-Host ""
Write-Host "Your backend will be available at the URL shown by Railway" -ForegroundColor Green
Write-Host ""
