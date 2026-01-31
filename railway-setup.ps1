# Railway Complete Setup Script
# This script will set up your entire Security Dashboard on Railway

Write-Host "🚂 Railway Complete Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Generate a secure secret key
$secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

Write-Host "Setting up ALL environment variables..." -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Setting MONGO_URI..." -ForegroundColor White
railway variables set MONGO_URI="mongodb://mongodb.railway.internal:27017/securitydb"

Write-Host "2. Setting REDIS_URL..." -ForegroundColor White
railway variables set REDIS_URL="redis://redis.railway.internal:6379/0"

Write-Host "3. Setting SECRET_KEY..." -ForegroundColor White
railway variables set SECRET_KEY="$secretKey"

Write-Host "4. Setting ENVIRONMENT..." -ForegroundColor White
railway variables set ENVIRONMENT="production"

Write-Host "5. Setting ENV..." -ForegroundColor White
railway variables set ENV="production"

Write-Host ""
Write-Host "✅ All environment variables set!" -ForegroundColor Green
Write-Host ""
Write-Host "Generated SECRET_KEY: $secretKey" -ForegroundColor Gray
Write-Host ""
Write-Host "Next step: Deploy your backend!" -ForegroundColor Yellow
Write-Host "  railway up" -ForegroundColor White
Write-Host ""
Write-Host "Or just push to GitHub and Railway will auto-deploy!" -ForegroundColor Green
Write-Host ""
