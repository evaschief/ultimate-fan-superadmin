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
