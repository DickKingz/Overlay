@echo off
echo ========================================
echo DataKingz Overlay - Automation Setup
echo ========================================
echo.

echo Choose automation method:
echo 1. Windows Task Scheduler (Recommended)
echo 2. Manual setup instructions
echo 3. Exit
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto task_scheduler
if "%choice%"=="2" goto manual_setup
if "%choice%"=="3" goto exit
goto invalid_choice

:task_scheduler
echo.
echo Setting up Windows Task Scheduler...
echo This will create a daily task that runs at 2:00 AM
echo.
powershell -ExecutionPolicy Bypass -File "setup_daily_task.ps1"
goto end

:manual_setup
echo.
echo ========================================
echo Manual Setup Instructions
echo ========================================
echo.
echo Option A: Windows Task Scheduler
echo 1. Open Task Scheduler (Win+R, type: taskschd.msc)
echo 2. Click "Create Basic Task"
echo 3. Name: "IlluviumDataFetch"
echo 4. Trigger: Daily at 2:00 AM
echo 5. Action: Start a program
echo 6. Program: python
echo 7. Arguments: illuvium_data_fetcher.py
echo 8. Start in: C:\Users\richa\guideoverlay
echo.
echo Option B: Startup Script
echo 1. Create a shortcut to illuvium_data_fetcher.py
echo 2. Press Win+R, type: shell:startup
echo 3. Copy the shortcut to the startup folder
echo.
echo Option C: Third-party Scheduler
echo - Use tools like Cron for Windows
echo - Or set up with Windows Subsystem for Linux
echo.
pause
goto end

:invalid_choice
echo Invalid choice. Please try again.
pause
goto end

:end
echo.
echo Setup complete! Your Illuvium data will now update automatically.
echo Check latest_illuvium_builds.json for the latest data.
pause

:exit 