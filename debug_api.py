#!/usr/bin/env python3
"""
Debug script to examine Illuvium API responses
"""

import requests
import json

def debug_api():
    base_url = "https://api.illuvium-game.io"
    leaderboard_url = f"{base_url}/gamedata/gauntlet/leaderboard"
    search_url = f"{base_url}/gamedata/public/v1/gauntlet/search"
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    
    # Test leaderboard API
    print("=== TESTING LEADERBOARD API ===")
    modes = ["Gauntlet", "Ranked", "Arena"]
    
    for mode in modes:
        print(f"\n--- Testing mode: {mode} ---")
        try:
            params = {'mode': mode, 'limit': 10}
            response = session.get(leaderboard_url, params=params, timeout=30)
            print(f"Status Code: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response type: {type(data)}")
                print(f"Response length: {len(data) if isinstance(data, list) else 'N/A'}")
                print(f"First item type: {type(data[0]) if isinstance(data, list) and len(data) > 0 else 'N/A'}")
                print(f"Raw response (first 1000 chars): {str(data)[:1000]}")
                
                # Save to file for inspection
                with open(f"debug_leaderboard_{mode.lower()}.json", 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"Saved to debug_leaderboard_{mode.lower()}.json")
            else:
                print(f"Error response: {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")
    
    # Test search API
    print("\n\n=== TESTING SEARCH API ===")
    try:
        payload = {
            "players": ["test_player"],
            "cursor": "",
            "count": "10",
            "startDate": "2024-01-01T00:00:00",
            "endDate": "2024-12-31T23:59:59",
            "includeRoundsData": True,
            "mode": "Gauntlet"
        }
        
        response = session.post(search_url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response type: {type(data)}")
            print(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
            print(f"Raw response (first 1000 chars): {str(data)[:1000]}")
            
            # Save to file for inspection
            with open("debug_search.json", 'w') as f:
                json.dump(data, f, indent=2)
            print("Saved to debug_search.json")
        else:
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_api() 