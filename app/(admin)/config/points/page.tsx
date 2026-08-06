import { supabase } from '@/lib/supabase';
import PointsConfigClient from './PointsConfigClient';
import { ScoringConfig, ConfigVersion } from '@/types';

const DEFAULT_CONFIG: ScoringConfig = {
  hockey: {
    shotOnGoal: 8,
    hit: 8,
    block: 15,
    assist: 25,
    goalEvenStrength: 50,
    goalPowerPlay: 65,
    goalShorthanded: 120,
    hatTrickBonus: 75,
    iceTimePer5Min: 5,
    penaltyPerMinute: -8,
    giveaway: -5,
  },
  football: {
    gameParticipation: 20,
    passingYardsPer10: 1,
    rushingYardsPer4: 1,
    receivingYardsPer4: 1,
    reception: 4,
    passingTD: 30,
    rushingTD: 45,
    receivingTD: 45,
    fieldGoalMade: 15,
    fieldGoal4049Bonus: 8,
    fieldGoal50PlusBonus: 15,
    extraPoint: 5,
    interceptionThrown: -10,
    fumbleLost: -8,
    qbSacked: -5,
    missedFieldGoal: -8,
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

async function getVersions(): Promise<ConfigVersion[]> {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'scoring_config')
      .single();

    if (error || !data) return [];

    const versions: ConfigVersion[] = (data.value?.versions ?? [])
      .reverse()
      .slice(0, 20)
      .map((v: ConfigVersion & { createdAt?: string }) => ({
        id: v.id,
        isCurrent: v.isCurrent ?? false,
        createdAt: v.createdAt ? { seconds: Math.floor(new Date(v.createdAt).getTime() / 1000), nanoseconds: 0 } : null,
        savedBy: v.savedBy ?? '',
        label: v.label ?? '',
        config: {
          hockey: v.config?.hockey ?? DEFAULT_CONFIG.hockey,
          football: v.config?.football ?? DEFAULT_CONFIG.football,
          betMultipliers: v.config?.betMultipliers ?? DEFAULT_CONFIG.betMultipliers,
          betWindowSeconds: v.config?.betWindowSeconds ?? DEFAULT_CONFIG.betWindowSeconds,
        },
      }));

    return versions;
  } catch {
    return [];
  }
}

export default async function PointsConfigPage() {
  const versions = await getVersions();
  const currentVersion = versions.find(v => v.isCurrent);
  const initialConfig = currentVersion?.config ?? DEFAULT_CONFIG;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wide">Points Config</h1>
        <p className="text-secondary text-sm mt-1">
          Edit fantasy scoring values, bet multipliers, and window durations.
          Each save creates a versioned snapshot — changes take effect immediately with no redeploy.
        </p>
      </div>
      <PointsConfigClient
        initialConfig={initialConfig}
        versions={versions}
      />
    </div>
  );
}
