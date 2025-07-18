@echo off
echo 🏆 DataKingz Icon Generation Script 🏆
echo =======================================

set MAGICK_PATH="C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"

REM Check if ImageMagick exists at the specified path
if not exist %MAGICK_PATH% (
    echo ❌ ImageMagick not found at: %MAGICK_PATH%
    echo Please check the installation path.
    pause
    exit /b 1
)

echo 📁 Using ImageMagick from: %MAGICK_PATH%
echo 🎯 Generating DataKingz icons from public\DataKingzLogo.png...
echo.

REM Check if source logo exists
if not exist "public\DataKingzLogo.png" (
    echo ❌ Error: public\DataKingzLogo.png not found!
    pause
    exit /b 1
)

REM Generate core PNG icons
echo 🖼️  Generating PNG icons...
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 32x32 "src-tauri\icons\32x32.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 128x128 "src-tauri\icons\128x128.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 256x256 "src-tauri\icons\128x128@2x.png"

REM Generate ICO file (most important for Windows)
echo 🪟 Generating Windows ICO file...
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 256x256 -define icon:auto-resize=256,128,64,48,32,16 "src-tauri\icons\icon.ico"

REM Generate Microsoft Store icons
echo 🏪 Generating Microsoft Store icons...
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 30x30 "src-tauri\icons\Square30x30Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 44x44 "src-tauri\icons\Square44x44Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 71x71 "src-tauri\icons\Square71x71Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 89x89 "src-tauri\icons\Square89x89Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 107x107 "src-tauri\icons\Square107x107Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 142x142 "src-tauri\icons\Square142x142Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 150x150 "src-tauri\icons\Square150x150Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 284x284 "src-tauri\icons\Square284x284Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 310x310 "src-tauri\icons\Square310x310Logo.png"
%MAGICK_PATH% "public\DataKingzLogo.png" -resize 50x50 "src-tauri\icons\StoreLogo.png"

REM Copy main logo
echo 📋 Copying main icon...
copy "public\DataKingzLogo.png" "src-tauri\icons\icon.png" >nul

echo.
echo ✅ DataKingz icons generated successfully!
echo 📁 Icons saved to: src-tauri\icons\
echo.
echo 🎯 Next steps:
echo 1. Run: npm run tauri:build
echo 2. Your installer will now have DataKingz branding!
echo.
echo 🔥 Ready to dominate Illuvium with DataKingz! 🔥
echo.
pause 