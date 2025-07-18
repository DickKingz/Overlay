# Illuvium Guide Overlay

A transparent overlay application for Illuvium that displays meta builds and community compositions to help players choose optimal strategies in-game.

## Features

- 🎮 **Transparent Overlay**: Discord-style overlay that appears on top of the game
- 🔥 **Meta Builds**: Shows top-performing builds from the community
- ⚡ **Global Hotkey**: Press `Ctrl+Shift+G` to toggle the overlay
- 🎯 **Build Selection**: Click on builds to highlight and study them
- 🌐 **API Integration**: Fetches real-time data from Illuvium's API
- 📱 **Responsive Design**: Works on different screen sizes

## Installation

### Prerequisites

1. **Rust** - Install from [rustup.rs](https://rustup.rs/)
2. **Node.js** - Install from [nodejs.org](https://nodejs.org/)

### Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Rust dependencies:
   ```bash
   cd src-tauri
   cargo build
   ```

## Usage

### Development Mode

```bash
npm run tauri dev
```

This will start the application in development mode with hot reloading.

### Production Build

```bash
npm run tauri build
```

This creates a production build in the `src-tauri/target/release/` directory.

### Using the Overlay

1. **Start the application** - The overlay will appear as a transparent window
2. **Position the overlay** - Drag it to your preferred location on screen
3. **Configure API access** - Click the settings button and enter your Illuvium API key
4. **Load builds** - Click "Refresh" to fetch latest meta builds or "Demo" to see sample data
5. **Toggle overlay** - Press `Ctrl+Shift+G` to show/hide the overlay
6. **Select builds** - Click on any build card to highlight it for reference

## API Configuration

To access real-time build data, you'll need an Illuvium API key:

1. Visit the [Illuvium Developer Portal](https://developer.illuvium.io) (if available)
2. Create an account and generate an API key
3. Click the settings button in the overlay
4. Enter your API key and save

## Overlay Controls

- **Settings** ⚙️ - Configure API key
- **Demo** 📋 - Load sample build data
- **Refresh** 🔄 - Fetch latest builds from API
- **Hide** 👁️ - Hide the overlay (or use `Ctrl+Shift+G`)

## Build Information

Each build card shows:
- **Player Name** - The player who used this build
- **Win Rate** - Success rate percentage
- **Composition** - List of Illuvials in the build
- **Synergies** - Detected synergy types
- **Rank & Games** - Player rank and number of games played

## Technical Details

- Built with [Tauri](https://tauri.app/) + React + TypeScript
- Uses Illuvium's official API for game data
- Supports Windows, macOS, and Linux
- Minimal system resources usage
- Always-on-top overlay functionality

## Troubleshooting

### Overlay not appearing
- Check if the application is running in the system tray
- Try pressing `Ctrl+Shift+G` to toggle visibility
- Ensure the window isn't positioned off-screen

### API errors
- Verify your API key is correct
- Check your internet connection
- Ensure the Illuvium API is accessible

### Performance issues
- Close other overlay applications
- Reduce the number of displayed builds
- Check system resource usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This is an unofficial third-party application. It is not affiliated with or endorsed by Illuvium. Use at your own risk.
