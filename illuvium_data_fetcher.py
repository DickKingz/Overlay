#!/usr/bin/env python3
"""
Illuvium Gauntlet Data Fetcher
Fetches top 5 players' recent builds from Illuvium's Gauntlet APIs
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import time

# Load API token from .env file
def load_api_token():
    """Load API token from .env file"""
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('ILLUVIUM_API_TOKEN='):
                    return line.split('=', 1)[1].strip().strip('"')
    except FileNotFoundError:
        print("⚠️ .env file not found")
        return None
    return None

API_TOKEN = load_api_token()
if not API_TOKEN:
    print("❌ No API token found in .env file")
    print("Please add ILLUVIUM_API_TOKEN=your_token_here to .env file")
    exit(1)

print(f"✅ API token loaded: {API_TOKEN[:20]}...")

@dataclass
class LeaderboardPlayer:
    username: str
    rank: int
    profile_url: str

@dataclass
class Illuvial:
    name: str
    is_bonded: bool = False
    augments: List[str] = None

@dataclass
class WinningBuild:
    player_name: str
    player_rank: int
    placement: int
    illuvials: List[Illuvial]
    suit: str
    weapon: str
    match_date: str
    mode: str
    game_id: str = ""

def fetch_leaderboard() -> List[LeaderboardPlayer]:
    """Fetch top 5 players from public leaderboard endpoint"""
    url = "https://api.illuvium-game.io/gamedata/gauntlet/leaderboard?mode=Gauntlet&limit=100"
    try:
        print("🔄 Fetching leaderboard...")
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            data = response.json()
            players = []
            # Extract top 5 players from 'entries'
            for i, player in enumerate(data.get('entries', [])[:5]):
                players.append(LeaderboardPlayer(
                    username=player.get('nickname', f'Player{i+1}'),
                    rank=player.get('position', i+1),
                    profile_url=f"https://illuvilytics.web.app/profile/{player.get('nickname')}"
                ))
            print(f"✅ Successfully fetched {len(players)} players from leaderboard")
            return players
        else:
            print(f"❌ Leaderboard API failed: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"❌ Error fetching leaderboard: {e}")
        return []

def search_player_matches(player_name: str, days_back: int = 7) -> List[Dict[str, Any]]:
    """Search for player's recent matches using the confirmed API format"""
    url = "https://api.illuvium-game.io/gamedata/public/v1/gauntlet/search"
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    headers = {
        "Authorization": f"token {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Use the exact format that works
    payload = {
        "players": [player_name],
        "startDate": start_date.strftime("%Y-%m-%dT%H:%M:%S"),
        "endDate": end_date.strftime("%Y-%m-%dT%H:%M:%S"),
        "includeRoundsData": True,
        "mode": "Ranked"
    }
    
    try:
        print(f"🔄 Searching matches for {player_name} from {start_date} to {end_date}...")
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            games = data.get('games', [])
            print(f"✅ Found {len(games)} games for {player_name}")
            # Debug: print type and sample of games
            if games:
                print(f"Type of games[0]: {type(games[0])}")
                print(f"Sample games[0]: {str(games[0])[:500]}")
                if len(games) > 1:
                    print(f"Type of games[1]: {type(games[1])}")
                    print(f"Sample games[1]: {str(games[1])[:500]}")
            return games
        else:
            print(f"❌ Match search failed for {player_name}: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Error searching matches for {player_name}: {e}")
        return []

def extract_builds_from_matches(matches: List[Dict[str, Any]], player_name: str, player_rank: int) -> List[WinningBuild]:
    """Extract winning builds from matches"""
    builds = []
    
    for game in matches:  # API returns 'games' not 'matches'
        try:
            # Check if player won (rank = 1 in results)
            results = game.get('results', [])
            player_result = next((r for r in results if r.get('player') == player_name), None)
            
            if not player_result:
                continue
                
            placement = player_result.get('rank', 0)
            if placement != 1:  # Only winning builds
                continue
            
            # Extract build data from the last round
            rounds = game.get('rounds', [])
            if not rounds:
                continue
                
            last_round = rounds[-1]  # Get the final round
            matchups = last_round.get('matchups', [])
            
            # Find the player's matchup in the last round, skip non-dict matchups
            player_matchup = None
            for matchup in matchups:
                if not isinstance(matchup, dict):
                    continue
                blue_player = matchup.get('blue', {}).get('player')
                red_player = matchup.get('red', {}).get('player')
                if blue_player == player_name:
                    player_matchup = matchup.get('blue')
                    break
                elif red_player == player_name:
                    player_matchup = matchup.get('red')
                    break
            
            if not player_matchup:
                continue
            
            # Extract Illuvials and their augments from the last round
            illuvials = []
            
            # Get only the winning player's Illuvials
            player_illuvials = player_matchup.get('illuvials', [])
            
            # Validate Illuvial count (should be 7-10 for winning teams)
            if len(player_illuvials) > 10:
                print(f"⚠️ Warning: {player_name} has {len(player_illuvials)} Illuvials (expected 7-10)")
                # Take only the first 10 to avoid invalid builds
                player_illuvials = player_illuvials[:10]
            elif len(player_illuvials) < 7:
                print(f"⚠️ Warning: {player_name} has {len(player_illuvials)} Illuvials (expected 7-10)")
            
            for illuvial in player_illuvials:
                if not isinstance(illuvial, dict):
                    continue
                    
                illuvial_name = illuvial.get('name', 'Unknown')
                is_bonded = illuvial.get('isBonded', False)
                
                # Extract augments for this specific Illuvial
                illuvial_augments = []
                for augment in illuvial.get('augments', []):
                    if isinstance(augment, str):
                        illuvial_augments.append(augment)
                    elif isinstance(augment, dict):
                        augment_name = augment.get('name', 'Unknown')
                        illuvial_augments.append(augment_name)
                
                illuvials.append(Illuvial(
                    name=illuvial_name, 
                    is_bonded=is_bonded,
                    augments=illuvial_augments
                ))
            
            suit = player_matchup.get('suit', 'Unknown')
            weapon = player_matchup.get('weapon', 'Unknown')
            
            # Extract game ID and format date
            game_id = game.get('gameId', game.get('id', ''))
            match_date = game.get('startTime', '')
            
            # Format date if it exists
            if match_date:
                try:
                    # Parse ISO date and format it nicely
                    from datetime import datetime
                    parsed_date = datetime.fromisoformat(match_date.replace('Z', '+00:00'))
                    formatted_date = parsed_date.strftime('%Y-%m-%d %H:%M UTC')
                except:
                    formatted_date = match_date
            else:
                formatted_date = 'Unknown'
            
            build = WinningBuild(
                player_name=player_name,
                player_rank=player_rank,
                placement=placement,
                illuvials=illuvials,
                suit=suit,
                weapon=weapon,
                match_date=formatted_date,
                mode=game.get('mode'),
                game_id=game_id
            )
            
            builds.append(build)
            print(f"✅ Extracted winning build for {player_name}: {len(illuvials)} Illuvials")
            
        except Exception as e:
            print(f"❌ Error extracting build from game: {e}")
            continue
    
    return builds



def main():
    """Function to fetch and process data"""
    import logging
    
    # Set up logging for automation
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('illuvium_fetcher.log'),
            logging.StreamHandler()
        ]
    )
    
    logger = logging.getLogger(__name__)
    logger.info("🚀 Starting Illuvium data fetcher...")
    
    try:
        # Fetch leaderboard
        players = fetch_leaderboard()
        
        all_builds = []
        
        # Fetch builds for each player
        for player in players:
            logger.info(f"📊 Processing {player.username} (Rank {player.rank})...")
            
            # Search for matches
            matches = search_player_matches(player.username)
            
            if matches:
                # Extract builds from matches
                builds = extract_builds_from_matches(matches, player.username, player.rank)
                all_builds.extend(builds)
                logger.info(f"✅ Extracted {len(builds)} winning builds for {player.username}")
            else:
                # No matches found - skip this player
                logger.warning(f"⚠️ No matches found for {player.username}, skipping")
            
            # Add delay between requests
            time.sleep(1)
        
        # Prepare output data
        output_data = {
            "timestamp": datetime.now().isoformat(),
            "players": [asdict(player) for player in players],
            "builds": []
        }
        
        # Convert builds to serializable format
        for build in all_builds:
            build_dict = asdict(build)
            # Convert Illuvial objects to detailed format for frontend
            build_dict["illuvials"] = [
                {
                    "name": ill.name,
                    "is_bonded": ill.is_bonded,
                    "augments": ill.augments or []
                }
                for ill in build.illuvials
            ]
            build_dict["bonded_illuvials"] = [ill.name for ill in build.illuvials if ill.is_bonded]
            build_dict["game_id"] = build.game_id
            output_data["builds"].append(build_dict)
        
        # Save to JSON file
        output_file = "latest_illuvium_builds.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        # Also copy to public directory for frontend
        import shutil
        try:
            shutil.copy2(output_file, "public/latest_illuvium_builds.json")
            logger.info("✅ Data copied to public directory")
        except Exception as e:
            logger.warning(f"⚠️ Could not copy to public directory: {e}")
        
        logger.info(f"✅ Data saved to {output_file}")
        logger.info(f"📊 Total builds: {len(all_builds)}")
        logger.info(f"👥 Players processed: {len(players)}")
        
        # Print summary
        for player in players:
            player_builds = [b for b in all_builds if b.player_name == player.username]
            logger.info(f"  {player.username}: {len(player_builds)} builds")
            
    except Exception as e:
        logger.error(f"❌ Error in main execution: {e}")
        raise

if __name__ == "__main__":
    main() 