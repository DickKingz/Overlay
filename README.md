# DataKingz Illuvium Meta Guide

A professional desktop overlay application for Illuvium Arena Gauntlet that displays recent winning builds from top players, helping you stay competitive with real-time meta data.

## Features

- 🎮 **Desktop Overlay**: Always-on-top transparent overlay for in-game reference
- 🏆 **Recent Winning Builds**: Shows actual winning compositions from top 5 players
- 🔗 **Bonding Information**: Displays which Illuvials are bonded to the Ranger
- 🎯 **Player Filtering**: Filter builds by specific players or view all
- ⚡ **Global Hotkey**: Press `Ctrl+Shift+G` to toggle the overlay
- 🔄 **Daily Updates**: Automated data fetching with Windows Task Scheduler
- 📱 **Responsive Design**: Scales text and images for accessibility
- 🎨 **Modern UI**: Clean, professional interface with DataKingz branding

## Installation

### Prerequisites

1. **Rust** - Install from [rustup.rs](https://rustup.rs/)
2. **Node.js** - Install from [nodejs.org](https://nodejs.org/)
3. **Python 3.8+** - For data fetching automation

### Quick Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/DickKingz/Overlay.git
   cd Overlay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run tauri build
   ```

4. Run the application:
   ```bash
   .\src-tauri\target\release\guideoverlay.exe
   ```

## Configuration

### API Setup

1. Create a `.env` file in the root directory
2. Add your Illuvium API token:
   ```
   ILLUVIUM_API_TOKEN=your_token_here
   ```

### Daily Automation Setup

Run the automation setup script to configure daily data updates:

```bash
.\setup_automation.bat
```

This creates a Windows Task Scheduler job that runs daily at 2 AM.

## Usage

### Using the Overlay

1. **Start the application** - The overlay appears as a transparent window
2. **Position the overlay** - Drag it to your preferred location on screen
3. **Access settings** - Click the settings button to configure transparency and scaling
4. **View builds** - Browse recent winning builds from top players
5. **Filter by player** - Click on player cards to see their specific builds
6. **Toggle overlay** - Press `Ctrl+Shift+G` to show/hide the overlay

### Settings

- **Transparency**: Adjust overlay transparency (0-100%)
- **Text Size**: Scale text for better readability
- **Image Size**: Scale Illuvial and equipment images
- **About**: View app information and version

## Data Sources

- **Illuvium Analytics API**: Real-time leaderboard and match data
- **Python Automation**: Daily data fetching with 7-day match search window
- **Fallback Data**: Mock data when API is unavailable

## Technical Details

- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri (Rust) for desktop integration
- **Data Fetching**: Python script with reqwest HTTP client
- **Automation**: Windows Task Scheduler + PowerShell scripts
- **Platform**: Windows (with potential for macOS/Linux)

## File Structure

```
guideoverlay/
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── data/              # API modules and data
│   └── App.tsx            # Main application
├── src-tauri/             # Tauri backend
│   ├── src/               # Rust source code
│   └── Cargo.toml         # Rust dependencies
├── illuvium_data_fetcher.py  # Python data fetcher
├── setup_automation.bat   # Automation setup script
└── README_AUTOMATION.md   # Detailed automation guide
```

## Troubleshooting

### App won't quit properly
- The app uses a force quit command to ensure all processes terminate
- Check Task Manager if processes remain

### No data showing
- Verify your API token has proper permissions
- Check the Python script output for errors
- Ensure the JSON file is copied to the public directory

### Scaling not working
- Text and image scaling is applied via CSS variables
- Check that the settings sliders are working properly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This is an unofficial third-party application created by DataKingz. It is not affiliated with or endorsed by Illuvium. Use at your own risk.
