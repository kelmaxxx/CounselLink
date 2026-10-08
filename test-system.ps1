$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 CounselLink Pre-Push Sanity Check 🚀" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check Frontend Linting
Write-Host "`n[1/3] Checking Frontend Code Quality (Linting)..." -ForegroundColor Yellow
Set-Location -Path ".\frontend"
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend linting failed! Please fix the ESLint errors above before pushing." -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}
Write-Host "✅ Frontend code looks good! No linting errors." -ForegroundColor Green

# 2. Check Frontend Build
Write-Host "`n[2/3] Checking Frontend Build (Testing if it will deploy successfully)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed! Your deployment will crash. Please fix the errors above." -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}
Write-Host "✅ Frontend built successfully! It is ready for deployment." -ForegroundColor Green
Set-Location -Path ".."

# 3. Check Backend Syntax
Write-Host "`n[3/3] Checking Backend Syntax..." -ForegroundColor Yellow
Set-Location -Path ".\backend"
# This runs a dry-run syntax check on the main server file
node --check server.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend syntax check failed! The server will crash on startup." -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}
Write-Host "✅ Backend syntax is valid! No critical crashes detected." -ForegroundColor Green
Set-Location -Path ".."

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎉 ALL CHECKS PASSED! YOU ARE SAFE TO PUSH! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
