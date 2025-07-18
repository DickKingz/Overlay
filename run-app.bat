@echo off
echo Starting DataKingz Illuvium Guide...
echo.
echo This will run the built application (not development mode)
echo The leaderboard and recent builds features will work properly.
echo.
echo Press any key to continue...
pause >nul

cd /d "%~dp0"
start "" "src-tauri\target\release\guideoverlay.exe"

echo Application started!
echo.
echo If you see any errors, make sure you've built the application first with:
echo npm run tauri:build
echo.
pause 