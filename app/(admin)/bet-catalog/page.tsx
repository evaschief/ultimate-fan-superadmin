import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import CatalogTable, { type CatalogRow } from './CatalogTable';

const stringValue = (value: string | string[] | undefined) => typeof value === 'string' ? value : '';
export default async function GlobalBetCatalogPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sport = stringValue(searchParams.sport) || 'NFL';
  const tier = stringValue(searchParams.tier);
  const status = stringValue(searchParams.status) || 'all';
  const { data } = await supabase.from('bet_catalog').select('id, sport, bet_id, bet_name, trigger_group, trigger_context, trigger_description, description, option_format, pricing, trigger_rule, default_window_seconds, display_tier, is_player_bet, average_plays_to_resolve, base_excitement_rating, active, implementation_status').eq('sport', sport).order('sort_order');
  const catalog = ((data ?? []) as CatalogRow[]).filter(row => {
    if (tier && String(row.display_tier ?? '') !== tier) return false;
    if (status !== 'all' && row.implementation_status !== status) return false;
    return true;
  }).sort((a, b) => Number(a.implementation_status === 'retired') - Number(b.implementation_status === 'retired'));

  return <div className="p-5 pb-10">
    <div className="mb-5"><h1 className="text-lg font-semibold text-gray-900">Bet Catalogue</h1><p className="text-sm text-secondary mt-1">The shared <span className="font-mono">bet_catalog</span> source of truth for all potential bet types.</p></div>
    <div className="flex items-center gap-1 border-b border-border mb-4"><Link href="/bet-catalog" className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-amber text-amber">Catalogue</Link><Link href="/bet-catalog/scheduler" className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-transparent text-secondary hover:text-gray-900">Scheduler</Link></div>
    <form className="flex flex-wrap items-end gap-3 mb-4" method="get">
      <label className="text-xs text-secondary">Sport<select name="sport" defaultValue={sport} className="block mt-1 border border-border rounded px-2 py-1.5 bg-white text-sm"><option>NFL</option><option>NHL</option></select></label>
      <label className="text-xs text-secondary">Type<select name="tier" defaultValue={tier} className="block mt-1 border border-border rounded px-2 py-1.5 bg-white text-sm"><option value="">All</option><option value="1">Reactive</option><option value="2">Contextual</option><option value="3">Periodic</option><option value="4">Fill</option></select></label>
      <label className="text-xs text-secondary">Implementation<select name="status" defaultValue={status} className="block mt-1 border border-border rounded px-2 py-1.5 bg-white text-sm"><option value="all">All</option><option value="live">Live</option><option value="planned">Planned</option><option value="retired">Retired</option></select></label>
      <button type="submit" className="btn-secondary text-sm">Apply</button>
    </form>
    <CatalogTable catalog={catalog} />
  </div>;
}
