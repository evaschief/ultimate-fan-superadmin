'use client';

import { useEffect, useRef, useState } from 'react';

export type EditableBet = {
  id: string; sport: string; bet_id: string; bet_name: string;
  question_template: string; flavour_template: string; trigger_group: string;
  trigger_description: string; trigger_context: string | null; description: string | null;
  option_format: string; pricing: Record<string, unknown>; default_window_seconds: number;
  manual_openable: boolean; active: boolean; sort_order: number; display_tier: number | null;
  is_player_bet: boolean; average_plays_to_resolve: number | null;
  base_excitement_rating: number | null; implementation_status: 'live' | 'planned' | 'retired';
  option_builder: Record<string, unknown>; selection_policy: Record<string, unknown>;
  settlement_rule: Record<string, unknown>; settlement_summary: string | null; trigger_rule: Record<string, unknown>;
};

const textFields: { key: keyof EditableBet; label: string; multiline?: boolean }[] = [
  { key: 'bet_name', label: 'Bet name' }, { key: 'question_template', label: 'Question template', multiline: true },
  { key: 'flavour_template', label: 'Flavour template', multiline: true }, { key: 'trigger_group', label: 'Trigger group' },
  { key: 'trigger_description', label: 'Trigger description', multiline: true }, { key: 'trigger_context', label: 'Trigger summary', multiline: true },
  { key: 'description', label: 'Description', multiline: true }, { key: 'option_format', label: 'Options format' },
];

function jsonText(value: Record<string, unknown>) { return JSON.stringify(value ?? {}, null, 2); }
function parseOptionalInteger(value: string) { return value.trim() === '' ? null : Number.parseInt(value, 10); }

function JsonEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = '0px';
    ref.current.style.height = `${Math.max(180, ref.current.scrollHeight)}px`;
  };
  useEffect(resize, [value]);
  return <textarea ref={ref} className="input mt-1 font-mono text-xs overflow-y-hidden resize-y" value={value} onChange={event => { onChange(event.target.value); requestAnimationFrame(resize); }} />;
}

export default function BetCatalogEditor({ initialBet }: { initialBet: EditableBet }) {
  const [bet, setBet] = useState(initialBet);
  const [json, setJson] = useState({ pricing: jsonText(initialBet.pricing), option_builder: jsonText(initialBet.option_builder), selection_policy: jsonText(initialBet.selection_policy), settlement_rule: jsonText(initialBet.settlement_rule) });
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  const set = <K extends keyof EditableBet>(key: K, value: EditableBet[K]) => setBet(current => ({ ...current, [key]: value }));

  async function save() {
    setSaving(true); setMessage('');
    try {
      const parsed = Object.fromEntries(Object.entries(json).map(([key, value]) => [key, JSON.parse(value)]));
      const response = await fetch(`/api/bet-catalog/${bet.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...bet, ...parsed }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Save failed');
      setMessage('Saved to bet_catalog. New offers will use these values.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed.'); } finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <div className="card bg-gray-50"><div className="grid sm:grid-cols-2 gap-3 text-sm"><p><span className="text-secondary">Sport:</span> {bet.sport}</p><p><span className="text-secondary">Bet ID:</span> <span className="font-mono">{bet.bet_id}</span></p></div><p className="text-xs text-secondary mt-3">Sport and Bet ID are intentionally fixed: the live event handlers use this stable identifier. Trigger rule JSON is shown below but cannot be edited here.</p></div>
    <div className="card"><h2 className="font-semibold text-gray-900 mb-4">Bet details</h2><div className="grid md:grid-cols-2 gap-4">{textFields.map(field => <label key={String(field.key)} className={field.multiline ? 'md:col-span-2' : ''}><span className="text-xs font-medium text-secondary">{field.label}</span>{field.multiline ? <textarea className="input mt-1 min-h-20" value={(bet[field.key] ?? '') as string} onChange={event => set(field.key, event.target.value as never)} /> : <input className="input mt-1" value={(bet[field.key] ?? '') as string} onChange={event => set(field.key, event.target.value as never)} />}</label>)}</div></div>
    <div className="card"><h2 className="font-semibold text-gray-900 mb-4">Availability and scheduling</h2><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"><label><span className="text-xs font-medium text-secondary">Status</span><select className="input mt-1" value={bet.implementation_status} onChange={event => set('implementation_status', event.target.value as EditableBet['implementation_status'])}><option value="live">Live</option><option value="planned">Planned</option><option value="retired">Retired</option></select></label><label><span className="text-xs font-medium text-secondary">Window (sec)</span><input className="input mt-1" type="number" min="1" value={bet.default_window_seconds} onChange={event => set('default_window_seconds', Number(event.target.value))} /></label><label><span className="text-xs font-medium text-secondary">Sort order</span><input className="input mt-1" type="number" min="1" value={bet.sort_order} onChange={event => set('sort_order', Number(event.target.value))} /></label><label><span className="text-xs font-medium text-secondary">Type tier (1–4)</span><input className="input mt-1" type="number" min="1" max="4" value={bet.display_tier ?? ''} onChange={event => set('display_tier', parseOptionalInteger(event.target.value))} /></label><label><span className="text-xs font-medium text-secondary">Average plays to resolve</span><input className="input mt-1" type="number" min="1" value={bet.average_plays_to_resolve ?? ''} onChange={event => set('average_plays_to_resolve', parseOptionalInteger(event.target.value))} /></label><label><span className="text-xs font-medium text-secondary">Excitement rating (0–100)</span><input className="input mt-1" type="number" min="0" max="100" value={bet.base_excitement_rating ?? ''} onChange={event => set('base_excitement_rating', parseOptionalInteger(event.target.value))} /></label></div><div className="flex flex-wrap gap-5 mt-5 text-sm text-secondary">{([['active', 'Active'], ['manual_openable', 'May open manually'], ['is_player_bet', 'Player bet']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={bet[key]} onChange={event => set(key, event.target.checked)} />{label}</label>)}</div></div>
    <div className="grid lg:grid-cols-2 gap-5"><div className="space-y-5"><div className="card"><h2 className="font-semibold text-gray-900">Pricing and options</h2><div className="mt-4 space-y-4">{(['pricing', 'option_builder'] as const).map(key => <label key={key} className="block"><span className="text-xs font-medium text-secondary font-mono">{key}</span><JsonEditor value={json[key]} onChange={value => setJson(current => ({ ...current, [key]: value }))} /></label>)}</div></div><div className="card"><h2 className="font-semibold text-gray-900">Scheduling</h2><p className="text-sm text-secondary mt-1">Optional per-bet scheduling overrides. The current global scheduler remains in control until overrides are explicitly enforced.</p><label className="block mt-4"><span className="text-xs font-medium text-secondary font-mono">selection_policy_overrides</span><JsonEditor value={json.selection_policy} onChange={value => setJson(current => ({ ...current, selection_policy: value }))} /></label></div><div className="card"><h2 className="font-semibold text-gray-900">Settlement</h2><p className="text-sm text-secondary mt-1">Current settlement functionality is handled by <span className="font-mono">process-event</span>. This explanation describes the actual result path for this bet.</p><label className="block mt-4"><span className="text-xs font-medium text-secondary">Settlement explanation</span><textarea className="input mt-1 min-h-24" value={bet.settlement_summary ?? ''} onChange={event => set('settlement_summary', event.target.value)} /></label><label className="block mt-4"><span className="text-xs font-medium text-secondary font-mono">settlement_rule</span><JsonEditor value={json.settlement_rule} onChange={value => setJson(current => ({ ...current, settlement_rule: value }))} /></label></div></div><div className="card"><h2 className="font-semibold text-gray-900">Trigger rule <span className="text-xs font-normal text-secondary">read-only</span></h2><p className="text-sm text-secondary mt-1 mb-3">This is protected because it controls when a bet can enter the live scheduler.</p><pre className="p-3 bg-gray-50 border border-border rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">{JSON.stringify(bet.trigger_rule, null, 2)}</pre><div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-semibold text-gray-900">Available live fields</h3><p className="text-xs text-secondary mt-1">Use these exact field names in rule comparisons.</p><ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-secondary"><li>period</li><li>clock_seconds</li><li>home_score, away_score</li><li>score_difference, score_difference_abs, is_tied</li><li>offense_team, offense_is_trailing</li><li>is_new_drive, down, yards_to_go</li><li>field_position_yards, is_red_zone</li><li>drive_play_count, play_type_slug</li><li>drive_end_scored, drive_end_touchdown, drive_end_turnover</li></ul></div></div></div>
    <div className="flex items-center gap-3"><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>{message && <span className={message.startsWith('Saved') ? 'text-success text-sm' : 'text-danger text-sm'}>{message}</span>}</div>
  </div>;
}
