@echo off
echo DataKingz Icon Generation Script
echo ================================

REM Check if ImageMagick is available
magick -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ImageMagick not found! Please install ImageMagick or use online tools.
    echo Visit: https://imagemagick.org/script/download.php#windows
    echo.
    echo Alternative: Use https://favicon.io/favicon-converter/
    echo 1. Upload public\DataKingzLogo.png
    echo 2. Download generated files
    echo 3. Replace files in src-tauri\icons\
    pause
    exit /b 1
)

echo Generating DataKingz icons from public\DataKingzLogo.png...
echo.

REM Generate core PNG icons
echo Generating PNG icons...
magick public\DataKingzLogo.png -resize 32x32 src-tauri\icons\32x32.png
magick public\DataKingzLogo.png -resize 128x128 src-tauri\icons\128x128.png
magick public\DataKingzLogo.png -resize 256x256 src-tauri\icons\128x128@2x.png

REM Generate ICO file
echo Generating Windows ICO file...
magick public\DataKingzLogo.png -resize 256x256 -define icon:auto-resize=256,128,64,48,32,16 src-tauri\icons\icon.ico

REM Generate Microsoft Store icons
echo Generating Microsoft Store icons...
magick public\DataKingzLogo.png -resize 30x30 src-tauri\icons\Square30x30Logo.png
magick public\DataKingzLogo.png -resize 44x44 src-tauri\icons\Square44x44Logo.png
magick public\DataKingzLogo.png -resize 71x71 src-tauri\icons\Square71x71Logo.png
magick public\DataKingzLogo.png -resize 89x89 src-tauri\icons\Square89x89Logo.png
magick public\DataKingzLogo.png -resize 107x107 src-tauri\icons\Square107x107Logo.png
magick public\DataKingzLogo.png -resize 142x142 src-tauri\icons\Square142x142Logo.png
magick public\DataKingzLogo.png -resize 150x150 src-tauri\icons\Square150x150Logo.png
magick public\DataKingzLogo.png -resize 284x284 src-tauri\icons\Square284x284Logo.png
magick public\DataKingzLogo.png -resize 310x310 src-tauri\icons\Square310x310Logo.png
magick public\DataKingzLogo.png -resize 50x50 src-tauri\icons\StoreLogo.png

echo.
echo ✅ DataKingz icons generated successfully!
echo 📁 Icons saved to: src-tauri\icons\
echo.
echo Next steps:
echo 1. Run: npm run tauri:build
echo 2. Your installer will now have DataKingz branding!
echo.
pause 