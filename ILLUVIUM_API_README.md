# Illuvium Gauntlet Data Fetcher

This Python script fetches and analyzes the top 5 players' recent builds from Illuvium's Gauntlet APIs.

## Features

- Fetches leaderboard data from Illuvium's official API
- Extracts recent builds for top players
- Handles pagination automatically
- Saves results to JSON files
- Comprehensive error handling and logging
- Respectful API usage with delays

## Installation

1. Make sure you have Python 3.7+ installed
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

Run the script directly:

```bash
python illuvium_data_fetcher.py
```

The script will:
1. Try to fetch data from different game modes (Gauntlet, Ranked, Arena)
2. Display results in the console
3. Save results to JSON files (e.g., `illuvium_builds_gauntlet.json`)

### Custom Usage

You can also use the script as a module in your own code:

```python
from illuvium_data_fetcher import IlluviumDataFetcher

fetcher = IlluviumDataFetcher()

# Fetch top 5 players' builds for Gauntlet mode
results = fetcher.fetch_top_players_builds(top_n=5, mode="Gauntlet")

# Print results
fetcher.print_results(results)

# Save to custom filename
fetcher.save_results(results, "my_custom_results.json")
```

## API Endpoints

The script uses these Illuvium API endpoints:

- **Leaderboard**: `https://api.illuvium-game.io/gamedata/gauntlet/leaderboard`
- **Search**: `https://api.illuvium-game.io/gamedata/public/v1/gauntlet/search`

## Output Format

The script generates structured JSON output with:

```json
{
  "top_players": [
    {
      "username": "PlayerName",
      "rank": 1,
      "rating": 2500,
      "total_games": 150,
      "builds": [
        {
          "match_date": "2024-01-15T10:30:00",
          "placement": 1,
          "illuvials": ["Axolotl", "Pterodactyl", "SeaScorpion"],
          "augments": ["ApexSupercharger", "GuardiansGrid"],
          "suit": "AdamantineShield",
          "weapon": "AquaBlaster"
        }
      ]
    }
  ],
  "builds": [...],
  "summary": {
    "total_players_analyzed": 5,
    "total_builds_found": 25,
    "date_range": "2024-01-01T00:00:00 to 2024-01-31T23:59:59",
    "mode": "Gauntlet"
  }
}
```

## Configuration

### Date Range
By default, the script fetches data from the last 30 days. You can modify this in the `fetch_top_players_builds` method:

```python
# Calculate date range (last 30 days)
end_date = datetime.datetime.now()
start_date = end_date - datetime.timedelta(days=30)  # Change this number
```

### Number of Players
Change the `top_n` parameter to analyze more or fewer players:

```python
results = fetcher.fetch_top_players_builds(top_n=10, mode="Gauntlet")
```

### Game Modes
The script tries these modes in order:
1. Gauntlet
2. Ranked  
3. Arena

You can modify the `modes_to_try` list in the `main()` function.

## Error Handling

The script includes comprehensive error handling for:
- Network timeouts
- API rate limiting
- Invalid JSON responses
- Missing data fields
- Authentication issues

## Logging

The script provides detailed logging with timestamps. Log levels:
- INFO: Normal operation messages
- WARNING: Non-critical issues
- ERROR: Critical failures

## API Rate Limiting

The script includes built-in delays to be respectful to the API:
- 0.5 seconds between pagination requests
- 1 second between player requests

## Troubleshooting

### Common Issues

1. **"Failed to fetch leaderboard data"**
   - Check your internet connection
   - Verify the API endpoints are accessible
   - The API might be temporarily down

2. **"No recent builds found"**
   - Players might not have played recently
   - Try a longer date range
   - Check if the game mode is correct

3. **Authentication errors**
   - The API might require authentication
   - Check if the endpoints are still public

### Debug Mode

To see more detailed information, you can modify the logging level:

```python
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
```

## Integration with Your App

To integrate this data with your Tauri app:

1. Run the Python script periodically to generate JSON files
2. Read the JSON files in your frontend
3. Update your mock data with real data from the JSON files

Example integration:

```typescript
// In your frontend
import realData from './illuvium_builds_gauntlet.json';

// Use real data instead of mock data
const recentBuilds = realData.builds.map(build => ({
  placement: build.placement,
  illuvials: build.illuvials,
  augments: build.augments || '',
  suit: build.suit || '',
  weapon: build.weapon || '',
  matchDate: build.match_date,
  playerUsername: build.player_username
}));
```

## License

This script is provided as-is for educational and development purposes. Please respect Illuvium's API terms of service. 