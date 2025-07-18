# DataKingz Overlay - Automation Setup Guide

## 🚀 Automatic Data Updates

This guide shows you how to set up automatic daily updates for your Illuvium data so you don't need to manually run the script.

## 📋 Prerequisites

- Windows 10/11
- Python installed and in PATH
- API token in `.env` file

## 🔧 Setup Options

### Option 1: Windows Task Scheduler (Recommended)

**Step 1: Open Task Scheduler**
- Press `Win + R`
- Type `taskschd.msc`
- Press Enter

**Step 2: Create Basic Task**
1. Click "Create Basic Task" in the right panel
2. Name: `IlluviumDataFetch`
3. Description: `Daily Illuvium data fetching for DataKingz Overlay`
4. Click Next

**Step 3: Set Trigger**
1. Choose "Daily"
2. Click Next
3. Set start time to `2:00:00 AM`
4. Click Next

**Step 4: Set Action**
1. Choose "Start a program"
2. Click Next
3. Program/script: `python`
4. Add arguments: `illuvium_data_fetcher.py`
5. Start in: `C:\Users\richa\guideoverlay`
6. Click Next

**Step 5: Finish**
1. Review settings
2. Check "Open properties dialog"
3. Click Finish

**Step 6: Advanced Settings**
1. In Properties dialog, go to "General" tab
2. Check "Run whether user is logged on or not"
3. Check "Run with highest privileges"
4. Go to "Settings" tab
5. Check "Allow task to be run on demand"
6. Check "Run task as soon as possible after a scheduled start is missed"
7. Click OK

### Option 2: Startup Script

**Step 1: Create Startup Script**
1. Create a new file: `startup_fetch.bat`
2. Add this content:
```batch
@echo off
cd /d "C:\Users\richa\guideoverlay"
python illuvium_data_fetcher.py
```

**Step 2: Add to Startup**
1. Press `Win + R`
2. Type `shell:startup`
3. Press Enter
4. Copy `startup_fetch.bat` to this folder

### Option 3: Manual Setup (Simplest)

**Step 1: Create Desktop Shortcut**
1. Right-click on desktop
2. New > Shortcut
3. Location: `python illuvium_data_fetcher.py`
4. Name: "Update Illuvium Data"

**Step 2: Set Working Directory**
1. Right-click the shortcut
2. Properties
3. Start in: `C:\Users\richa\guideoverlay`
4. Click OK

## 🔍 Verification

### Check if Automation is Working

1. **Check Log File**: Look for `illuvium_fetcher.log` in your project folder
2. **Check JSON File**: Verify `latest_illuvium_builds.json` is being updated
3. **Check Task Scheduler**: Open Task Scheduler and look for your task

### Manual Test

Run this command to test the script:
```bash
python illuvium_data_fetcher.py
```

You should see output like:
```
🚀 Starting Illuvium data fetcher...
✅ API token loaded: v4.public...
🔄 Fetching leaderboard...
✅ Successfully fetched 5 players from leaderboard
...
✅ Data saved to latest_illuvium_builds.json
```

## 🛠️ Troubleshooting

### Common Issues

**Issue: "Access is denied"**
- Solution: Run Task Scheduler as Administrator

**Issue: Python not found**
- Solution: Use full path to Python executable
- Example: `C:\Python39\python.exe`

**Issue: Working directory not found**
- Solution: Use absolute path in "Start in" field
- Example: `C:\Users\richa\guideoverlay`

**Issue: API token not found**
- Solution: Make sure `.env` file exists in project directory

### Log Files

The script creates detailed logs in:
- `illuvium_fetcher.log` - Detailed execution log
- Console output - Real-time status

### Manual Override

If automation fails, you can always run manually:
```bash
cd C:\Users\richa\guideoverlay
python illuvium_data_fetcher.py
```

## 📅 Schedule Recommendations

- **Daily at 2:00 AM**: Recommended for most users
- **Every 6 hours**: For very active players
- **On startup**: If you want fresh data when you log in

## 🔄 Updating the App

After setting up automation, your app will automatically have fresh data every day. The frontend will load the latest `latest_illuvium_builds.json` file when you start the app.

## 📞 Support

If you encounter issues:
1. Check the log file: `illuvium_fetcher.log`
2. Verify your API token in `.env`
3. Test the script manually first
4. Check Windows Event Viewer for task scheduler errors 