# DataKingz Simple Icon Generator (using Windows built-in capabilities)
Write-Host "🏆 DataKingz Icon Generator 🏆" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if source logo exists
if (-not (Test-Path "public\DataKingzLogo.png")) {
    Write-Host "❌ Error: public\DataKingzLogo.png not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Source logo found: public\DataKingzLogo.png" -ForegroundColor Green

# For the ICO file, we recommend the online converter
Write-Host ""
Write-Host "🌐 RECOMMENDED: Use Online Converter" -ForegroundColor Yellow
Write-Host "1. Go to: https://favicon.io/favicon-converter/" -ForegroundColor White
Write-Host "2. Upload: public\DataKingzLogo.png" -ForegroundColor White
Write-Host "3. Download the ZIP file" -ForegroundColor White
Write-Host "4. Extract and copy 'favicon.ico' to 'src-tauri\icons\icon.ico'" -ForegroundColor White
Write-Host ""

# Copy the logo as the main icon
Copy-Item "public\DataKingzLogo.png" "src-tauri\icons\icon.png" -Force
Write-Host "✅ Copied DataKingzLogo.png to src-tauri\icons\icon.png" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Quick Steps:" -ForegroundColor Cyan
Write-Host "1. Visit the online converter above" -ForegroundColor White
Write-Host "2. Generate ICO file" -ForegroundColor White  
Write-Host "3. Run: npm run tauri:build" -ForegroundColor White
Write-Host ""
Write-Host "🔥 Your DataKingz branded installer will be ready! 🔥" -ForegroundColor Green

Read-Host "Press Enter to continue" 