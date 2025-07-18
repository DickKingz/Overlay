import { collection, addDoc, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Tournament, TournamentParticipant } from '../types';

// API Configuration - Switch between local development and production Firebase Functions
const IS_DEVELOPMENT = import.meta.env.DEV;
// 🔧 Temporarily use production API for development to avoid CORS issues
const TOURNAMENT_API_BASE = IS_DEVELOPMENT 
  ? 'https://illuvilytics.web.app/api' 
  : '/api';

console.log(`🔧 Tournament API Mode: ${IS_DEVELOPMENT ? 'Development (Via Production API)' : 'Production (Firebase Functions via /api)'}`);
console.log(`🔗 Using API endpoint: ${TOURNAMENT_API_BASE}`);

// Helper function to make tournament API calls
const tournamentApiCall = async (endpoint: string, options?: RequestInit) => {
  // Construct the full URL - TOURNAMENT_API_BASE already includes the base path
  const url = `${TOURNAMENT_API_BASE}${endpoint}`;
  
  console.log(`Making tournament API call to: ${url}`);
  console.log(`Request options:`, options);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(`Response headers:`, response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response:`, errorText);
      throw new Error(`API Error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`API Response data:`, data);
    return data;
  } catch (error) {
    console.error(`Fetch error details:`, error);
    throw error;
  }
};

// API for fetching player data from Illuvium
export async function fetchPlayerData(walletAddress: string) {
  try {
    const response = await fetch(`https://api.illuvium-game.io/gamedata/players/search?wallet=${walletAddress}&Fields=All`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch player data:', error);
    return null;
  }
}

// API for fetching Gauntlet games for Sit n Go scoring
export async function fetchGauntletGames(players: string[], startDate: string, endDate: string, mode: string = 'Ranked') {
  try {
    // API should now be available via Firebase function

    const response = await fetch('/api/gauntlet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        players,
        startDate,
        endDate,
        mode,
        count: 100, // Adjust as needed
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch gauntlet games:', error);
    return null;
  }
}

// New Tournament API Functions using Firebase Functions
export const TournamentAPI = {
  // Get all tournaments
  async getTournaments() {
    return tournamentApiCall('/tournaments');
  },
  
  // Create a new tournament
  async createTournament(tournamentData: any) {
    return tournamentApiCall('/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournamentData)
    });
  },
  
  // Get specific tournament
  async getTournament(tournamentId: string) {
    return tournamentApiCall(`/tournaments/${tournamentId}`);
  },
  
  // Update tournament
  async updateTournament(tournamentId: string, updates: any) {
    return tournamentApiCall(`/tournaments/${tournamentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },
  
  // Delete tournament
  async deleteTournament(tournamentId: string) {
    return tournamentApiCall(`/tournaments/${tournamentId}`, {
      method: 'DELETE'
    });
  },
  
  // Get tournament participants
  async getTournamentParticipants(tournamentId: string) {
    return tournamentApiCall(`/tournaments/${tournamentId}/participants`);
  },
  
  // Add tournament participant
  async addTournamentParticipant(tournamentId: string, participantData: any) {
    return tournamentApiCall(`/tournaments/${tournamentId}/participants`, {
      method: 'POST',
      body: JSON.stringify(participantData)
    });
  },
  
  // Update participant
  async updateParticipant(tournamentId: string, participantId: string, updates: any) {
    return tournamentApiCall(`/tournaments/${tournamentId}/participants/${participantId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },
  
  // Remove participant
  async removeParticipant(tournamentId: string, participantId: string) {
    return tournamentApiCall(`/tournaments/${tournamentId}/participants/${participantId}`, {
      method: 'DELETE'
    });
  }
};

// Calculate Sit n Go points based on placement and custom scoring system
export function calculateSitNGoPoints(placement: number, customScoring?: Array<{placement: number, points: number}>): number {
  // Use custom scoring system if provided
  if (customScoring && customScoring.length > 0) {
    const scoreRule = customScoring.find(rule => rule.placement === placement);
    if (scoreRule) {
      return scoreRule.points;
    }
  }
  
  // Fallback to default scoring if no custom system
  switch (placement) {
    case 1: return 8;
    case 2: return 4;
    case 3: return 2;
    case 4: return 1;
    default: return 0;
  }
}

// Process Sit n Go games and calculate scores
export function processSitNGoGames(games: any[], tournamentStartTime: string, tournamentEndTime: string, customScoring?: Array<{placement: number, points: number}>) {
  const playerScores: { [playerId: string]: { points: number; games: number; averagePoints: number } } = {};
  
  games.forEach(game => {
    const gameStartTime = new Date(game.startTime || game.start_time);
    const tournamentStart = new Date(tournamentStartTime);
    const tournamentEnd = new Date(tournamentEndTime);
    
    // Only count games within the tournament time window
    if (gameStartTime >= tournamentStart && gameStartTime <= tournamentEnd) {
      game.results?.forEach((result: any) => {
        const playerId = result.playerId || result.player;
        const placement = result.placement || result.rank;
        
        if (playerId && placement) {
          const points = calculateSitNGoPoints(placement, customScoring);
          
          if (!playerScores[playerId]) {
            playerScores[playerId] = { points: 0, games: 0, averagePoints: 0 };
          }
          
          playerScores[playerId].points += points;
          playerScores[playerId].games += 1;
        }
      });
    }
  });
  
  // Calculate average points
  Object.keys(playerScores).forEach(playerId => {
    const score = playerScores[playerId];
    score.averagePoints = score.games > 0 ? score.points / score.games : 0;
  });
  
  return playerScores;
}

// Update tournament participants with Sit n Go scores
export async function updateSitNGoScores(tournamentId: string, playerScores: any) {
  try {
    const participantsRef = collection(db, 'tournaments', tournamentId, 'participants');
    const participantsSnapshot = await getDocs(participantsRef);
    
    const updatePromises = participantsSnapshot.docs.map(async (doc) => {
      const participant = doc.data() as TournamentParticipant;
      const playerScore = playerScores[participant.illuviumPlayerId];
      
      if (playerScore) {
        await updateDoc(doc.ref, {
          points: playerScore.points,
          matchesPlayed: playerScore.games,
          averagePoints: playerScore.averagePoints,
          lastUpdated: new Date().toISOString(),
        });
      }
    });
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Failed to update Sit n Go scores:', error);
    return false;
  }
}

// Get tournament participants
export async function getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  try {
    const participantsRef = collection(db, 'tournaments', tournamentId, 'participants');
    const snapshot = await getDocs(participantsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentParticipant));
  } catch (error) {
    console.error('Failed to get tournament participants:', error);
    return [];
  }
}

// Add participant to tournament
export async function addTournamentParticipant(tournamentId: string, participant: Omit<TournamentParticipant, 'id'>) {
  try {
    const participantsRef = collection(db, 'tournaments', tournamentId, 'participants');
    const docRef = await addDoc(participantsRef, {
      ...participant,
      registrationTime: new Date().toISOString(),
      status: 'registered',
      points: 0,
      matchesPlayed: 0,
    });
    return docRef.id;
  } catch (error) {
    console.error('Failed to add tournament participant:', error);
    return null;
  }
}

// Update tournament status
export async function updateTournamentStatus(tournamentId: string, status: Tournament['status']) {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, { status });
    return true;
  } catch (error) {
    console.error('Failed to update tournament status:', error);
    return false;
  }
}

// Get tournament by ID
export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const snapshot = await getDoc(tournamentRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Tournament;
    }
    return null;
  } catch (error) {
    console.error('Failed to get tournament:', error);
    return null;
  }
}

// Delete tournament
export async function deleteTournament(tournamentId: string): Promise<boolean> {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await deleteDoc(tournamentRef);
    return true;
  } catch (error) {
    console.error('Failed to delete tournament:', error);
    return false;
  }
}

// Update tournament
export async function updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<boolean> {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, updates);
    return true;
  } catch (error) {
    console.error('Failed to update tournament:', error);
    return false;
  }
}

// Use environment variable for API URL, fallback to Firebase function
const API_URL = import.meta.env.VITE_GAUNTLET_API_URL || '/api/gauntlet';
// const IS_PRODUCTION = import.meta.env.PROD;

export const getSitNGoParticipants = async (startDate: string, endDate: string): Promise<string[]> => {
  // API should now be available via Firebase function

  let allPlayers = new Set<string>();
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const body: any = {
      mode: 'Ranked', // Sit-n-Go tournaments are always Ranked
      startDate: startDate,
      endDate: endDate,
    };

    if (cursor) {
      body.cursor = cursor;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`API request failed with status ${res.status}`);
        break; 
      }

      const data = await res.json();

      if (data.games && data.games.length > 0) {
        data.games.forEach((game: any) => {
          if (game.players && Array.isArray(game.players)) {
            game.players.forEach((player: string) => allPlayers.add(player));
          }
        });

        cursor = data.cursor;
        hasMore = !!cursor;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error fetching tournament participants:', error);
      hasMore = false; // Stop on error
    }
  }

  return Array.from(allPlayers);
}; 