// Python Data API - reads output from illuvium_data_fetcher.py
import { LeaderboardPlayer, WinningBuild } from './leaderboardApi';

interface PythonBuildData {
  timestamp: string;
  players: Array<{
    username: string;
    rank: number;
    profile_url: string;
  }>;
  builds: Array<{
    player_name: string;
    player_rank: number;
    placement: number;
    illuvials: Array<{
      name: string;
      is_bonded: boolean;
      augments: string[];
    }>;
    bonded_illuvials: string[];
    suit: string;
    weapon: string;
    match_date: string;
    mode: string;
    game_id: string;
  }>;
}

let cachedData: PythonBuildData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadPythonData(): Promise<PythonBuildData> {
  const now = Date.now();
  
  // Check cache first
  if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('📊 Using cached Python data');
    return cachedData;
  }

  try {
    console.log('🔄 Loading Python data from latest_illuvium_builds.json...');
    
    // Try to fetch the JSON file
    const response = await fetch('/latest_illuvium_builds.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as PythonBuildData;
    
    // Update cache
    cachedData = data;
    lastFetchTime = now;
    
    console.log(`✅ Loaded Python data: ${data.players.length} players, ${data.builds.length} builds`);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to load Python data:', error);
    
    // Return empty data instead of mock data
    return {
      timestamp: new Date().toISOString(),
      players: [],
      builds: []
    };
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardPlayer[]> {
  const data = await loadPythonData();
  
  return data.players.map(player => ({
    username: player.username,
    rank: player.rank,
    profileUrl: player.profile_url
  }));
}

export async function getRecentWinningBuilds(): Promise<WinningBuild[]> {
  const data = await loadPythonData();
  
  return data.builds.map(build => ({
    placement: build.placement,
    illuvials: build.illuvials.map(ill => ill.name), // Extract just the names for backward compatibility
    augments: '', // No longer used since augments are per-illuvial
    suit: build.suit,
    weapon: build.weapon,
    matchDate: build.match_date,
    playerUsername: build.player_name,
    playerRank: build.player_rank,
    bonded_illuvials: build.bonded_illuvials
  }));
}

// New function to get detailed build data with per-illuvial augments
export async function getDetailedBuilds(): Promise<any[]> {
  const data = await loadPythonData();
  return data.builds;
}

export async function updateRecentBuilds(): Promise<WinningBuild[]> {
  console.log('🔄 Updating recent builds from Python data...');
  return await getRecentWinningBuilds();
}

export async function testAPI(): Promise<string> {
  try {
    const data = await loadPythonData();
    return `✅ Python API working: ${data.players.length} players, ${data.builds.length} builds, last updated: ${data.timestamp}`;
  } catch (error) {
    return `❌ Python API failed: ${error}`;
  }
}

export async function forceRefreshData(): Promise<WinningBuild[]> {
  // Clear cache to force fresh load
  cachedData = null;
  lastFetchTime = 0;
  
  console.log('🔄 Force refreshing Python data...');
  return await getRecentWinningBuilds();
} 