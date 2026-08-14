'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  RawEvent, describeEvent, eventLabel, fmtClockTime, periodClock, scoreLabel, teamLabel,
} from '../eventFormat';

export default function GameEventsClient({ events }: { events: RawEvent[] }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // `game_stat` rows outnumber everything else roughly 3:1, so the type filter
  // is what makes this view readable — chips are ordered by frequency.
  const types = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const filtered = typeFilter === 'all'
    ? events
    : events.filter(e => e.event_type === typeFilter);

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
            {eventLabel(type)} <span className="font-normal opacity-70">{count}</span>
          </button>
        ))}
        <span className="text-muted text-xs ml-auto">{filtered.length} events</span>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Game Clock</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Event</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Team</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Detail</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const isScoring = e.event_type.startsWith('score_');
              return (
                <tr key={e.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">{fmtClockTime(e.created_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-secondary whitespace-nowrap">{periodClock(e)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={clsx('text-xs font-semibold', isScoring ? 'text-success' : 'text-gray-900')}>
                      {eventLabel(e.event_type)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-secondary text-xs whitespace-nowrap">{teamLabel(e)}</td>
                  <td className="px-3 py-2 text-secondary">{describeEvent(e)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-secondary whitespace-nowrap">{scoreLabel(e)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No game events recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
