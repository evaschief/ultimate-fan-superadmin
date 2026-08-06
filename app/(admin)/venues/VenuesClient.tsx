'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Venue {
  id: string;
  name: string;
  city: string;
  venue_code: string | null;
  is_active: boolean;
  created_at: string | null;
  gamesCount: number;
}

// Common US IANA timezones. Kept as a hardcoded list rather than
// Intl.supportedValuesOf('timeZone') since that returns hundreds of
// zones worldwide and every venue in this app is US-based today.
export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Phoenix', label: 'Mountain, no DST (Arizona)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
];

function AddVenueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [venueCode, setVenueCode] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city, venueCode, timezone, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch {
      setError('Network error — try again');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Add Venue</h2>
          <button onClick={onClose} className="text-muted hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted uppercase tracking-wider font-semibold">Venue</p>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Name</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Downtown Sports Bar"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">City</label>
            <input
              type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="e.g. Austin, TX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Venue Code</label>
            <input
              type="text" required value={venueCode}
              onChange={e => setVenueCode(e.target.value.toUpperCase())}
              placeholder="e.g. BREW"
              maxLength={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-muted mt-1">
              Permanent code players type to join whatever game is live at this venue.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Timezone</label>
            <select
              value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {US_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">Used to show game start times in this venue's local time.</p>
          </div>

          <p className="text-xs text-muted uppercase tracking-wider font-semibold pt-2">Admin Login</p>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@venue.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Password</label>
            <input
              type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-muted mt-1">This admin will only see games at this venue.</p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VenuesClient({ venues }: { venues: Venue[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const active = venues.filter(v => v.is_active);
  const inactive = venues.filter(v => !v.is_active);

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Venues</h1>
          <p className="text-secondary text-sm mt-1">{active.length} active · {inactive.length} inactive</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 text-white text-xl leading-none hover:bg-gray-800 transition-colors"
          title="Add venue"
        >
          +
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Venue</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Code</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">City</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Games Played</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Added</th>
            </tr>
          </thead>
          <tbody>
            {venues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">No venues found</td>
              </tr>
            ) : (
              venues.map((v, i) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/venues/${v.id}`)}
                  className={
                    (i % 2 === 0 ? 'bg-white border-b border-border' : 'bg-gray-50/50 border-b border-border') +
                    ' cursor-pointer hover:bg-amber-dim/50 transition-colors'
                  }
                >
                  <td className="px-3 py-2 font-medium text-gray-900">{v.name || '—'}</td>
                  <td className="px-3 py-2 font-mono text-secondary">{v.venue_code || '—'}</td>
                  <td className="px-3 py-2 text-secondary">{v.city || '—'}</td>
                  <td className="px-3 py-2 text-secondary">{v.gamesCount}</td>
                  <td className="px-3 py-2">
                    {v.is_active ? (
                      <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-semibold">Active</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-muted border border-border px-2 py-0.5 rounded-full font-semibold">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-secondary">
                    {v.created_at
                      ? new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddVenueModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
