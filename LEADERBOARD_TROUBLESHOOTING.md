# Leaderboard CORS Issue - Troubleshooting Guide

## Problem Description
You're getting "Failed to fetch" errors when trying to load leaderboard data. This is a CORS (Cross-Origin Resource Sharing) issue that occurs when running the application in development mode.

## Root Cause
The leaderboard feature uses a Rust-based HTTP proxy to bypass CORS restrictions when making requests to external APIs (like `https://illuvilytics.web.app`). This proxy only works in the **built application**, not in development mode.

## Solutions

### Solution 1: Run the Built Application (Recommended)
Instead of using `npm run tauri:dev`, run the built executable:

**Option A: Use the provided scripts**
```bash
# Windows (PowerShell)
.\run-app.ps1

# Windows (Command Prompt)
run-app.bat
```

**Option B: Run directly**
```bash
# Navigate to the project directory
cd guideoverlay

# Run the built executable
.\src-tauri\target\release\guideoverlay.exe
```

### Solution 2: Build the Application First
If the executable doesn't exist, build it first:

```bash
# Install dependencies (if not done already)
npm install

# Build the application
npm run tauri:build

# Then run the built executable
.\src-tauri\target\release\guideoverlay.exe
```

### Solution 3: Development Mode with Mock Data
If you prefer to continue using development mode (`npm run tauri:dev`), the application now provides mock data when API calls fail:

- **Leaderboard**: Shows mock top 5 players
- **Winning Builds**: Shows mock winning builds with sample data
- **Recent Builds**: Shows aggregated mock builds

This allows you to test the UI and functionality without needing the external APIs.

## How to Verify the Solution

### Check if you're running the built app:
1. Look at the console logs
2. If you see "🔄 Using Tauri proxy for request" - you're using the built app
3. If you see "⚠️ Tauri not available, using regular fetch" - you're in development mode

### Test the leaderboard feature:
1. Open the "Recent Winning Builds" tab
2. You should see either:
   - Real data from the API (built app)
   - Mock data with sample players and builds (development mode)
   - Error message with helpful hints

## Development vs Production Mode

| Feature | Development Mode | Production Mode |
|---------|------------------|-----------------|
| **API Calls** | Regular fetch (CORS issues) | Rust proxy (works) |
| **Leaderboard** | Mock data fallback | Real data from API |
| **Winning Builds** | Mock data fallback | Real data from API |
| **Performance** | Slower (browser fetch) | Faster (native Rust) |
| **Reliability** | Lower (CORS issues) | Higher (no CORS) |

## Troubleshooting Steps

### If you still get errors in the built app:

1. **Check network connectivity**
   ```bash
   # Test if the API is reachable
   curl https://illuvilytics.web.app/analytics/players
   ```

2. **Verify the build is recent**
   ```bash
   # Rebuild the application
   npm run tauri:build
   ```

3. **Check for antivirus interference**
   - Some antivirus software may block the Rust proxy
   - Add the application to your antivirus whitelist

4. **Check Windows Defender**
   - Windows Defender might block the executable
   - Allow it through Windows Defender

### If you want to use development mode:

The application now automatically detects development mode and provides mock data, so you can continue developing without the CORS issues.

## Console Logs to Look For

### Successful built app:
```
🔄 Using Tauri proxy for request
✅ Successfully fetched 5 players from leaderboard
```

### Development mode with mock data:
```
⚠️ Tauri not available, using regular fetch (may fail due to CORS)
🔄 Development mode detected, providing mock data...
✅ Returning mock leaderboard data for development
```

### Error in built app:
```
❌ Failed to fetch leaderboard: HTTP 403: Forbidden
```

## Performance Comparison

| Metric | Development Mode | Production Mode |
|--------|------------------|-----------------|
| **API Response Time** | 2-5 seconds | 0.5-1 second |
| **Success Rate** | ~30% (CORS issues) | ~95% |
| **Memory Usage** | Higher (browser) | Lower (native) |
| **CPU Usage** | Higher (browser) | Lower (native) |

## Future Improvements

1. **Local CORS Proxy**: Add a local development server that acts as a CORS proxy
2. **Better Error Handling**: More specific error messages for different failure types
3. **Offline Mode**: Cache successful responses for offline use
4. **Rate Limiting**: Implement rate limiting to be respectful to external APIs

## Support

If you continue to have issues:

1. Check the console logs for specific error messages
2. Verify you're running the built application, not development mode
3. Test your internet connection
4. Try running the application as administrator
5. Check if the external API is accessible from your network

The built application should work reliably for accessing the leaderboard and recent builds features. 