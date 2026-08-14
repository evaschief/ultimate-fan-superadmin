'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { RawEvent, eventLabel, fmtClockTime, periodClock } from '../eventFormat';

function preview(e: RawEvent): string {
  const json = JSON.stringify(e.event_data ?? {});
  return json.length > 120 ? `${json.slice(0, 120)}…` : json;
}

export default function RawEventsClient({ events }: { events: RawEvent[] }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const types = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  // Search runs over the serialised payload as well as the type/bet id, so a
  // player name, a stat key or a bet id all find their rows.
  const haystacks = useMemo(
    () => new Map(events.map(e => [
      e.id,
      `${e.event_type} ${e.bet_id ?? ''} ${e.winning_option ?? ''} ${e.player ?? ''} ${JSON.stringify(e.event_data ?? {})}`.toLowerCase(),
    ])),
    [events]
  );

  const query = search.trim().toLowerCase();
  const filtered = events.filter(e => {
    if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
    if (query && !(haystacks.get(e.id) ?? '').includes(query)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => setTypeFilter('all')}
          className={clsx(
            'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
            typeFilter === 'all'
              ? 'bg-amber-dim text-amber border-amber-border'
              : 'bg-white text-secondary border-border hover:border-amber'
          )}
        >
          ALL <span className="font-normal opacity-70">{events.length}</span>
        </button>
        {types.map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
              typeFilter === type
                ? 'bg-amber-dim text-amber border-amber-border'
                : 'bg-white text-secondary border-border hover:border-amber'
            )}
          >
            {type} <span className="font-normal opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search payload, bet id, player…"
          className="input max-w-xs"
        />
        <span className="text-muted text-xs ml-auto">{filtered.length} of {events.length} rows</span>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Event Type</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Game Clock</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Bet ID</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Payload</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr
                key={e.id}
                className={`border-b border-border last:border-0 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{fmtClockTime(e.created_at)}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-900 whitespace-nowrap">{e.event_type}</td>
                <td className="px-3 py-2 font-mono text-xs text-secondary whitespace-nowrap">{periodClock(e)}</td>
                <td className="px-3 py-2 font-mono text-xs text-secondary whitespace-nowrap">
                  {e.bet_id || <span className="text-muted">—</span>}
                  {e.winning_option && <div className="text-success">{e.winning_option}</div>}
                </td>
                <td className="px-3 py-2">
                  <details>
                    <summary className="cursor-pointer font-mono text-xs text-secondary hover:text-gray-900 break-all">
                      {preview(e)}
                    </summary>
                    <pre className="mt-2 bg-gray-50 border border-border rounded-md p-2 text-xs font-mono text-gray-900 overflow-x-auto">
{JSON.stringify({ event_id: e.event_id, player: e.player, event_data: e.event_data }, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  {events.length === 0 ? 'No events recorded for this game' : 'No rows match this filter'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {typeFilter !== 'all' && filtered.length > 0 && (
        <p className="text-xs text-muted mt-2">Showing {eventLabel(typeFilter)} rows only.</p>
      )}
    </div>
  );
}
