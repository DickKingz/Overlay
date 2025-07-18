# Illuvium Data Integration - Python Solution

This solution provides a complete system for fetching real Illuvium leaderboard data and integrating it with your Tauri overlay app.

## 🎯 **What This Solves**

- **Real Leaderboard Data**: Fetches actual top 5 players from Illuvium's official API
- **Daily Updates**: Automatically updates data every day via Windows Task Scheduler
- **App Integration**: Your overlay app reads the latest data on refresh
- **Fallback System**: Gracefully handles API failures with mock data
- **Caching**: Efficient caching to reduce API calls and improve performance

## 📁 **Files Overview**

### Python Scripts
- `illuvium_data_fetcher.py` - Main script that fetches leaderboard data
- `run_daily_fetch.bat` - Windows batch script to run the Python script
- `setup_daily_task.ps1` - PowerShell script to set up scheduled task
- `requirements.txt` - Python dependencies

### Frontend Integration
- `src/data/pythonDataApi.ts` - New API module that reads Python output
- Updated `src/App.tsx` - Uses the new Python data API

### Configuration
- `.env` - Contains your Illuvium API token
- `ILLUVIUM_API_README.md` - Detailed API documentation

## 🚀 **Quick Setup**

### 1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

### 2. **Set Up API Token**
Create a `.env` file in your project root:
```
ILLUVIUM_API_TOKEN=your_api_token_here
```

### 3. **Test the Script**
```bash
python illuvium_data_fetcher.py
```

### 4. **Set Up Daily Task (Optional)**
Run PowerShell as Administrator and execute:
```powershell
.\setup_daily_task.ps1
```

### 5. **Test the Integration**
Run your app and check the "Recent Winning Builds" tab - it should now show real leaderboard data!

## 📊 **How It Works**

### **Data Flow**
1. **Python Script** → Fetches leaderboard from Illuvium API
2. **JSON Output** → Saves to `latest_illuvium_builds.json`
3. **Frontend App** → Reads JSON file on refresh
4. **Caching** → Stores data for 24 hours to reduce API calls

### **Current Status**
- ✅ **Leaderboard API**: Working perfectly (real usernames, ratings, stats)
- ⚠️ **Search API**: Requires authentication (currently using mock builds)
- ✅ **Fallback System**: Graceful degradation when APIs fail
- ✅ **Caching**: Efficient 24-hour caching system

## 🔧 **Manual Usage**

### **Run Once**
```bash
python illuvium_data_fetcher.py
```

### **Run with Batch Script**
```bash
.\run_daily_fetch.bat
```

### **Force Refresh in App**
Click the "Force Refresh" button in your app's "Recent Winning Builds" tab.

## 📈 **Sample Output**

The script generates output like this:

```
============================================================
ILLUVIUM GAUNTLET BUILD ANALYSIS
Generated: 2025-07-16T14:13:50.717315
============================================================

1. FoxspiritlAtlas
   Rating: 2784
   Total Games: 152
   Win Rate: 0.58
   Rank Title: Grandmaster 1
   Recent Builds:
     1. 1st Place (2025-07-16)
        Illuvials: Axolotl, Pterodactyl, SeaScorpion
        Augments: Apex, Defiance, Fury
        Suit: AdamantineShield
        Weapon: AquaBlaster
```

## 🔄 **Scheduled Task Setup**

### **Automatic Setup**
1. Right-click PowerShell → "Run as Administrator"
2. Navigate to your project directory
3. Run: `.\setup_daily_task.ps1`

### **Manual Setup**
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task
3. Name: `IlluviumDataFetcher`
4. Trigger: Daily at 9:00 AM
5. Action: Start a program
6. Program: `C:\path\to\your\project\run_daily_fetch.bat`

## 🛠️ **Troubleshooting**

### **Python Script Issues**
- **No API token**: Check `.env` file exists and has correct token
- **Import errors**: Run `pip install -r requirements.txt`
- **Permission errors**: Run as Administrator if needed

### **App Integration Issues**
- **No data showing**: Check if `latest_illuvium_builds.json` exists
- **Cache issues**: Click "Force Refresh" button
- **File not found**: Ensure JSON files are in the correct directory

### **Scheduled Task Issues**
- **Task not running**: Check Task Scheduler for errors
- **Permission denied**: Ensure task runs as SYSTEM or with proper permissions
- **Path issues**: Use absolute paths in batch script

## 🔮 **Future Enhancements**

### **When Search API is Available**
1. Update the Python script to use real match data
2. Replace mock builds with actual player builds
3. Add more detailed match statistics

### **Additional Features**
- Multiple game modes (Ranked, Arena, etc.)
- Historical data tracking
- Performance analytics
- Build win rate analysis

## 📝 **API Documentation**

### **Leaderboard API**
- **Endpoint**: `https://api.illuvium-game.io/gamedata/gauntlet/leaderboard`
- **Method**: GET
- **Parameters**: `mode=Gauntlet&limit=100`
- **Response**: JSON with `entries` array containing player data

### **Search API** (Requires Authentication)
- **Endpoint**: `https://api.illuvium-game.io/gamedata/public/v1/gauntlet/search`
- **Method**: POST
- **Headers**: `Authorization: Bearer <your_token>`
- **Status**: Currently returns 401 Unauthorized

## 🎉 **Success Metrics**

- ✅ Real leaderboard data from Illuvium API
- ✅ Automatic daily updates
- ✅ Seamless app integration
- ✅ Robust error handling
- ✅ Efficient caching system
- ✅ User-friendly interface

Your overlay app now has access to real, up-to-date Illuvium leaderboard data that refreshes automatically every day! 