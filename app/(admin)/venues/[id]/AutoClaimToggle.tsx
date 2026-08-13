'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Lets a venue opt into schedule-games' autoClaimForOptedInVenues() pass
// (migration 047's locations.auto_claim_games): when checked, every game
// discovered by the daily 14-day-lookahead cron gets automatically claimed
// for this venue the moment its date arrives — a real join_code, roster,
// and audit sheet, with no admin having to check anything off in the
// Schedule tab first. Off (the default) keeps today's manual-claim behavior.
export default function AutoClaimToggle({ locationId, initialValue }: { locationId: string; initialValue: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !checked;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoClaimGames: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
      } else {
        setChecked(next);
        router.refresh();
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={toggle}
          className="cursor-pointer disabled:opacity-50"
        />
        Auto-claim games
      </label>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
