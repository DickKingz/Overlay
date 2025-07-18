Write-Host "Starting DataKingz Illuvium Guide..." -ForegroundColor Green
Write-Host ""
Write-Host "This will run the built application (not development mode)" -ForegroundColor Yellow
Write-Host "The leaderboard and recent builds features will work properly." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$exePath = "src-tauri\target\release\guideoverlay.exe"

if (Test-Path $exePath) {
    Write-Host "Starting application..." -ForegroundColor Green
    Start-Process $exePath
    Write-Host "Application started!" -ForegroundColor Green
} else {
    Write-Host "Error: Application not found at $exePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please build the application first with:" -ForegroundColor Yellow
    Write-Host "npm run tauri:build" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 