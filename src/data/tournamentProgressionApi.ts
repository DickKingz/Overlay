import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  getDoc
} from 'firebase/firestore';
import { fetchMatchResults, calculatePoints, MatchData } from './illuviumApi';
import type { 
  TournamentParticipant, 
  SingleElimBracket, 
  BracketResult
} from '../types';

export interface MatchResultUpdate {
  tournamentId: string;
  bracketId: string;
  lobbyCode: string;
  results: BracketResult[];
  completedAt: string;
}

export interface TournamentProgressionConfig {
  pollIntervalMs: number;
  maxRetries: number;
  autoProgressEnabled: boolean;
  notifyOnCompletion: boolean;
}

export class TournamentProgressionManager {
  private tournamentId: string;
  private config: TournamentProgressionConfig;
  private activeBrackets: Map<string, SingleElimBracket> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private unsubscribers: (() => void)[] = [];

  constructor(tournamentId: string, config: Partial<TournamentProgressionConfig> = {}) {
    this.tournamentId = tournamentId;
    this.config = {
      pollIntervalMs: 30000, // Poll every 30 seconds
      maxRetries: 10,
      autoProgressEnabled: true,
      notifyOnCompletion: true,
      ...config
    };
  }

  /**
   * Start monitoring all active brackets in the tournament
   */
  async startMonitoring(): Promise<void> {
    console.log('🚀 Starting tournament progression monitoring for:', this.tournamentId);
    
    // Get all active brackets
    const brackets = await this.getActiveBrackets();
    
    for (const bracket of brackets) {
      if (bracket.lobbyCode && bracket.status === 'live') {
        this.startBracketMonitoring(bracket);
      }
    }

    // Listen for new brackets being created
    this.listenForNewBrackets();
  }

  /**
   * Stop all monitoring and clean up
   */
  stopMonitoring(): void {
    console.log('⏹️ Stopping tournament progression monitoring');
    
    // Clear all polling intervals
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();

    // Unsubscribe from all Firestore listeners
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Get all active brackets for this tournament
   */
  private async getActiveBrackets(): Promise<SingleElimBracket[]> {
    try {
      const bracketsRef = collection(db, 'tournaments', this.tournamentId, 'brackets');
      const activeQuery = query(bracketsRef, where('status', 'in', ['pending', 'live']));
      const snapshot = await getDocs(activeQuery);
      
      const brackets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SingleElimBracket[];

      console.log(`📊 Found ${brackets.length} active brackets`);
      return brackets;
    } catch (error) {
      console.error('❌ Error fetching active brackets:', error);
      return [];
    }
  }

  /**
   * Listen for new brackets being created and start monitoring them
   */
  private listenForNewBrackets(): void {
    const bracketsRef = collection(db, 'tournaments', this.tournamentId, 'brackets');
    const newBracketsQuery = query(bracketsRef, where('status', '==', 'live'));
    
    const unsubscribe = onSnapshot(newBracketsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const bracket = { id: change.doc.id, ...change.doc.data() } as SingleElimBracket;
          
          if (bracket.lobbyCode && bracket.status === 'live' && !this.pollingIntervals.has(bracket.id)) {
            console.log('🆕 New live bracket detected, starting monitoring:', bracket.id);
            this.startBracketMonitoring(bracket);
          }
        }
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Start monitoring a specific bracket for match completion
   */
  private startBracketMonitoring(bracket: SingleElimBracket): void {
    if (!bracket.lobbyCode) {
      console.log('⚠️ Bracket has no lobby code, skipping:', bracket.id);
      return;
    }

    console.log(`🔍 Starting monitoring for bracket ${bracket.id} with lobby code: ${bracket.lobbyCode}`);
    
    this.activeBrackets.set(bracket.id, bracket);

    let retryCount = 0;
    const pollForResults = async () => {
      try {
        const matchData = await fetchMatchResults(bracket.lobbyCode!);
        
        if (matchData && matchData.status === 'completed' && matchData.results) {
          console.log(`✅ Match completed for bracket ${bracket.id}!`);
          
          // Stop polling this bracket
          const interval = this.pollingIntervals.get(bracket.id);
          if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(bracket.id);
          }

          // Process the results
          await this.processMatchResults(bracket, matchData);
        } else {
          console.log(`⏳ Match still in progress for bracket ${bracket.id}, retry ${retryCount + 1}/${this.config.maxRetries}`);
          retryCount++;
          
          if (retryCount >= this.config.maxRetries) {
            console.log(`⚠️ Max retries reached for bracket ${bracket.id}, stopping monitoring`);
            const interval = this.pollingIntervals.get(bracket.id);
            if (interval) {
              clearInterval(interval);
              this.pollingIntervals.delete(bracket.id);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error polling bracket ${bracket.id}:`, error);
        retryCount++;
        
        if (retryCount >= this.config.maxRetries) {
          console.log(`⚠️ Too many errors for bracket ${bracket.id}, stopping monitoring`);
          const interval = this.pollingIntervals.get(bracket.id);
          if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(bracket.id);
          }
        }
      }
    };

    // Start polling immediately, then at regular intervals
    pollForResults();
    const interval = setInterval(pollForResults, this.config.pollIntervalMs);
    this.pollingIntervals.set(bracket.id, interval);
  }

  /**
   * Process match results and update tournament data
   */
  private async processMatchResults(bracket: SingleElimBracket, matchData: MatchData): Promise<void> {
    try {
      console.log(`🎯 Processing match results for bracket ${bracket.id}`);
      
      // Convert match results to bracket results
      const bracketResults = this.convertToBracketResults(bracket, matchData);
      
      // Update bracket with results
      await this.updateBracketResults(bracket.id, bracketResults);
      
      // Update participant scores and match history
      await this.updateParticipantData(bracket, bracketResults);
      
      // Check if we should auto-progress to next round
      if (this.config.autoProgressEnabled) {
        await this.checkForAutoProgression(bracket.phaseId);
      }

      console.log(`✅ Successfully processed results for bracket ${bracket.id}`);
      
    } catch (error) {
      console.error(`❌ Error processing match results for bracket ${bracket.id}:`, error);
    }
  }

  /**
   * Convert Illuvium match results to bracket results format
   */
  private convertToBracketResults(bracket: SingleElimBracket, matchData: MatchData): BracketResult[] {
    const results: BracketResult[] = [];
    
    if (!matchData.results) return results;

    // Get tournament scoring system or use default
    // const pointsPerPlacement = [8, 7, 6, 5, 4, 3, 2, 1]; // Default Illuvium scoring
    
    for (const result of matchData.results) {
      // Find the participant by matching player name with their Illuvium ID
      const participant = bracket.players.find(p => 
        p.illuviumPlayerId === result.player || 
        p.rangerName === result.player ||
        p.nickname === result.player
      );
      
      if (participant) {
        const points = calculatePoints(result.rank, undefined);
        
        results.push({
          playerId: participant.id,
          placement: result.rank,
          points: points,
          isAdvancing: this.shouldPlayerAdvance(result.rank, bracket)
        });
      } else {
        console.warn(`⚠️ Could not find participant for player: ${result.player}`);
      }
    }

    return results;
  }

  /**
   * Determine if a player should advance based on their placement
   */
  private shouldPlayerAdvance(placement: number, bracket: SingleElimBracket): boolean {
    // For now, advance top 4 players (top half)
    // This should be configurable based on tournament rules
    return placement <= 4;
  }

  /**
   * Update bracket document with results
   */
  private async updateBracketResults(bracketId: string, results: BracketResult[]): Promise<void> {
    const bracketRef = doc(db, 'tournaments', this.tournamentId, 'brackets', bracketId);
    
    await updateDoc(bracketRef, {
      results: results,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    console.log(`📊 Updated bracket ${bracketId} with ${results.length} results`);
  }

  /**
   * Update participant data with match results and history
   */
  private async updateParticipantData(bracket: SingleElimBracket, results: BracketResult[]): Promise<void> {
    const participantsRef = collection(db, 'tournaments', this.tournamentId, 'participants');
    
    for (const result of results) {
      try {
        const participantRef = doc(participantsRef, result.playerId);
        const participantDoc = await getDoc(participantRef);
        
        if (!participantDoc.exists()) {
          console.warn(`⚠️ Participant ${result.playerId} not found`);
          continue;
        }
        
        const currentData = participantDoc.data() as TournamentParticipant;
        
        // Update participant's total points and match history
        const updatedMatchHistory = [
          ...(currentData.matchHistory || []),
          {
            matchId: bracket.id,
            lobbyCode: bracket.lobbyCode!,
            placement: result.placement,
            points: result.points,
            timestamp: new Date().toISOString()
          }
        ];

        const updatedPhaseResults = [
          ...(currentData.phaseResults || []),
          {
            phaseId: bracket.phaseId,
            placement: result.placement,
            points: result.points,
            bracketId: bracket.id
          }
        ];

        await updateDoc(participantRef, {
          points: (currentData.points || 0) + result.points,
          matchHistory: updatedMatchHistory,
          phaseResults: updatedPhaseResults,
          status: result.isAdvancing ? 'advanced' : 'eliminated',
          lastUpdated: new Date().toISOString()
        });
        
        console.log(`👤 Updated participant ${result.playerId}: +${result.points} points, ${result.isAdvancing ? 'advanced' : 'eliminated'}`);
        
      } catch (error) {
        console.error(`❌ Error updating participant ${result.playerId}:`, error);
      }
    }
  }

  /**
   * Check if a phase is complete and should auto-progress
   */
  private async checkForAutoProgression(phaseId: string): Promise<void> {
    try {
      console.log(`🔄 Checking for auto-progression in phase ${phaseId}`);
      
      // Get all brackets for this phase
      const bracketsRef = collection(db, 'tournaments', this.tournamentId, 'brackets');
      const phaseQuery = query(bracketsRef, where('phaseId', '==', phaseId));
      const snapshot = await getDocs(phaseQuery);
      
      const brackets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SingleElimBracket[];

      // Check if all brackets are completed
      const allCompleted = brackets.every(bracket => bracket.status === 'completed');
      
      if (allCompleted && brackets.length > 0) {
        console.log(`🎉 All brackets completed for phase ${phaseId}, initiating auto-progression!`);
        await this.progressToNextPhase(phaseId);
      } else {
        console.log(`⏳ Phase ${phaseId} not ready for progression: ${brackets.filter(b => b.status === 'completed').length}/${brackets.length} brackets completed`);
      }
      
    } catch (error) {
      console.error(`❌ Error checking auto-progression for phase ${phaseId}:`, error);
    }
  }

  /**
   * Progress all qualifying players to the next phase
   */
  private async progressToNextPhase(completedPhaseId: string): Promise<void> {
    try {
      // Get all advancing players from completed phase
      const advancingPlayers = await this.getAdvancingPlayers(completedPhaseId);
      
      if (advancingPlayers.length === 0) {
        console.log('⚠️ No advancing players found');
        return;
      }

      console.log(`🏆 ${advancingPlayers.length} players advancing to next phase`);
      
      // Create new brackets for next phase
      await this.createNextPhaseBrackets(advancingPlayers);
      
      // Update tournament status if needed
      await this.updateTournamentProgress();
      
    } catch (error) {
      console.error('❌ Error progressing to next phase:', error);
    }
  }

  /**
   * Get all players who should advance from a completed phase
   */
  private async getAdvancingPlayers(phaseId: string): Promise<TournamentParticipant[]> {
    const participantsRef = collection(db, 'tournaments', this.tournamentId, 'participants');
    const advancedQuery = query(participantsRef, where('status', '==', 'advanced'));
    const snapshot = await getDocs(advancedQuery);
    
    const allAdvancedPlayers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TournamentParticipant[];

    // Filter to only players who advanced from this specific phase
    return allAdvancedPlayers.filter(player => 
      player.phaseResults?.some(result => result.phaseId === phaseId)
    );
  }

  /**
   * Create new brackets for the next phase
   */
  private async createNextPhaseBrackets(players: TournamentParticipant[]): Promise<void> {
    console.log(`🔨 Creating next phase brackets for ${players.length} players`);
    
    // Group players into brackets of 8
    const playersPerBracket = 8;
    const numBrackets = Math.ceil(players.length / playersPerBracket);
    
    const bracketsRef = collection(db, 'tournaments', this.tournamentId, 'brackets');
    
    for (let i = 0; i < numBrackets; i++) {
      const startIndex = i * playersPerBracket;
      const bracketPlayers = players.slice(startIndex, startIndex + playersPerBracket);
      
      const newBracket: Omit<SingleElimBracket, 'id'> = {
        phaseId: `phase_${Date.now()}_${i}`, // Generate new phase ID
        groupNumber: i + 1,
        players: bracketPlayers,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await addDoc(bracketsRef, newBracket);
      console.log(`✅ Created bracket ${i + 1} with ${bracketPlayers.length} players`);
    }
  }

  /**
   * Update overall tournament progress
   */
  private async updateTournamentProgress(): Promise<void> {
    // This could update tournament status, send notifications, etc.
    console.log('📊 Updating tournament progress...');
  }
}

/**
 * Create and start monitoring for a tournament
 */
export async function startTournamentMonitoring(
  tournamentId: string, 
  config?: Partial<TournamentProgressionConfig>
): Promise<TournamentProgressionManager> {
  const manager = new TournamentProgressionManager(tournamentId, config);
  await manager.startMonitoring();
  return manager;
}

/**
 * Manually trigger result checking for a specific lobby
 */
export async function checkMatchResults(tournamentId: string, bracketId: string, lobbyCode: string): Promise<boolean> {
  try {
    console.log(`🔍 Manually checking results for lobby: ${lobbyCode}`);
    
    const matchData = await fetchMatchResults(lobbyCode);
    
    if (matchData && matchData.status === 'completed') {
      console.log('✅ Match completed, processing results...');
      
      // Create a temporary manager to process these specific results
      const manager = new TournamentProgressionManager(tournamentId);
      
      // Get the bracket data
      const bracketRef = doc(db, 'tournaments', tournamentId, 'brackets', bracketId);
      const bracketDoc = await getDoc(bracketRef);
      
      if (bracketDoc.exists()) {
        const bracket = { id: bracketDoc.id, ...bracketDoc.data() } as SingleElimBracket;
        await manager['processMatchResults'](bracket, matchData);
        return true;
      }
    }
    
    console.log('⏳ Match not completed yet');
    return false;
    
  } catch (error) {
    console.error('❌ Error checking match results:', error);
    return false;
  }
} 