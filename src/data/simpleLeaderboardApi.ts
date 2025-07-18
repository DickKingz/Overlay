// Simplified Leaderboard API for Illuvium Analytics
// This version uses real Illuvium API endpoints

export interface LeaderboardPlayer {
  username: string;
  profileUrl: string;
  rank: number;
  rating?: number;
  totalGames?: number;
}

export interface WinningBuild {
  placement: number;
  illuvials: string[];
  augments: string;
  suit: string;
  weapon: string;
  matchDate?: string;
  playerUsername?: string;
  playerRank?: number;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (shorter for testing)
const LEADERBOARD_CACHE_KEY = 'simple_leaderboard_cache';
const BUILDS_CACHE_KEY = 'simple_builds_cache';

// Real Illuvium API endpoints
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ILLUVIUM_API_BASE = 'https://rfbr1inpug.execute-api.eu-north-1.amazonaws.com';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AUGMENTS_API_BASE = 'https://ksg1wbyee3.execute-api.eu-north-1.amazonaws.com';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MATCH_STATS_API = 'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/MatchStats';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MATCH_HISTORY_API = 'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/Match_history';
const PLAYER_ANALYTICS_API = 'https://px0zcp4nka.execute-api.eu-north-1.amazonaws.com/prod/players';

// Alternative endpoints to try
const ALTERNATIVE_ENDPOINTS = {
  matchStats: [
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/MatchStats',
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/matchstats',
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/match-stats',
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/stats'
  ],
  matchHistory: [
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/Match_history',
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/match_history',
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/match-history',
    'https://8m0g8xh3g6.execute-api.eu-north-1.amazonaws.com/history'
  ],
  illuvialsStats: [
    'https://rfbr1inpug.execute-api.eu-north-1.amazonaws.com/illuvials-stats',
    'https://rfbr1inpug.execute-api.eu-north-1.amazonaws.com/illuvials_stats',
    'https://rfbr1inpug.execute-api.eu-north-1.amazonaws.com/stats'
  ],
  augmentsStats: [
    'https://ksg1wbyee3.execute-api.eu-north-1.amazonaws.com/Augments-stats',
    'https://ksg1wbyee3.execute-api.eu-north-1.amazonaws.com/augments-stats',
    'https://ksg1wbyee3.execute-api.eu-north-1.amazonaws.com/stats'
  ]
};



// Utility functions
function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp < CACHE_DURATION) {
      return data.data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

// Enhanced fetch with multiple fallback strategies and authentication headers
async function enhancedFetch(url: string): Promise<Response> {
  const strategies = [
    // Strategy 1: Direct fetch with auth headers
    () => fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Authorization': 'Bearer illuvium-api-key',
        'X-API-Key': 'illuvium-api-key'
      }
    }),
    
    // Strategy 2: Direct fetch without auth
    () => fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }),
    
    // Strategy 3: CORS proxy
    () => fetch(`https://cors-anywhere.herokuapp.com/${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }),
    
    // Strategy 4: Alternative CORS proxy
    () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
      method: 'GET'
    })
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`🔄 Trying fetch strategy ${i + 1} for ${url}`);
      const response = await strategies[i]();
      
      if (response.ok) {
        console.log(`✅ Strategy ${i + 1} succeeded`);
        return response;
      } else {
        console.log(`❌ Strategy ${i + 1} failed with status: ${response.status}`);
        // If we get a 401/403, try the next strategy
        if (response.status === 401 || response.status === 403) {
          continue;
        }
      }
    } catch (error) {
      console.log(`❌ Strategy ${i + 1} failed:`, error);
      continue;
    }
  }
  
  throw new Error('All fetch strategies failed');
}

// Try multiple endpoints for a given type
async function tryMultipleEndpoints(endpointType: keyof typeof ALTERNATIVE_ENDPOINTS): Promise<any> {
  const endpoints = ALTERNATIVE_ENDPOINTS[endpointType];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🌐 Trying endpoint: ${endpoint}`);
      const response = await enhancedFetch(endpoint);
      const data = await response.json();
      
      // Check if we got a valid response (not an error message)
      if (data && typeof data === 'object' && !data.message) {
        console.log(`✅ Success with endpoint: ${endpoint}`);
        return data;
      } else if (data && Array.isArray(data) && data.length > 0) {
        console.log(`✅ Success with endpoint: ${endpoint} (array response)`);
        return data;
      } else {
        console.log(`⚠️ Invalid response from ${endpoint}:`, data);
      }
    } catch (error) {
      console.log(`❌ Failed with endpoint ${endpoint}:`, error);
      continue;
    }
  }
  
  throw new Error(`All endpoints failed for ${endpointType}`);
}

// Fetch match stats to get top players
async function fetchMatchStats(): Promise<any> {
  try {
    console.log('🌐 Fetching match stats from Illuvium API...');
    return await tryMultipleEndpoints('matchStats');
  } catch (error) {
    console.error('Failed to fetch match stats:', error);
    throw error;
  }
}

// Fetch match history for recent games
async function fetchMatchHistory(): Promise<any> {
  try {
    console.log('🌐 Fetching match history from Illuvium API...');
    return await tryMultipleEndpoints('matchHistory');
  } catch (error) {
    console.error('Failed to fetch match history:', error);
    throw error;
  }
}

// Fetch player analytics
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchPlayerAnalytics(playerName: string): Promise<any> {
  try {
    console.log(`🌐 Fetching analytics for player: ${playerName}`);
    const url = `${PLAYER_ANALYTICS_API}/${encodeURIComponent(playerName)}/analytics`;
    const response = await enhancedFetch(url);
    const data = await response.json();
    console.log(`📊 Player analytics for ${playerName}:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch analytics for ${playerName}:`, error);
    throw error;
  }
}

// Fetch illuvials stats (might contain useful data)
async function fetchIlluvialsStats(): Promise<any> {
  try {
    console.log('🌐 Fetching illuvials stats from Illuvium API...');
    return await tryMultipleEndpoints('illuvialsStats');
  } catch (error) {
    console.error('Failed to fetch illuvials stats:', error);
    throw error;
  }
}

// Fetch augments stats (might contain useful data)
async function fetchAugmentsStats(): Promise<any> {
  try {
    console.log('🌐 Fetching augments stats from Illuvium API...');
    return await tryMultipleEndpoints('augmentsStats');
  } catch (error) {
    console.error('Failed to fetch augments stats:', error);
    throw error;
  }
}

// Parse match stats to extract top players
function parseTopPlayersFromMatchStats(matchStats: any): LeaderboardPlayer[] {
  const players: LeaderboardPlayer[] = [];
  
  try {
    console.log('🔍 Parsing match stats for top players...');
    
    // Try different possible structures
    if (matchStats.players && Array.isArray(matchStats.players)) {
      // Sort by rating/rank and take top 5
      const sortedPlayers = matchStats.players
        .sort((a: any, b: any) => (b.rating || b.rank || 0) - (a.rating || a.rank || 0))
        .slice(0, 5);
      
      sortedPlayers.forEach((player: any, index: number) => {
        players.push({
          username: player.username || player.name || player.playerName || `Player${index + 1}`,
          profileUrl: `${PLAYER_ANALYTICS_API}/${encodeURIComponent(player.username || player.name || player.playerName)}/analytics`,
          rank: index + 1,
          rating: player.rating || player.rank || 0,
          totalGames: player.totalGames || player.games || 0
        });
      });
    } else if (matchStats.topPlayers && Array.isArray(matchStats.topPlayers)) {
      matchStats.topPlayers.forEach((player: any, index: number) => {
        players.push({
          username: player.username || player.name || player.playerName || `Player${index + 1}`,
          profileUrl: `${PLAYER_ANALYTICS_API}/${encodeURIComponent(player.username || player.name || player.playerName)}/analytics`,
          rank: index + 1,
          rating: player.rating || player.rank || 0,
          totalGames: player.totalGames || player.games || 0
        });
      });
    } else {
      // Try to extract from any array in the response
      const possibleArrays = Object.values(matchStats).filter(Array.isArray);
      if (possibleArrays.length > 0) {
        const largestArray = possibleArrays.reduce((a: any, b: any) => a.length > b.length ? a : b);
        largestArray.slice(0, 5).forEach((player: any, index: number) => {
          if (player && typeof player === 'object') {
            players.push({
              username: player.username || player.name || player.playerName || `Player${index + 1}`,
              profileUrl: `${PLAYER_ANALYTICS_API}/${encodeURIComponent(player.username || player.name || player.playerName)}/analytics`,
              rank: index + 1,
              rating: player.rating || player.rank || 0,
              totalGames: player.totalGames || player.games || 0
            });
          }
        });
      }
    }
    
    console.log(`✅ Parsed ${players.length} top players from match stats`);
    return players;
  } catch (error) {
    console.error('Failed to parse top players from match stats:', error);
    throw error;
  }
}

// Parse match history to extract winning builds
function parseWinningBuildsFromMatchHistory(matchHistory: any, playerName: string): WinningBuild[] {
  const builds: WinningBuild[] = [];
  
  try {
    console.log(`🔍 Parsing match history for winning builds of ${playerName}...`);
    
    // Try different possible structures
    let matches: any[] = [];
    
    if (matchHistory.matches && Array.isArray(matchHistory.matches)) {
      matches = matchHistory.matches;
    } else if (matchHistory.games && Array.isArray(matchHistory.games)) {
      matches = matchHistory.games;
    } else if (Array.isArray(matchHistory)) {
      matches = matchHistory;
    } else {
      // Try to find any array in the response
      const possibleArrays = Object.values(matchHistory).filter(Array.isArray);
      if (possibleArrays.length > 0) {
        matches = possibleArrays.reduce((a: any, b: any) => a.length > b.length ? a : b);
      }
    }
    
    // Filter matches for the specific player and winning placements
    const playerMatches = matches.filter((match: any) => {
      const players = match.players || match.participants || [];
      return players.some((p: any) => 
        (p.username || p.name || p.playerName) === playerName && 
        (p.placement || p.rank) <= 3
      );
    });
    
    // Extract build data from winning matches
    playerMatches.slice(0, 10).forEach((match: any) => {
      const player = (match.players || match.participants || []).find((p: any) => 
        (p.username || p.name || p.playerName) === playerName
      );
      
      if (player) {
        const placement = player.placement || player.rank || 1;
        
        // Extract build components
        const illuvials = player.illuvials || player.creatures || player.characters || [];
        const augments = player.augments || player.items || [];
        const suit = player.suit || player.armor || 'No suit listed';
        const weapon = player.weapon || player.mainWeapon || 'No weapon listed';
        
        builds.push({
          placement,
          illuvials: Array.isArray(illuvials) ? illuvials : [illuvials].filter(Boolean),
          augments: Array.isArray(augments) ? augments.join(', ') : augments || 'No augments listed',
          suit,
          weapon,
          matchDate: match.date || match.timestamp || new Date().toISOString().split('T')[0],
          playerUsername: playerName
        });
      }
    });
    
    console.log(`✅ Parsed ${builds.length} winning builds for ${playerName}`);
    return builds;
  } catch (error) {
    console.error(`Failed to parse winning builds for ${playerName}:`, error);
    throw error;
  }
}

/**
 * Fetch top 5 players from leaderboard using real API
 */
export async function fetchLeaderboard(): Promise<LeaderboardPlayer[]> {
  console.log('🔄 Fetching leaderboard data...');
  
  // Check cache first
  const cached = getCachedData<LeaderboardPlayer[]>(LEADERBOARD_CACHE_KEY);
  if (cached) {
    console.log('📊 Using cached leaderboard data');
    return cached;
  }

  try {
    // Try to fetch real data from match stats API
    console.log('🌐 Attempting to fetch real leaderboard data from Illuvium API...');
    const matchStats = await fetchMatchStats();
    const players = parseTopPlayersFromMatchStats(matchStats);
    
    if (players.length > 0) {
      setCachedData(LEADERBOARD_CACHE_KEY, players);
      console.log(`✅ Successfully fetched ${players.length} players from Illuvium API`);
      return players;
    } else {
      console.log('⚠️ No players parsed from real data, falling back to mock');
    }
  } catch (error) {
    console.warn('Failed to fetch real leaderboard data:', error);
  }

  // Return empty array instead of mock data
  console.log('🔄 Returning empty leaderboard data');
  setCachedData(LEADERBOARD_CACHE_KEY, []);
  return [];
}

/**
 * Fetch winning builds for a specific player using real API
 */
export async function fetchPlayerWinningBuilds(player: LeaderboardPlayer): Promise<WinningBuild[]> {
  console.log(`🔍 Fetching winning builds for ${player.username}...`);
  
  const cacheKey = `${BUILDS_CACHE_KEY}_${player.username}`;
  
  // Check cache first
  const cached = getCachedData<WinningBuild[]>(cacheKey);
  if (cached) {
    console.log(`📊 Using cached builds for ${player.username}`);
    return cached;
  }

  try {
    // Try to fetch real data from match history API
    console.log(`🌐 Attempting to fetch real builds for ${player.username} from Illuvium API...`);
    const matchHistory = await fetchMatchHistory();
    const builds = parseWinningBuildsFromMatchHistory(matchHistory, player.username);
    
    // Add player info to builds
    const buildsWithPlayerInfo = builds.map(build => ({
      ...build,
      playerUsername: player.username,
      playerRank: player.rank
    }));
    
    if (buildsWithPlayerInfo.length > 0) {
      setCachedData(cacheKey, buildsWithPlayerInfo);
      console.log(`✅ Successfully fetched ${buildsWithPlayerInfo.length} builds for ${player.username}`);
      return buildsWithPlayerInfo;
    } else {
      console.log(`⚠️ No builds parsed for ${player.username}, falling back to mock`);
    }
  } catch (error) {
    console.warn(`Failed to fetch real builds for ${player.username}:`, error);
  }

  // Return empty array instead of mock data
  console.log(`🔄 Returning empty builds for ${player.username}`);
  const emptyBuilds: WinningBuild[] = [];
  
  setCachedData(cacheKey, emptyBuilds);
  return emptyBuilds;
}

/**
 * Get aggregated recent winning builds from top players
 */
export async function getRecentWinningBuilds(): Promise<WinningBuild[]> {
  console.log('🔄 Fetching recent winning builds from top players...');
  
  try {
    // Get top 5 players
    const players = await fetchLeaderboard();
    
    // Fetch builds for each player concurrently
    const buildPromises = players.map(player => fetchPlayerWinningBuilds(player));
    const allBuilds = await Promise.all(buildPromises);
    
    // Flatten and sort by recency
    const flattenedBuilds = allBuilds.flat();
    const sortedBuilds = flattenedBuilds.sort((a, b) => {
      // Sort by placement first (1st place first), then by player rank
      if (a.placement !== b.placement) {
        return a.placement - b.placement;
      }
      return (a.playerRank || 999) - (b.playerRank || 999);
    });
    
    console.log(`✅ Successfully aggregated ${sortedBuilds.length} recent winning builds`);
    return sortedBuilds;
  } catch (error) {
    console.error('Failed to get recent winning builds:', error);
    throw error;
  }
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('simple_')) {
      localStorage.removeItem(key);
    }
  });
  console.log('🗑️ Cleared all cached data');
}

/**
 * Force clear cache and return fresh data
 */
export async function forceRefreshData(): Promise<WinningBuild[]> {
  console.log('🔄 Force refreshing data (clearing cache)...');
  clearCache();
  return await getRecentWinningBuilds();
}

/**
 * Test the API functionality with detailed debugging
 */
export async function testAPI(): Promise<string> {
  try {
    console.log('🧪 Testing API functionality...');
    
    // Clear cache first
    clearCache();
    
    // Test all available endpoints
    console.log('🔍 Testing all available endpoints...');
    
    try {
      const illuvialsStats = await fetchIlluvialsStats();
      console.log('✅ Illuvials stats test successful:', illuvialsStats);
    } catch (error) {
      console.log('❌ Illuvials stats test failed:', error);
    }
    
    try {
      const augmentsStats = await fetchAugmentsStats();
      console.log('✅ Augments stats test successful:', augmentsStats);
    } catch (error) {
      console.log('❌ Augments stats test failed:', error);
    }
    
    const players = await fetchLeaderboard();
    console.log(`✅ Leaderboard test: ${players.length} players fetched`);
    console.log('📋 Players:', players.map(p => `${p.rank}. ${p.username}`));
    
    if (players.length > 0) {
      const builds = await fetchPlayerWinningBuilds(players[0]);
      console.log(`✅ Builds test: ${builds.length} builds fetched for ${players[0].username}`);
      console.log('📋 Sample build:', builds[0]);
    }
    
    const recentBuilds = await getRecentWinningBuilds();
    console.log(`✅ Recent builds test: ${recentBuilds.length} total builds aggregated`);
    
    // Show sample of builds
    console.log('📋 Sample builds:');
    recentBuilds.slice(0, 3).forEach((build, i) => {
      console.log(`  ${i + 1}. ${build.playerUsername} - ${build.placement}st place`);
      console.log(`     Illuvials: ${build.illuvials.join(', ')}`);
      console.log(`     Augments: ${build.augments}`);
    });
    
    return `API Test Successful: ${players.length} players, ${recentBuilds.length} builds`;
  } catch (error) {
    console.error('❌ API test failed:', error);
    return `API Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}