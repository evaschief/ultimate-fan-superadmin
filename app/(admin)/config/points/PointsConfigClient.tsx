'use client';

import { useState } from 'react';
import { ScoringConfig, ConfigVersion } from '@/types';

interface Props {
  initialConfig: ScoringConfig;
  versions: ConfigVersion[];
}

function NumberField({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-secondary">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="input w-24 text-right"
      />
    </div>
  );
}

export default function PointsConfigClient({ initialConfig, versions }: Props) {
  const [config, setConfig] = useState<ScoringConfig>(initialConfig);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function setHockey<K extends keyof ScoringConfig['hockey']>(key: K, val: number) {
    setConfig(c => ({ ...c, hockey: { ...c.hockey, [key]: val } }));
  }
  function setFootball<K extends keyof ScoringConfig['football']>(key: K, val: number) {
    setConfig(c => ({ ...c, football: { ...c.football, [key]: val } }));
  }
  function setMultiplier<K extends keyof ScoringConfig['betMultipliers']>(key: K, val: number) {
    setConfig(c => ({ ...c, betMultipliers: { ...c.betMultipliers, [key]: val } }));
  }
  function setWindow<K extends keyof ScoringConfig['betWindowSeconds']>(key: K, val: number) {
    setConfig(c => ({ ...c, betWindowSeconds: { ...c.betWindowSeconds, [key]: val } }));
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/config/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, label }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Save failed');
      }
      setSaved(true);
      setLabel('');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function loadVersion(v: ConfigVersion) {
    setConfig(v.config);
  }

  return (
    <div className="flex gap-8">
      {/* Main config */}
      <div className="flex-1 space-y-6">
        {/* Hockey */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Hockey Scoring</h2>
          {(Object.entries(config.hockey) as [keyof typeof config.hockey, number][]).map(([k, v]) => (
            <NumberField key={k} label={k} value={v} onChange={val => setHockey(k, val)} />
          ))}
        </div>

        {/* Football */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Football Scoring</h2>
          {(Object.entries(config.football) as [keyof typeof config.football, number][]).map(([k, v]) => (
            <NumberField key={k} label={k} value={v} onChange={val => setFootball(k, val)} />
          ))}
        </div>

        {/* Multipliers */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Bet Multipliers</h2>
          {(Object.entries(config.betMultipliers) as [keyof typeof config.betMultipliers, number][]).map(([k, v]) => (
            <NumberField key={k} label={k} value={v} onChange={val => setMultiplier(k, val)} />
          ))}
        </div>

        {/* Windows */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Bet Window Seconds</h2>
          {(Object.entries(config.betWindowSeconds) as [keyof typeof config.betWindowSeconds, number][]).map(([k, v]) => (
            <NumberField key={k} label={k} value={v} onChange={val => setWindow(k, val)} />
          ))}
        </div>

        {/* Save */}
        <div className="card flex items-center gap-4">
          <input
            type="text"
            placeholder="Version label (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="input flex-1"
          />
          <button onClick={handleSave} disabled={saving} className="btn-primary whitespace-nowrap">
            {saving ? 'Saving…' : 'Save Version'}
          </button>
        </div>
        {saved && <p className="text-success text-sm">Saved and set as current.</p>}
        {error && <p className="text-danger text-sm">{error}</p>}
      </div>

      {/* Version history */}
      <div className="w-64 flex-shrink-0">
        <div className="card sticky top-8">
          <h2 className="font-semibold text-gray-900 mb-3">Version History</h2>
          {versions.length === 0 ? (
            <p className="text-muted text-sm">No saved versions yet.</p>
          ) : (
            <div className="space-y-2">
              {versions.map(v => (
                <button
                  key={v.id}
                  onClick={() => loadVersion(v)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-amber transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {v.label || 'Unlabeled'}
                    </span>
                    {v.isCurrent && (
                      <span className="text-xs text-amber font-semibold ml-1">LIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">by {v.savedBy}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
