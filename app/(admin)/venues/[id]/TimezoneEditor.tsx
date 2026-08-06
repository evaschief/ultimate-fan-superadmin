'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { US_TIMEZONES } from '../VenuesClient';

export default function TimezoneEditor({ locationId, initialTimezone }: { locationId: string; initialTimezone: string }) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setTimezone(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
      } else {
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
      <label className="text-xs text-secondary">Timezone</label>
      <select
        value={timezone}
        disabled={saving}
        onChange={e => save(e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
      >
        {US_TIMEZONES.map(tz => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
