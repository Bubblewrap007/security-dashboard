# Setup Frontend Service on Railway

Write-Host "🚂 Setting up Frontend Service on Railway" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Please follow these steps in Railway Dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Click '+ New' → 'GitHub Repo' → Select 'security-dashboard'" -ForegroundColor White
Write-Host "2. Name the service: 'frontend'" -ForegroundColor White
Write-Host ""
Write-Host "3. In Settings → Set Root Directory to: frontend" -ForegroundColor White
Write-Host ""
Write-Host "4. In Variables → Add:" -ForegroundColor White
Write-Host "   VITE_API_URL = https://security-dashboard-production.up.railway.app" -ForegroundColor Gray
Write-Host ""
Write-Host "5. In Settings → Networking → Click 'Generate Domain'" -ForegroundColor White
Write-Host ""
Write-Host "Your frontend will be deployed and accessible!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: https://security-dashboard-production.up.railway.app" -ForegroundColor Cyan
Write-Host ""
