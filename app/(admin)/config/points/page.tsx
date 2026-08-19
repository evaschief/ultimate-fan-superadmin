import { supabase } from '@/lib/supabase';
import PointsConfigClient from './PointsConfigClient';
import { ScoringConfig, ConfigVersion } from '@/types';
import { DEFAULT_SCORING_CONFIG } from '@/lib/scoringConfig';

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
          hockey: { ...DEFAULT_SCORING_CONFIG.hockey, ...(v.config?.hockey ?? {}) },
          football: { ...DEFAULT_SCORING_CONFIG.football, ...(v.config?.football ?? {}) },
          betMultipliers: { ...DEFAULT_SCORING_CONFIG.betMultipliers, ...(v.config?.betMultipliers ?? {}) },
          betWindowSeconds: { ...DEFAULT_SCORING_CONFIG.betWindowSeconds, ...(v.config?.betWindowSeconds ?? {}) },
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
  const initialConfig = currentVersion?.config ?? DEFAULT_SCORING_CONFIG;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wide">Points Config</h1>
        <p className="text-secondary text-sm mt-1">
          Edit the live fantasy scoring values, bet multipliers, and window durations.
          Each save creates a versioned snapshot; new fantasy awards use the current version immediately.
        </p>
      </div>
      <PointsConfigClient
        initialConfig={initialConfig}
        versions={versions}
      />
    </div>
  );
}
