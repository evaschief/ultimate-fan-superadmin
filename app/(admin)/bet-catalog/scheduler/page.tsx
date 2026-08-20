import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SchedulerConfigClient, { SchedulerConfig, SchedulerVersion } from './SchedulerConfigClient';

const FALLBACK: SchedulerConfig = {
  mode: 'shadow', maxOpenBets: 5, maxNewBetsPerUpdate: 1, pacingIntervalSeconds: 120,
  resolutionPlays: { shortMax: 10, mediumMax: 35, longMin: 40 },
  preferredOpenMix: { short: 2, medium: 2, long: 1 },
  sameTypeCooldown: { scope: 'quarter', maxOffers: 1 },
  ranking: { primary: 'base_excitement_rating', randomTieBreak: true },
};

export default async function BetSchedulerPage() {
  const { data } = await supabase.from('admin_config').select('value').eq('key', 'bet_scheduler_config').maybeSingle();
  const normalize = (config: Partial<SchedulerConfig> | undefined): SchedulerConfig => ({
    ...FALLBACK,
    ...config,
    resolutionPlays: { ...FALLBACK.resolutionPlays, ...(config?.resolutionPlays ?? {}) },
    preferredOpenMix: { ...FALLBACK.preferredOpenMix, ...(config?.preferredOpenMix ?? {}) },
    sameTypeCooldown: { ...FALLBACK.sameTypeCooldown, ...(config?.sameTypeCooldown ?? {}) },
    ranking: { ...FALLBACK.ranking, ...(config?.ranking ?? {}) },
  });
  const versions = ((data?.value?.versions ?? []) as SchedulerVersion[]).map(version => ({ ...version, config: normalize(version.config) }));
  const current = normalize(versions.find(version => version.isCurrent)?.config);
  return <div className="p-5 pb-10 max-w-4xl">
    <div className="mb-5"><h1 className="text-lg font-semibold text-gray-900">Bet Catalogue</h1><p className="text-sm text-secondary mt-1">Scheduler settings are versioned. The current active version controls live bet selection.</p></div>
    <div className="flex items-center gap-1 border-b border-border mb-5"><Link href="/bet-catalog" className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-transparent text-secondary hover:text-gray-900">Catalogue</Link><Link href="/bet-catalog/scheduler" className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-amber text-amber">Scheduler</Link></div>
    <SchedulerConfigClient initialConfig={current} versions={versions} />
  </div>;
}
