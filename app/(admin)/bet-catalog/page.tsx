import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type CatalogRow = {
  id: string; sport: 'NFL' | 'NHL'; bet_id: string; bet_name: string;
  trigger_group: string; trigger_context: string | null; trigger_description: string;
  description: string | null; option_format: string; pricing: Record<string, unknown>;
  trigger_rule: Record<string, unknown>;
  default_window_seconds: number; display_tier: number | null; is_player_bet: boolean;
  average_plays_to_resolve: number | null; base_excitement_rating: number | null;
  active: boolean; implementation_status: 'live' | 'planned' | 'retired';
};

const stringValue = (value: string | string[] | undefined) => typeof value === 'string' ? value : '';
const TIER: Record<number, string> = { 1: 'Reactive', 2: 'Contextual', 3: 'Periodic', 4: 'Fill' };

function pricingText(pricing: Record<string, unknown>) {
  if (pricing.mode === 'fixed') return `${pricing.multiplierA} / ${pricing.multiplierB}`;
  if (pricing.mode === 'moneyline') return 'BDL moneyline';
  return JSON.stringify(pricing);
}

const fieldLabels: Record<string, string> = {
  period: 'period', clock_seconds: 'clock', home_score: 'home score', away_score: 'away score',
  score_difference: 'score difference', score_difference_abs: 'score gap', is_tied: 'game tied',
  offense_team: 'offense', offense_is_trailing: 'offense trailing', is_new_drive: 'new drive',
  down: 'down', yards_to_go: 'yards to go', field_position_yards: 'yards to end zone',
  is_red_zone: 'in the red zone', drive_play_count: 'drive play count', play_type_slug: 'play type',
  drive_end_scored: 'drive scored', drive_end_touchdown: 'drive touchdown', drive_end_turnover: 'drive turnover',
};

function triggerSummary(row: CatalogRow) {
  const rule = row.trigger_rule ?? {}; const conditions = Array.isArray(rule.all) ? rule.all as Record<string, unknown>[] : [];
  const eventTypes = Array.isArray(rule.event_types) ? rule.event_types.map(String) : [];
  const conditionText = conditions.slice(0, 2).map(condition => {
    const field = fieldLabels[String(condition.field)] ?? String(condition.field);
    const value = condition.value ?? (Array.isArray(condition.values) ? condition.values.join('–') : '');
    const operator: Record<string, string> = { eq: '=', neq: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥', in: 'is one of', not_in: 'is not', between: 'is between' };
    return `${field} ${operator[String(condition.operator)] ?? String(condition.operator)} ${String(value)}`;
  });
  const detail = [eventTypes.length ? `On ${eventTypes.map(event => event.replaceAll('_', ' ')).join(' or ')}` : '', conditionText.join(', ')].filter(Boolean).join(': ');
  const base = row.trigger_context ?? row.trigger_description;
  return detail ? `${base} — ${detail}${conditions.length > 2 ? ` +${conditions.length - 2} more` : ''}` : base;
}

export default async function GlobalBetCatalogPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sport = stringValue(searchParams.sport) || 'NFL';
  const tier = stringValue(searchParams.tier);
  const status = stringValue(searchParams.status) || 'all';
  const { data } = await supabase.from('bet_catalog').select('id, sport, bet_id, bet_name, trigger_group, trigger_context, trigger_description, description, option_format, pricing, trigger_rule, default_window_seconds, display_tier, is_player_bet, average_plays_to_resolve, base_excitement_rating, active, implementation_status').eq('sport', sport).order('sort_order');
  const catalog = ((data ?? []) as CatalogRow[]).filter(row => {
    if (tier && String(row.display_tier ?? '') !== tier) return false;
    if (status !== 'all' && row.implementation_status !== status) return false;
    return true;
  });

  return <div className="p-5 pb-10">
    <div className="mb-5"><h1 className="text-lg font-semibold text-gray-900">Bet Catalogue</h1><p className="text-sm text-secondary mt-1">The shared <span className="font-mono">bet_catalog</span> source of truth for all potential bet types.</p></div>
    <div className="flex items-center gap-1 border-b border-border mb-4"><Link href="/bet-catalog" className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-amber text-amber">Catalogue</Link><Link href="/bet-catalog/scheduler" className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-transparent text-secondary hover:text-gray-900">Scheduler</Link></div>
    <form className="flex flex-wrap items-end gap-3 mb-4" method="get">
      <label className="text-xs text-secondary">Sport<select name="sport" defaultValue={sport} className="block mt-1 border border-border rounded px-2 py-1.5 bg-white text-sm"><option>NFL</option><option>NHL</option></select></label>
      <label className="text-xs text-secondary">Type<select name="tier" defaultValue={tier} className="block mt-1 border border-border rounded px-2 py-1.5 bg-white text-sm"><option value="">All</option><option value="1">Reactive</option><option value="2">Contextual</option><option value="3">Periodic</option><option value="4">Fill</option></select></label>
      <label className="text-xs text-secondary">Implementation<select name="status" defaultValue={status} className="block mt-1 border border-border rounded px-2 py-1.5 bg-white text-sm"><option value="all">All</option><option value="live">Live</option><option value="planned">Planned</option><option value="retired">Retired</option></select></label>
      <button type="submit" className="btn-secondary text-sm">Apply</button>
    </form>
    <div className="card p-0 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-gray-50">
      {['Status','Bet','Description','Trigger','Trigger rule','Type','Player bet','Avg plays to resolve','Rating','Options','Pricing rule','Window (sec)'].map(header => <th key={header} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">{header}</th>)}
    </tr></thead><tbody>{catalog.map((row, index) => <tr key={row.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
      <td className="px-3 py-2 text-secondary">{row.implementation_status}</td>
      <td className="px-3 py-2 text-gray-900 min-w-44"><Link href={`/bet-catalog/${row.id}`} className="hover:text-amber hover:underline"><div>{row.bet_name}</div><div className="font-mono text-xs text-muted mt-0.5">{row.bet_id}</div></Link><Link href={`/bet-catalog/${row.id}`} className="text-xs text-amber hover:underline">Edit</Link></td>
      <td className="px-3 py-2 text-secondary min-w-72">{row.description ?? '—'}</td>
      <td className="px-3 py-2 text-secondary min-w-64">{triggerSummary(row)}</td>
      <td className="px-3 py-2 text-secondary"><details><summary className="cursor-pointer text-xs text-amber whitespace-nowrap">View JSON</summary><pre className="mt-2 p-2 bg-gray-50 border border-border rounded text-xs font-mono whitespace-pre-wrap min-w-80">{JSON.stringify(row.trigger_rule, null, 2)}</pre></details></td>
      <td className="px-3 py-2 text-secondary">{row.display_tier ? TIER[row.display_tier] : '—'}</td>
      <td className="px-3 py-2 text-secondary">{row.is_player_bet ? 'Yes' : 'No'}</td>
      <td className="px-3 py-2 font-mono text-secondary">{row.average_plays_to_resolve ?? '—'}</td>
      <td className="px-3 py-2 font-mono text-secondary">{row.base_excitement_rating ?? '—'}</td>
      <td className="px-3 py-2 text-secondary">{row.option_format}</td>
      <td className="px-3 py-2 font-mono text-xs text-secondary">{pricingText(row.pricing)}</td>
      <td className="px-3 py-2 font-mono text-secondary">{row.default_window_seconds}</td>
    </tr>)}{catalog.length === 0 && <tr><td colSpan={12} className="px-3 py-8 text-center text-muted">No catalogue definitions match these filters.</td></tr>}</tbody></table></div>
  </div>;
}
