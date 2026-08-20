'use client';

import { useState } from 'react';

export type SchedulerConfig = {
  maxOpenBets: number;
  maxNewBetsPerUpdate: number;
  pacingIntervalSeconds: number;
  resolutionPlays: { shortMax: number; mediumMax: number; longMin: number };
  preferredOpenMix: { short: number; medium: number; long: number };
  sameTypeCooldown: { scope: 'quarter' | 'game'; maxOffers: number };
  ranking: { primary: 'base_excitement_rating'; randomTieBreak: boolean };
};

function Field({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return <label className="flex items-center justify-between py-2 border-b border-border last:border-0"><span className="text-sm text-secondary">{label}</span><input className="input w-24 text-right" type="number" min={min} value={value} onChange={event => onChange(Math.max(min, Number(event.target.value) || 0))} /></label>;
}

export default function SchedulerConfigClient({ initialConfig }: { initialConfig: SchedulerConfig }) {
  const [config, setConfig] = useState<SchedulerConfig>(initialConfig);
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  async function save() {
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/config/bet-scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Save failed');
      setMessage('Saved live scheduler settings.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); } finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <div className="card border border-success bg-success-dim"><h2 className="font-semibold text-success">Live scheduler</h2><p className="text-sm text-secondary mt-1">These settings control bet caps, pacing, cooldowns, catalogue priority, and duration mix for the product.</p></div>
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Safety and pacing</h2><Field label="Maximum open bets per game" value={config.maxOpenBets} min={1} onChange={maxOpenBets => setConfig(current => ({ ...current, maxOpenBets }))} /><Field label="Maximum new bets per update" value={config.maxNewBetsPerUpdate} min={1} onChange={maxNewBetsPerUpdate => setConfig(current => ({ ...current, maxNewBetsPerUpdate }))} /><Field label="Pacing interval (seconds)" value={config.pacingIntervalSeconds} min={0} onChange={pacingIntervalSeconds => setConfig(current => ({ ...current, pacingIntervalSeconds }))} /></div>
      <div className="card"><h2 className="font-semibold text-gray-900 mb-1">Duration mix</h2><p className="text-sm text-secondary mb-3">Defined by the catalogue’s Average plays to resolve, not the player offer window. Bets with 36–39 average plays are neutral: they remain eligible but receive no mix preference.</p><Field label="Short: maximum average plays" value={config.resolutionPlays.shortMax} min={0} onChange={shortMax => setConfig(current => ({ ...current, resolutionPlays: { ...current.resolutionPlays, shortMax } }))} /><Field label="Medium: maximum average plays" value={config.resolutionPlays.mediumMax} min={config.resolutionPlays.shortMax + 1} onChange={mediumMax => setConfig(current => ({ ...current, resolutionPlays: { ...current.resolutionPlays, mediumMax } }))} /><Field label="Long: minimum average plays" value={config.resolutionPlays.longMin} min={config.resolutionPlays.mediumMax + 1} onChange={longMin => setConfig(current => ({ ...current, resolutionPlays: { ...current.resolutionPlays, longMin } }))} /><Field label="Preferred short bets open" value={config.preferredOpenMix.short} onChange={short => setConfig(current => ({ ...current, preferredOpenMix: { ...current.preferredOpenMix, short } }))} /><Field label="Preferred medium bets open" value={config.preferredOpenMix.medium} onChange={medium => setConfig(current => ({ ...current, preferredOpenMix: { ...current.preferredOpenMix, medium } }))} /><Field label="Preferred long bets open" value={config.preferredOpenMix.long} onChange={long => setConfig(current => ({ ...current, preferredOpenMix: { ...current.preferredOpenMix, long } }))} /></div>
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Repeat protection</h2><label className="flex items-center justify-between py-2 border-b border-border"><span className="text-sm text-secondary">Same-type cooldown scope</span><select className="input w-32" value={config.sameTypeCooldown.scope} onChange={event => setConfig(current => ({ ...current, sameTypeCooldown: { ...current.sameTypeCooldown, scope: event.target.value as 'quarter' | 'game' } }))}><option value="quarter">Quarter</option><option value="game">Game</option></select></label><Field label="Maximum offers in that scope" value={config.sameTypeCooldown.maxOffers} min={1} onChange={maxOffers => setConfig(current => ({ ...current, sameTypeCooldown: { ...current.sameTypeCooldown, maxOffers } }))} /></div>
      <div className="card"><h2 className="font-semibold text-gray-900 mb-3">Selection</h2><p className="text-sm text-secondary">Eligible candidates are ranked by the catalogue’s <span className="font-mono">base_excitement_rating</span>. Structured JSON trigger rules are the next step.</p><label className="flex items-center gap-2 mt-4 text-sm text-secondary"><input type="checkbox" checked={config.ranking.randomTieBreak} onChange={event => setConfig(current => ({ ...current, ranking: { ...current.ranking, randomTieBreak: event.target.checked } }))} /> Randomly break equal-rating ties</label></div>
    </div>
    <div className="card flex justify-end"><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save scheduler settings'}</button></div>
    {message && <p className={message.startsWith('Saved') ? 'text-success text-sm' : 'text-danger text-sm'}>{message}</p>}
  </div>;
}
