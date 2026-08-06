export interface ScoringConfig {
  hockey: HockeyScoring;
  football: FootballScoring;
  betMultipliers: BetMultipliers;
  betWindowSeconds: BetWindowSeconds;
}

export interface HockeyScoring {
  shotOnGoal: number;
  hit: number;
  block: number;
  assist: number;
  goalEvenStrength: number;
  goalPowerPlay: number;
  goalShorthanded: number;
  hatTrickBonus: number;
  iceTimePer5Min: number;
  penaltyPerMinute: number;
  giveaway: number;
}

export interface FootballScoring {
  gameParticipation: number;
  passingYardsPer10: number;
  rushingYardsPer4: number;
  receivingYardsPer4: number;
  reception: number;
  passingTD: number;
  rushingTD: number;
  receivingTD: number;
  fieldGoalMade: number;
  fieldGoal4049Bonus: number;
  fieldGoal50PlusBonus: number;
  extraPoint: number;
  interceptionThrown: number;
  fumbleLost: number;
  qbSacked: number;
  missedFieldGoal: number;
}

export interface BetMultipliers {
  powerPlayYes: number;
  powerPlayNo: number;
  hailMary: number;
  evenOdds: number;
  otWinner: number;
}

export interface BetWindowSeconds {
  scoresNext: number;
  powerPlay: number;
  first5Shots: number;
  bigHitter: number;
  hailMary: number;
  otWinner: number;
  redZone: number;
  willConvert: number;
  default: number;
}

export interface ConfigVersion {
  id: string;
  isCurrent: boolean;
  createdAt: { seconds: number; nanoseconds: number } | null;
  savedBy: string;
  label?: string;
  config: ScoringConfig;
}

export interface GameSession {
  id: string;
  gameCode: string;
  sport: 'NHL' | 'NFL';
  status: 'lobby' | 'live' | 'ended';
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  period?: string;
  clock?: string;
  createdAt?: string | null;
  /// Actual scheduled kickoff/puck-drop time (games.scheduled_at), distinct
  /// from createdAt (when the row was inserted, e.g. when the schedule
  /// fetch created it, which can be days before the game itself).
  scheduledAt?: string | null;
  /// False for prepopulated future games that don't have a join_code yet
  /// (see schedule-games' assignCodes:false path). When false, `gameCode`
  /// falls back to the internal row id and should not be displayed as-is.
  hasCode?: boolean;
  playerCount?: number;
  openBetCount?: number;
}

export interface LiveGameState {
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  status: string;
  playerCount?: number;
  openBetCount?: number;
}
