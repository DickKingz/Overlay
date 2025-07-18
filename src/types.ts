// Core types for the Illuvium Guide application

export interface Augment {
  id: string;
  name: string;
  type: string;
  tier: string;
  description: string;
  icon?: string;
  stats?: Record<string, any>;
  sourceType?: string;
  category?: string;
  image?: string;
}

export interface Champion {
  id: string;
  name: string;
  displayName?: string;
  tier: number | string;
  stage?: number;
  affinity?: string;
  class?: string;
  stats?: Record<string, any>;
  cost?: number;
  traits?: string[];
}

export interface Item {
  id: string;
  name: string;
  type?: string;
  description: string;
  icon?: string;
  stats?: Record<string, any>;
  components?: string[];
  tier?: string;
}

export interface TeamComposition {
  id?: string;
  name: string;
  description: string;
  illuvials: string[];
  augments: string[] | Augment[];
  weapons: string[];
  strategy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  author?: string;
  meta?: boolean;
  winRate?: number;
  tier?: string;
  playstyle?: string;
  difficulty?: number[];
  champions?: Champion[];
}

export interface GauntletData {
  compositions: TeamComposition[];
  illuvials: Champion[];
  augments: Augment[];
  weapons: Item[];
  title?: string;
  description?: string;
  duration?: string;
  participants?: number;
  status?: string;
  metaComps?: TeamComposition[];
}

export interface Match {
  id: string;
  playerName: string;
  composition: TeamComposition;
  result: 'win' | 'loss';
  placement: number;
  timestamp: Date;
  gameMode?: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'upcoming' | 'active' | 'completed';
  participants: TournamentParticipant[];
  phases: TournamentPhase[];
  rules?: string;
  prizePool?: string;
}

export interface TournamentParticipant {
  id: string;
  playerName: string;
  email?: string;
  discordId?: string;
  composition?: TeamComposition;
  registrationDate: Date;
  status: 'registered' | 'active' | 'eliminated' | 'winner' | 'advanced';
  phaseResults?: PhaseResult[];
  illuviumPlayerId?: string;
  rangerName?: string;
  nickname?: string;
  matchHistory?: any[];
  points?: number;
}

export interface TournamentPhase {
  id: string;
  name: string;
  description: string;
  type: 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss';
  startDate: Date;
  endDate?: Date;
  status: 'upcoming' | 'active' | 'completed';
  brackets: SingleElimBracket[];
}

export interface SingleElimBracket {
  id: string;
  name: string;
  players: TournamentParticipant[];
  matches: BracketMatch[];
  winner?: TournamentParticipant;
  lobbyCode?: string;
  status?: 'upcoming' | 'live' | 'completed' | 'pending';
  phaseId?: string;
  groupNumber?: number;
  createdAt?: string;
}

export interface BracketMatch {
  id: string;
  player1: TournamentParticipant;
  player2: TournamentParticipant;
  winner?: TournamentParticipant;
  player1Score?: number;
  player2Score?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  status: 'scheduled' | 'in-progress' | 'completed';
}

export interface PhaseResult {
  phaseId: string;
  placement: number;
  points: number;
  qualified: boolean;
}

export interface BracketResult {
  bracketId: string;
  playerId: string;
  placement: number;
  points: number;
  matchResults: any[];
  isAdvancing?: boolean;
}

// Utility types
export type TeamCompositionData = Omit<TeamComposition, 'id'>;
export type MatchData = Omit<Match, 'id'>;
export type TournamentData = Omit<Tournament, 'id'>; 