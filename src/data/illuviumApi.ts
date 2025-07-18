// Illuvium API integration
export interface LobbyCreateRequest {
  gameMode: 'Gauntlet' | 'Ascendant';
  lobbyType: 'Casual' | 'Leviathan';
  allowedPlayers: string[];
}

export interface LobbyCreateResponse {
  inviteCode: string;
}

export interface MatchResult {
  player: string;
  rank: number;
  points: number;
}

export interface MatchData {
  lobbyCode: string;
  status: 'pending' | 'live' | 'completed';
  results?: MatchResult[];
  startTime?: string;
  endTime?: string;
}

/**
 * Create a custom lobby through Illuvium API
 */
export async function createCustomLobby(request: LobbyCreateRequest): Promise<string> {
  try {
    // For now, we'll use Firebase Functions as a proxy to the Illuvium API
    // This avoids CORS issues and keeps the API token secure
    const response = await fetch('/api/create-lobby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create lobby: ${response.statusText}`);
    }

    const data: LobbyCreateResponse = await response.json();
    return data.inviteCode;
  } catch (error) {
    console.error('Error creating lobby:', error);
    // Fallback: generate a mock lobby code for testing
    return 'MOCK' + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
}

/**
 * Fetch match results from Illuvium API
 */
export async function fetchMatchResults(lobbyCode: string): Promise<MatchData | null> {
  try {
    const functionBaseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-illuvilytics.cloudfunctions.net';
    const apiUrl = `${functionBaseUrl}/fetchMatchResults?lobbyCode=${encodeURIComponent(lobbyCode)}`;
    
    console.log('🔍 Fetching match results for lobby:', lobbyCode);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('⏳ Match not completed yet:', lobbyCode);
        return null; // Match not found or not completed
      }
      const errorText = await response.text();
      throw new Error(`Failed to fetch match results: ${response.statusText} - ${errorText}`);
    }

    const matchData = await response.json();
    console.log('✅ Match results fetched:', matchData);
    
    return matchData;
  } catch (error) {
    console.error('❌ Error fetching match results:', error);
    return null;
  }
}

/**
 * Calculate points based on placement and tournament rules
 */
export function calculatePoints(placement: number, customPoints?: { placement: number; points: number }[]): number {
  if (customPoints) {
    const pointRule = customPoints.find(p => p.placement === placement);
    return pointRule ? pointRule.points : 0;
  }
  
  // Standard Illuvium point system
  const standardPoints = [8, 7, 6, 5, 4, 3, 2, 1];
  return standardPoints[placement - 1] || 0;
}

// Illuvium API Integration
// TODO: Replace with actual Illuvium API endpoints

export interface IlluviumLobbyResponse {
  lobbyCode: string;
  lobbyId: string;
  maxPlayers: number;
  gameMode: string;
}

/**
 * Generate a lobby code using Illuvium's API
 * This is a placeholder implementation - replace with actual API call
 */
export async function createIlluviumLobby(allowedPlayers?: string[]): Promise<IlluviumLobbyResponse> {
  try {
    // 🔥 REAL ILLUVIUM API CONFIGURATION
    // const ILLUVIUM_API_TOKEN = import.meta.env.VITE_ILLUVIUM_API_TOKEN || 'your-token-here';
    
    // Note: API token is now handled by Firebase Functions for security
    console.log('🔧 API token will be handled securely by Firebase Functions');

    console.log('🚀 Calling real Illuvium API...');
    console.log('🔗 API URL: https://api.illuvium-game.io/gamedata/public/v1/arena/lobby');
    
    // Use Firebase Functions as proxy to avoid CORS issues
    const functionBaseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-illuvilytics.cloudfunctions.net';
    
    const apiUrl = `${functionBaseUrl}/illuviumLobby`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    console.log('🔧 Using Firebase Functions proxy at:', apiUrl);
    
    const requestBody: any = {
      gameMode: 'Gauntlet',
      lobbyType: 'Casual'
    };
    
    // Only include allowedPlayers if provided (for restricted lobbies)
    if (allowedPlayers && allowedPlayers.length > 0) {
      requestBody.allowedPlayers = allowedPlayers;
    }
    
    console.log('🎮 Request body:', requestBody);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Response Error:', response.status, response.statusText, errorText);
      throw new Error(`Illuvium API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('✅ Real Illuvium lobby created via Firebase:', data);
    
    // Firebase Function returns: { "success": true, "lobbyCode": "RM758S", "data": {...} }
    if (data.success && data.lobbyCode) {
      return {
        lobbyCode: data.lobbyCode,
        lobbyId: `illuvium_${Date.now()}`,
        maxPlayers: 8,
        gameMode: 'Gauntlet'
      };
    } else {
      throw new Error(`Firebase Function error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Real Illuvium API failed, using test mode:', error);
    
    // Fallback to test mode
    await new Promise(resolve => setTimeout(resolve, 500));
    const lobbyCode = generateRealisticLobbyCode();
    
    return {
      lobbyCode,
      lobbyId: `test_${Date.now()}`,
      maxPlayers: 8,
      gameMode: 'tournament'
    };
  }
}

/**
 * Generate a test lobby code (clearly marked as mock data)
 */
function generateRealisticLobbyCode(): string {
  // Illuvium codes appear to be 6 characters like "RM758S"
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TEST';
  for (let i = 0; i < 2; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // Returns like "TESTAB"
}

/**
 * Generate random string from character set
 */
// function generateRandomString(length: number, chars: string): string {
//   let result = '';
//   for (let i = 0; i < length; i++) {
//     result += chars.charAt(Math.floor(Math.random() * chars.length));
//   }
//   return result;
// }

/**
 * Get lobby details by code
 * TODO: Replace with actual API call
 */
export async function getLobbyDetails(lobbyCode: string): Promise<IlluviumLobbyResponse | null> {
  try {
    // TODO: Implement actual API call
    console.log('Getting lobby details for:', lobbyCode);
    return null;
  } catch (error) {
    console.error('Error getting lobby details:', error);
    return null;
  }
}

/**
 * Close/end a lobby
 * TODO: Replace with actual API call
 */
export async function closeLobby(lobbyId: string): Promise<boolean> {
  try {
    // TODO: Implement actual API call
    console.log('Closing lobby:', lobbyId);
    return true;
  } catch (error) {
    console.error('Error closing lobby:', error);
    return false;
  }
}

// Cache for player profile data to avoid duplicate API calls
const playerProfileCache = new Map<string, any>();

/**
 * Fetch player profile data from Illuvium API with all fields including profile picture
 */
export async function fetchPlayerProfileData(identifier: string, type: 'nickname' | 'wallet' = 'wallet'): Promise<any> {
  try {
    const cacheKey = `${type}:${identifier}`;
    
    // Check cache first
    if (playerProfileCache.has(cacheKey)) {
      console.log('Player profile data found in cache:', cacheKey);
      return playerProfileCache.get(cacheKey);
    }

    const queryParam = type === 'nickname' ? 'nickname' : 'wallet';
    const response = await fetch(`https://api.illuvium-game.io/gamedata/players/search?${queryParam}=${encodeURIComponent(identifier)}&Fields=All`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player data: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Player profile data fetched:', data);
    
    // Cache the result for 5 minutes
    playerProfileCache.set(cacheKey, data);
    setTimeout(() => {
      playerProfileCache.delete(cacheKey);
    }, 5 * 60 * 1000);
    
    return data;
  } catch (error) {
    console.error('Error fetching player profile data:', error);
    return null;
  }
}

/**
 * Fetch player profile data by nickname
 */
export async function fetchPlayerProfileByNickname(nickname: string): Promise<any> {
  return fetchPlayerProfileData(nickname, 'nickname');
}

/**
 * Fetch player profile data by wallet address
 */
export async function fetchPlayerProfileByWallet(walletAddress: string): Promise<any> {
  return fetchPlayerProfileData(walletAddress, 'wallet');
}

// Leaderboard API interfaces and functions
export interface LeaderboardEntry {
  nickname: string;
  illuvitar: string;
  position: number;
  rank: string;
  rating: number;
  totalGames: number;
  avgPlacement: number;
  winRate: number;
  top4Rate: number;
  last20RatingChange: number;
  lastWeekGames: number;
  raffleTickets: number;
}

export interface LeaderboardResponse {
  cursor: string;
  entries: LeaderboardEntry[];
}

/**
 * Fetch leaderboard data from Illuvium API
 */
export async function fetchLeaderboard(limit: number = 100): Promise<LeaderboardResponse | null> {
  try {
    const response = await fetch(`https://api.illuvium-game.io/gamedata/gauntlet/leaderboard?mode=Gauntlet&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Leaderboard data fetched:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return null;
  }
} 