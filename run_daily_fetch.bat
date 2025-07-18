@echo off
echo ========================================
echo Illuvium Data Fetcher - Daily Run
echo ========================================
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Run the Python script
echo Running Illuvium data fetcher...
python illuvium_data_fetcher.py

REM Check if the script ran successfully
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Data fetch completed successfully!
    echo ========================================
    
    REM Copy the latest file to a standard name for the app to use
    for /f "delims=" %%i in ('dir /b /od illuvium_builds_*.json') do set "latest_file=%%i"
    
    if defined latest_file (
        copy "%latest_file%" "latest_illuvium_builds.json"
        echo Copied %latest_file% to latest_illuvium_builds.json
    )
) else (
    echo.
    echo ========================================
    echo Data fetch failed with error code %ERRORLEVEL%
    echo ========================================
)

echo.
echo Press any key to exit...
pause >nul 