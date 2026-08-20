'use client';

import Link from 'next/link';
import { useState } from 'react';

export type CatalogRow = {
  id: string; sport: 'NFL' | 'NHL'; bet_id: string; bet_name: string;
  trigger_group: string; trigger_context: string | null; trigger_description: string;
  description: string | null; option_format: string; pricing: Record<string, unknown>;
  trigger_rule: Record<string, unknown>;
  default_window_seconds: number; display_tier: number | null; is_player_bet: boolean;
  average_plays_to_resolve: number | null; base_excitement_rating: number | null;
  active: boolean; implementation_status: 'live' | 'planned' | 'retired';
};

const TIER: Record<number, string> = { 1: 'Reactive', 2: 'Contextual', 3: 'Periodic', 4: 'Fill' };
const fieldLabels: Record<string, string> = {
  period: 'period', clock_seconds: 'clock', home_score: 'home score', away_score: 'away score', score_difference: 'score difference', score_difference_abs: 'score gap', is_tied: 'game tied', offense_team: 'offense', offense_is_trailing: 'offense trailing', is_new_drive: 'new drive', down: 'down', yards_to_go: 'yards to go', field_position_yards: 'yards to end zone', is_red_zone: 'in the red zone', drive_play_count: 'drive play count', play_type_slug: 'play type', drive_end_scored: 'drive scored', drive_end_touchdown: 'drive touchdown', drive_end_turnover: 'drive turnover',
};

function pricingText(pricing: Record<string, unknown>) {
  if (pricing.mode === 'fixed') return `${pricing.multiplierA} / ${pricing.multiplierB}`;
  if (pricing.mode === 'moneyline') return 'BDL moneyline';
  return JSON.stringify(pricing);
}

function triggerSummary(row: CatalogRow) {
  const rule = row.trigger_rule ?? {}; const conditions = Array.isArray(rule.all) ? rule.all as Record<string, unknown>[] : [];
  const eventTypes = Array.isArray(rule.event_types) ? rule.event_types.map(String) : [];
  const conditionText = conditions.slice(0, 2).map(condition => {
    const field = fieldLabels[String(condition.field)] ?? String(condition.field);
    const value = condition.value ?? (Array.isArray(condition.values) ? condition.values.join('–') : '');
    const operator: Record<string, string> = { eq: '=', neq: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥', in: 'is one of', not_in: 'is not', between: 'is between', multiple_of: 'is divisible by' };
    return `${field} ${operator[String(condition.operator)] ?? String(condition.operator)} ${String(value)}`;
  });
  const detail = [eventTypes.length ? `On ${eventTypes.map(event => event.replaceAll('_', ' ')).join(' or ')}` : '', conditionText.join(', ')].filter(Boolean).join(': ');
  const base = row.trigger_context ?? row.trigger_description;
  return detail ? `${base} — ${detail}${conditions.length > 2 ? ` +${conditions.length - 2} more` : ''}` : base;
}

function numberValue(value: string) { return value.trim() === '' ? null : Number(value); }

export default function CatalogTable({ catalog }: { catalog: CatalogRow[] }) {
  const [rows, setRows] = useState(catalog);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; error?: boolean } | null>(null);
  const update = (id: string, field: 'average_plays_to_resolve' | 'base_excitement_rating' | 'default_window_seconds', value: number | null) => setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row));
  const save = async (row: CatalogRow) => {
    setSaving(row.id); setMessage(null);
    const response = await fetch(`/api/bet-catalog/${row.id}/quick-fields`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ average_plays_to_resolve: row.average_plays_to_resolve, base_excitement_rating: row.base_excitement_rating, default_window_seconds: row.default_window_seconds }) });
    const result = await response.json();
    setMessage({ id: row.id, text: response.ok ? 'Saved' : (result.error ?? 'Save failed'), error: !response.ok }); setSaving(null);
  };

  return <div className="card p-0 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-gray-50">
    {['Status','Bet','Description','Trigger','Trigger rule','Type','Player bet','Avg plays to resolve','Rating','Options','Pricing rule','Window (sec)',''].map(header => <th key={header || 'save'} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">{header}</th>)}
  </tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
    <td className="px-3 py-2 text-secondary">{row.implementation_status}</td>
    <td className="px-3 py-2 text-gray-900 min-w-44"><Link href={`/bet-catalog/${row.id}`} className="hover:text-amber hover:underline"><div>{row.bet_name}</div><div className="font-mono text-xs text-muted mt-0.5">{row.bet_id}</div></Link></td>
    <td className="px-3 py-2 text-secondary min-w-72">{row.description ?? '—'}</td><td className="px-3 py-2 text-secondary min-w-64">{triggerSummary(row)}</td>
    <td className="px-3 py-2 text-secondary"><details><summary className="cursor-pointer text-xs text-amber whitespace-nowrap">View JSON</summary><pre className="mt-2 p-2 bg-gray-50 border border-border rounded text-xs font-mono whitespace-pre-wrap min-w-80">{JSON.stringify(row.trigger_rule, null, 2)}</pre></details></td>
    <td className="px-3 py-2 text-secondary">{row.display_tier ? TIER[row.display_tier] : '—'}</td><td className="px-3 py-2 text-secondary">{row.is_player_bet ? 'Yes' : 'No'}</td>
    <td className="px-3 py-2"><input aria-label={`${row.bet_name} average plays to resolve`} className="input w-20 py-1 font-mono text-sm" type="number" min="1" value={row.average_plays_to_resolve ?? ''} onChange={event => update(row.id, 'average_plays_to_resolve', numberValue(event.target.value))} /></td>
    <td className="px-3 py-2"><input aria-label={`${row.bet_name} excitement rating`} className="input w-20 py-1 font-mono text-sm" type="number" min="0" max="100" value={row.base_excitement_rating ?? ''} onChange={event => update(row.id, 'base_excitement_rating', numberValue(event.target.value))} /></td>
    <td className="px-3 py-2 text-secondary">{row.option_format}</td><td className="px-3 py-2 font-mono text-xs text-secondary">{pricingText(row.pricing)}</td>
    <td className="px-3 py-2"><input aria-label={`${row.bet_name} window seconds`} className="input w-20 py-1 font-mono text-sm" type="number" min="1" value={row.default_window_seconds} onChange={event => update(row.id, 'default_window_seconds', numberValue(event.target.value) ?? 1)} /></td>
    <td className="px-3 py-2 whitespace-nowrap"><button className="btn-secondary text-xs" onClick={() => save(row)} disabled={saving === row.id}>{saving === row.id ? 'Saving…' : 'Save'}</button>{message?.id === row.id && <span className={`block mt-1 text-xs ${message.error ? 'text-danger' : 'text-success'}`}>{message.text}</span>}</td>
  </tr>)}{rows.length === 0 && <tr><td colSpan={13} className="px-3 py-8 text-center text-muted">No catalogue definitions match these filters.</td></tr>}</tbody></table></div>;
}
