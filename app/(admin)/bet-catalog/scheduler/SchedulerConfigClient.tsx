'use client';

import { useState } from 'react';

export type SchedulerConfig = {
  mode: 'shadow';
  maxOpenBets: number;
  maxNewBetsPerUpdate: number;
  pacingIntervalSeconds: number;
  durationSeconds: { shortMax: number; mediumMax: number };
  preferredOpenMix: { short: number; medium: number; long: number };
  sameTypeCooldown: { scope: 'quarter' | 'game'; maxOffers: number };
  ranking: { primary: 'base_excitement_rating'; randomTieBreak: boolean };
};
export type SchedulerVersion = { id: string; isCurrent: boolean; label?: string; createdAt?: string; savedBy?: string; config: SchedulerConfig };

function Field({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return <label className="flex items-center justify-between py-2 border-b border-border last:border-0"><span className="text-sm text-secondary">{label}</span><input className="input w-24 text-right" type="number" min={min} value={value} onChange={event => onChange(Math.max(min, Number(event.target.value) || 0))} /></label>;
}

export default function SchedulerConfigClient({ initialConfig, versions }: { initialConfig: SchedulerConfig; versions: SchedulerVersion[] }) {
  const [config, setConfig] = useState<SchedulerConfig>(initialConfig);
  const [label, setLabel] = useState(''); const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  async function save() {
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/config/bet-scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, label }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Save failed');
      setMessage('Saved as the current shadow scheduler version.'); setLabel('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); } finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <div className="card border border-amber-border bg-amber-dim"><h2 className="font-semibold text-amber">Shadow mode</h2><p className="text-sm text-secondary mt-1">These values are saved and visible, but they do not open, suppress, or settle live bets yet.</p></div>
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Safety and pacing</h2><Field label="Maximum open bets per game" value={config.maxOpenBets} min={1} onChange={maxOpenBets => setConfig(current => ({ ...current, maxOpenBets }))} /><Field label="Maximum new bets per update" value={config.maxNewBetsPerUpdate} min={1} onChange={maxNewBetsPerUpdate => setConfig(current => ({ ...current, maxNewBetsPerUpdate }))} /><Field label="Pacing interval (seconds)" value={config.pacingIntervalSeconds} min={0} onChange={pacingIntervalSeconds => setConfig(current => ({ ...current, pacingIntervalSeconds }))} /></div>
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Duration mix</h2><Field label="Short bet maximum seconds" value={config.durationSeconds.shortMax} min={1} onChange={shortMax => setConfig(current => ({ ...current, durationSeconds: { ...current.durationSeconds, shortMax } }))} /><Field label="Medium bet maximum seconds" value={config.durationSeconds.mediumMax} min={config.durationSeconds.shortMax + 1} onChange={mediumMax => setConfig(current => ({ ...current, durationSeconds: { ...current.durationSeconds, mediumMax } }))} /><Field label="Preferred short bets open" value={config.preferredOpenMix.short} onChange={short => setConfig(current => ({ ...current, preferredOpenMix: { ...current.preferredOpenMix, short } }))} /><Field label="Preferred medium bets open" value={config.preferredOpenMix.medium} onChange={medium => setConfig(current => ({ ...current, preferredOpenMix: { ...current.preferredOpenMix, medium } }))} /><Field label="Preferred long bets open" value={config.preferredOpenMix.long} onChange={long => setConfig(current => ({ ...current, preferredOpenMix: { ...current.preferredOpenMix, long } }))} /></div>
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Repeat protection</h2><label className="flex items-center justify-between py-2 border-b border-border"><span className="text-sm text-secondary">Same-type cooldown scope</span><select className="input w-32" value={config.sameTypeCooldown.scope} onChange={event => setConfig(current => ({ ...current, sameTypeCooldown: { ...current.sameTypeCooldown, scope: event.target.value as 'quarter' | 'game' } }))}><option value="quarter">Quarter</option><option value="game">Game</option></select></label><Field label="Maximum offers in that scope" value={config.sameTypeCooldown.maxOffers} min={1} onChange={maxOffers => setConfig(current => ({ ...current, sameTypeCooldown: { ...current.sameTypeCooldown, maxOffers } }))} /></div>
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Selection</h2><p className="text-sm text-secondary">Candidates will be ranked by <span className="font-mono">base_excitement_rating</span> once structured rules are enforced.</p><label className="flex items-center gap-2 mt-4 text-sm text-secondary"><input type="checkbox" checked={config.ranking.randomTieBreak} onChange={event => setConfig(current => ({ ...current, ranking: { ...current.ranking, randomTieBreak: event.target.checked } }))} /> Randomly break equal-rating ties</label></div>
    </div>
    <div className="card flex gap-3"><input className="input flex-1" value={label} onChange={event => setLabel(event.target.value)} placeholder="Version label (optional)" /><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save shadow settings'}</button></div>
    {message && <p className={message.startsWith('Saved') ? 'text-success text-sm' : 'text-danger text-sm'}>{message}</p>}
    <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Recent versions</h2><div className="space-y-2">{versions.slice().reverse().slice(0, 8).map(version => <button key={version.id} className="block text-left w-full px-3 py-2 border border-border rounded hover:border-amber" onClick={() => setConfig(version.config)}><span className="text-sm font-medium text-gray-900">{version.label || 'Unlabelled settings'}</span>{version.isCurrent && <span className="ml-2 text-xs text-amber">CURRENT</span>}<span className="block text-xs text-muted">{version.savedBy ?? 'system'} · {version.createdAt ? new Date(version.createdAt).toLocaleString() : '—'}</span></button>)}</div></div>
  </div>;
}
