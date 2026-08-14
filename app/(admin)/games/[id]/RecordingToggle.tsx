'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

// The recording switch for a game: poller_enabled decides whether the poller
// fetches for it once live, and therefore whether any raw_events or game_events
// get written. Off means the game plays and records nothing.
export default function RecordingToggle({
  gameId,
  pollerEnabled,
  autoActivate,
  status,
}: {
  gameId: string;
  pollerEnabled: boolean;
  autoActivate: boolean;
  status: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(pollerEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollerEnabled: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not save');
        setSaving(false);
        return;
      }
      setOn(next);
      setSaving(false);
      router.refresh();
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  // An ended game can't record anything more, so the switch is informational
  // there rather than something worth changing.
  const isEnded = status === 'ended';
  const willNeverStart = status === 'lobby' && !autoActivate;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={saving}
        title={
          on
            ? 'Events are being recorded for this game (poller_enabled)'
            : 'No events will be recorded for this game (poller_enabled is off)'
        }
        className={clsx(
          'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50',
          on
            ? 'bg-success/10 text-success border-success/30 hover:border-success'
            : 'bg-danger/5 text-danger border-danger/30 hover:border-danger'
        )}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full', on ? 'bg-success' : 'bg-danger')} />
        {saving ? 'Saving…' : on ? 'Recording on' : 'Recording off'}
      </button>

      {willNeverStart && (
        <span
          title="auto_activate is off, so this game will stay in lobby until it is started manually — and a game that never goes live never records."
          className="text-xs text-amber bg-amber-dim border border-amber-border px-2 py-0.5 rounded-full font-semibold"
        >
          Won&apos;t auto-start
        </span>
      )}
      {isEnded && !on && (
        <span className="text-xs text-muted">recorded nothing further after it ended</span>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
