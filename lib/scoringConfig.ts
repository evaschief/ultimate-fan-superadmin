import { ScoringConfig } from '@/types';
import { supabase } from '@/lib/supabase';

// Safe fallback only. Migration 058 creates this same configuration in
// admin_config, which is the live source of truth used by process-event.
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  hockey: {
    goal: 250,
    assist: 125,
    shotOnGoal: 50,
    hit: 25,
    block: 25,
    penaltyPerMin: -25,
    giveaway: -25,
    hatTrickBonus: 100,
    iceTimePer5Min: 35,
  },
  football: {
    gameParticipation: 18,
    passingYardsPer10: 12,
    rushingYardsPer4: 12,
    receivingYardsPer4: 12,
    reception: 9,
    passingTD: 70,
    rushingTD: 105,
    receivingTD: 105,
    fieldGoal: 52,
    fieldGoal40: 70,
    fieldGoal50: 88,
    extraPoint: 6,
    interception: -40,
    fumbleLost: -40,
    qbSacked: -4,
    returnTD: 175,
    defensiveTD: 175,
    twoPointConversion: 35,
    safety: 70,
    tackle: 7,
    tackleAssisted: 4,
    milestone100Rush: 53,
    milestone300Pass: 53,
    milestone100Rec: 53,
  },
  betMultipliers: {
    powerPlayYes: 5,
    powerPlayNo: 0.2,
    hailMary: 5,
    evenOdds: 1,
    otWinner: 2,
  },
  betWindowSeconds: {
    scoresNext: 45,
    powerPlay: 60,
    first5Shots: 30,
    bigHitter: 60,
    hailMary: 60,
    otWinner: 120,
    redZone: 45,
    willConvert: 20,
    default: 45,
  },
};

function mergeConfig(candidate: unknown): ScoringConfig {
  const config = candidate as Partial<ScoringConfig> | null;
  return {
    hockey: { ...DEFAULT_SCORING_CONFIG.hockey, ...(config?.hockey ?? {}) },
    football: { ...DEFAULT_SCORING_CONFIG.football, ...(config?.football ?? {}) },
    betMultipliers: { ...DEFAULT_SCORING_CONFIG.betMultipliers, ...(config?.betMultipliers ?? {}) },
    betWindowSeconds: { ...DEFAULT_SCORING_CONFIG.betWindowSeconds, ...(config?.betWindowSeconds ?? {}) },
  };
}

export async function getCurrentScoringConfig(): Promise<ScoringConfig> {
  const { data } = await supabase
    .from('admin_config')
    .select('value')
    .eq('key', 'scoring_config')
    .maybeSingle();
  const versions = data?.value?.versions;
  const current = Array.isArray(versions)
    ? versions.find((version: { isCurrent?: boolean }) => version.isCurrent)?.config
    : null;
  return mergeConfig(current);
}
