'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { GAME_EVENT_COLUMNS, RawEventRow, cellText, columnGroups, columnValue } from './eventFormat';

// One table for both event views. They differ only in which rows they are given
// — Game Events gets the gameplay subset, Raw Events gets every row — so the
// columns, filtering and formatting live here once.

const MAX_CELL = 90;

export default function EventTable({
  events,
  withSearch = false,
}: {
  events: RawEventRow[];
  withSearch?: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // `game_stat` outnumbers everything else roughly 3:1, so the type filter is
  // what makes either view readable — chips are ordered by frequency. Labels are
  // the raw event_type strings, matching the values in the event_type column.
  const types = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  // A column counts as empty when no row in this game has a value for it. Most
  // of the play-by-play columns are unwritten, so on a typical game this is the
  // difference between a readable table and a wall of dashes.
  const emptyKeys = useMemo(() => {
    const empty = new Set(GAME_EVENT_COLUMNS.map(c => c.key));
    for (const row of events) {
      for (const key of Array.from(empty)) {
        const column = GAME_EVENT_COLUMNS.find(candidate => candidate.key === key);
        if (column && cellText(key, columnValue(column, row)) !== null) empty.delete(key);
      }
      if (empty.size === 0) break;
    }
    return empty;
  }, [events]);

  // Searching the whole row, not just the payload: with every column displayed,
  // anything on screen should be findable.
  const haystacks = useMemo(() => {
    if (!withSearch) return null;
    return new Map(events.map(e => [
      e.id,
      GAME_EVENT_COLUMNS.map(c => cellText(c.key, columnValue(c, e)) ?? '').join(' ').toLowerCase(),
    ]));
  }, [events, withSearch]);

  const columns = hideEmpty
    ? GAME_EVENT_COLUMNS.filter(c => !emptyKeys.has(c.key))
    : GAME_EVENT_COLUMNS;
  const groups = columnGroups(columns);

  const query = search.trim().toLowerCase();
  const filtered = events.filter(e => {
    if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
    if (query && !(haystacks?.get(e.id) ?? '').includes(query)) return false;
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
              'px-2.5 py-1 rounded-lg text-xs font-medium font-mono border transition-colors',
              typeFilter === type
                ? 'bg-amber-dim text-amber border-amber-border'
                : 'bg-white text-secondary border-border hover:border-amber'
            )}
          >
            {type} <span className="font-normal opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {withSearch && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any column…"
            className="input max-w-xs"
          />
        )}
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
          {filtered.length === events.length
            ? `${filtered.length} rows`
            : `${filtered.length} of ${events.length} rows`} · {columns.length} columns
        </span>
      </div>

      <p className="text-muted text-xs mb-2">
        Click a row number, or a truncated value, to open the full record below it.
      </p>

      {/* 36 columns will never fit a pane, so the table scrolls sideways and the
          row number stays pinned to keep your place. */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 w-16" />
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
              <th className="sticky left-0 z-10 bg-gray-50 text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider w-16">#</th>
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
            {filtered.map((row, i) => {
              const isOpen = expanded.has(row.id);
              const zebra = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
              const stickyZebra = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';

              return [
                <tr key={row.id} className={clsx('border-b border-border align-top', zebra)}>
                  <td className={clsx(
                    'sticky left-0 z-10 px-2 py-2 text-right',
                    isOpen ? 'bg-amber-dim' : stickyZebra
                  )}>
                    <button
                      onClick={() => toggleRow(row.id)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} full record for row ${i + 1}`}
                      className="flex items-center gap-1 ml-auto font-mono text-xs text-muted hover:text-amber transition-colors tabular-nums"
                    >
                      <svg
                        viewBox="0 0 12 12"
                        className={clsx('w-2.5 h-2.5 transition-transform', isOpen && 'rotate-90')}
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M4 2l5 4-5 4z" />
                      </svg>
                      {i + 1}
                    </button>
                  </td>
                  {columns.map(col => {
                    const text = cellText(col.key, columnValue(col, row));
                    const clipped = text !== null && text.length > MAX_CELL;
                    return (
                      <td
                        key={col.key}
                        className={clsx(
                          'px-3 py-2 font-mono text-xs whitespace-nowrap',
                          clipped ? 'text-gray-900 cursor-pointer hover:text-amber' : 'text-gray-900'
                        )}
                        title={clipped ? 'Click to open the full record' : undefined}
                        onClick={clipped ? () => toggleRow(row.id) : undefined}
                      >
                        {text === null
                          ? <span className="text-muted">—</span>
                          : clipped ? `${text.slice(0, MAX_CELL)}…` : text}
                      </td>
                    );
                  })}
                </tr>,

                // The full record, opened in place. The panel is sticky to the
                // left edge of the scroll container so it stays readable however
                // far right the table has been scrolled — otherwise a detail
                // panel inside a 6,000px-wide cell sits off-screen.
                isOpen && (
                  <tr key={`${row.id}-detail`} className={clsx('border-b border-border', zebra)}>
                    <td colSpan={columns.length + 1} className="p-0">
                      <div className="sticky left-0 w-[min(58rem,92vw)] px-4 py-3">
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                          event_data · row {i + 1} · {row.event_type}
                        </p>
                        <pre className="bg-white border border-border rounded-md p-3 text-xs font-mono text-gray-900 whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
{row.event_data ? JSON.stringify(row.event_data, null, 2) : 'null'}
                        </pre>

                        {/* Any other column whose value was too long for its cell. */}
                        {columns
                          .filter(c => c.key !== 'event_data')
                          .map(c => ({ key: c.key, text: cellText(c.key, columnValue(c, row)) }))
                          .filter(v => v.text !== null && v.text.length > MAX_CELL)
                          .map(v => (
                            <div key={v.key} className="mt-2">
                              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">{v.key}</p>
                              <p className="bg-white border border-border rounded-md p-2 text-xs font-mono text-gray-900 break-words">{v.text}</p>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted">
                  {events.length === 0 ? 'No events recorded for this game' : 'No rows match this filter'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
