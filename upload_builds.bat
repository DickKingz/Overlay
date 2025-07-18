@echo off
echo ========================================
echo    DataKingz Build Data Uploader
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "latest_illuvium_builds.json" (
    echo ❌ latest_illuvium_builds.json not found
    echo Please run the data fetcher first: python illuvium_data_fetcher.py
    pause
    exit /b 1
)

echo ✅ Found build data files
echo.

REM Check for GitHub token
if "%GITHUB_TOKEN%"=="" (
    echo 🔑 GitHub Token not found in environment
    echo Please set GITHUB_TOKEN environment variable or enter it when prompted
    echo.
    echo To set it permanently, run:
    echo   setx GITHUB_TOKEN your_token_here
    echo.
)

echo 🚀 Starting upload to GitHub...
echo.

REM Run the upload script
python upload_builds_to_github.py

echo.
echo ========================================
echo Upload process completed!
echo ========================================
echo.
echo 📋 Next steps:
echo   1. Check your GitHub repository for the uploaded files
echo   2. Your website can now fetch data from the provided URLs
echo   3. Open builds_data_access.html for easy data access
echo.
pause 