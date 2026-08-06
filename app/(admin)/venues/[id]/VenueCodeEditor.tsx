'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VenueCodeEditor({ locationId, initialCode }: { locationId: string; initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [draft, setDraft] = useState(initialCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const next = draft.trim().toUpperCase();
    if (!next || next === code) { setDraft(code); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueCode: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
        setDraft(code);
      } else {
        setCode(next);
        router.refresh();
      }
    } catch {
      setError('Network error — try again');
      setDraft(code);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-secondary">Venue Code</label>
      <input
        type="text"
        value={draft}
        disabled={saving}
        onChange={e => setDraft(e.target.value.toUpperCase())}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        maxLength={12}
        className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
