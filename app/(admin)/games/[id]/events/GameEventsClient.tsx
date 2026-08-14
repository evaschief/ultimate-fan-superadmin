'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  GAME_EVENT_COLUMNS, RawEventRow, cellText, columnGroups, eventLabel,
} from '../eventFormat';

const MAX_CELL = 90;

export default function GameEventsClient({ events }: { events: RawEventRow[] }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [hideEmpty, setHideEmpty] = useState(false);

  // `game_stat` rows outnumber everything else roughly 3:1, so the type filter
  // is what makes this view readable — chips are ordered by frequency.
  const types = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  // A column counts as empty when no row in this game has a value for it. 26 of
  // the 36 are empty on every row in the table today, so the toggle is the
  // difference between a readable table and a wall of dashes.
  const emptyKeys = useMemo(() => {
    const empty = new Set(GAME_EVENT_COLUMNS.map(c => c.key));
    for (const row of events) {
      for (const key of Array.from(empty)) {
        if (cellText(key, row[key]) !== null) empty.delete(key);
      }
      if (empty.size === 0) break;
    }
    return empty;
  }, [events]);

  const columns = hideEmpty
    ? GAME_EVENT_COLUMNS.filter(c => !emptyKeys.has(c.key))
    : GAME_EVENT_COLUMNS;

  const groups = columnGroups(columns);

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
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={e => setHideEmpty(e.target.checked)}
            className="accent-amber"
          />
          Hide columns that are empty for this game
          <span className="text-muted">({emptyKeys.size} of {GAME_EVENT_COLUMNS.length})</span>
        </label>
        <span className="text-muted text-xs ml-auto">
          {filtered.length} rows · {columns.length} columns
        </span>
      </div>

      {/* 36 columns will never fit a pane, so the table scrolls sideways and the
          row number stays pinned to keep your place. */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 w-14" />
              {groups.map((g, i) => (
                <th
                  key={g.group}
                  colSpan={g.span}
                  className={clsx(
                    'text-left px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap',
                    i > 0 && 'border-l border-border'
                  )}
                >
                  {g.group}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider w-14">#</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={clsx(
                    'text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap font-mono',
                    emptyKeys.has(col.key) ? 'text-muted/60' : 'text-muted'
                  )}
                >
                  {col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className={clsx(
                  'sticky left-0 z-10 px-3 py-2 text-right font-mono text-xs text-muted tabular-nums',
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                )}>
                  {i + 1}
                </td>
                {columns.map(col => {
                  const text = cellText(col.key, row[col.key]);
                  const clipped = text !== null && text.length > MAX_CELL;
                  return (
                    <td
                      key={col.key}
                      className="px-3 py-2 font-mono text-xs text-gray-900 whitespace-nowrap"
                      title={clipped ? text! : undefined}
                    >
                      {text === null
                        ? <span className="text-muted">—</span>
                        : clipped ? `${text.slice(0, MAX_CELL)}…` : text}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted">
                  No game events recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
