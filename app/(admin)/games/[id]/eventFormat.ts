// Shared read/format helpers for the `game_events` table, used by both the Game
// Events and Raw Events views.
//
// Worth knowing before reading either view: of the table's 36 columns, only ten
// ever carry a value. The flat play-by-play set (period, clock, team, play_text,
// type_text, home_score, yards, start_down, …) is unwritten on every row in the
// table — nothing that currently runs populates it — so the substance of an
// event lives in the `event_data` JSON blob instead.

export interface RawEvent {
  id: string;
  event_type: string;
  event_id: string | null;
  bet_id: string | null;
  winning_option: string | null;
  created_at: string;
  player: string | null;
  event_data: Record<string, unknown> | null;
}

/**
 * The whole row, every column, exactly as stored — both event views select * so
 * they mirror the table rather than a chosen subset.
 */
export type RawEventRow = RawEvent & Record<string, unknown>;

/**
 * Every column on `game_events`, in reading order rather than physical order,
 * grouped the way the schema is actually reasoned about. All 36 columns of the
 * live table are listed; a column added to the database later has to be added
 * here too, or it simply won't appear in the view.
 *
 * Not columns, despite appearing in some schema notes: `event_key` (not on the
 * table) and `fired_at` (never existed — the emit time is at event_data.firedAt).
 */
export interface EventColumn {
  key: string;
  group: string;
  derived?: (row: RawEventRow) => unknown;
}

export const GAME_EVENT_COLUMNS: EventColumn[] = [
  // Every physical game_events column, in physical-table reading order.
  { key: 'id',                     group: 'Stored game_events columns' },
  { key: 'event_id',               group: 'Stored game_events columns' },
  { key: 'dedupe_key',             group: 'Stored game_events columns' },
  { key: 'game_code',              group: 'Stored game_events columns' },
  { key: 'game_id',                group: 'Stored game_events columns' },
  { key: 'event_type',             group: 'Stored game_events columns' },
  { key: 'bet_id',                 group: 'Stored game_events columns' },
  { key: 'winning_option',         group: 'Stored game_events columns' },
  { key: 'created_at',             group: 'Stored game_events columns' },
  { key: 'event_data',             group: 'Stored game_events columns' },
  { key: 'type_slug',              group: 'Stored game_events columns' },
  { key: 'type_abbreviation',      group: 'Stored game_events columns' },
  { key: 'type_text',              group: 'Stored game_events columns' },
  { key: 'play_text',              group: 'Stored game_events columns' },
  { key: 'short_text',             group: 'Stored game_events columns' },
  { key: 'period',                 group: 'Stored game_events columns' },
  { key: 'clock',                  group: 'Stored game_events columns' },
  { key: 'wallclock',              group: 'Stored game_events columns' },
  { key: 'team',                   group: 'Stored game_events columns' },
  { key: 'player',                 group: 'Stored game_events columns' },
  { key: 'secondary_player',       group: 'Stored game_events columns' },
  { key: 'subtype',                group: 'Stored game_events columns' },
  { key: 'yards',                  group: 'Stored game_events columns' },
  { key: 'scoring_play',           group: 'Stored game_events columns' },
  { key: 'start_yard_line',        group: 'Stored game_events columns' },
  { key: 'start_down',             group: 'Stored game_events columns' },
  { key: 'start_distance',         group: 'Stored game_events columns' },
  { key: 'yards_to_endzone',       group: 'Stored game_events columns' },
  { key: 'end_yard_line',          group: 'Stored game_events columns' },
  { key: 'end_down',               group: 'Stored game_events columns' },
  { key: 'end_distance',           group: 'Stored game_events columns' },
  { key: 'end_yards_to_endzone',   group: 'Stored game_events columns' },
  { key: 'end_down_distance_text', group: 'Stored game_events columns' },
  { key: 'end_possession_text',    group: 'Stored game_events columns' },
  { key: 'home_score',             group: 'Stored game_events columns' },
  { key: 'away_score',             group: 'Stored game_events columns' },
  { key: 'home_win_probability',   group: 'Stored game_events columns' },

  // These do not exist in the table. They are short, labelled reads of the
  // stored JSON payload, provided only to make the feed easy to inspect.
  { key: 'payload_period', group: 'Derived from event_data', derived: row => payloadValue(row, 'period') },
  { key: 'payload_clock',  group: 'Derived from event_data', derived: row => payloadValue(row, 'clock') },
  { key: 'payload_team',   group: 'Derived from event_data', derived: row => payloadValue(row, 'team') },
  { key: 'payload_player', group: 'Derived from event_data', derived: row => payloadValue(row, 'player', 'playerId', 'player_id') },
  { key: 'payload_yards',  group: 'Derived from event_data', derived: row => payloadValue(row, 'yards') },
  { key: 'payload_score',  group: 'Derived from event_data', derived: row => payloadScore(row) },

];

function payloadValue(row: RawEventRow, ...keys: string[]): unknown {
  const payload = row.event_data;
  if (!payload || typeof payload !== 'object') return null;
  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

function payloadScore(row: RawEventRow): string | null {
  const home = payloadValue(row, 'homeScore', 'home_score');
  const away = payloadValue(row, 'awayScore', 'away_score');
  return home == null && away == null ? null : `${away ?? '—'} – ${home ?? '—'}`;
}

export function columnValue(column: EventColumn, row: RawEventRow): unknown {
  return column.derived ? column.derived(row) : row[column.key];
}

/** Consecutive runs of the same group, for the spanning header row. */
export function columnGroups(columns: EventColumn[]): { group: string; span: number }[] {
  const runs: { group: string; span: number }[] = [];
  for (const col of columns) {
    const last = runs[runs.length - 1];
    if (last && last.group === col.group) last.span += 1;
    else runs.push({ group: col.group, span: 1 });
  }
  return runs;
}

/** Renders a raw column value as display text; null and '' both read as absent. */
export function cellText(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (key === 'event_data') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (key === 'created_at' || key === 'wallclock') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : fmtClockTime(String(value));
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Event types written by the app itself rather than by the game feed: bet
// lifecycle, fantasy scoring, audit-sheet column bookkeeping, and the claim
// plumbing that dedupes feed events. The Game Events view filters these out so
// only what happened on the field/ice remains; Raw Events shows everything.
export const APP_EVENT_TYPES = new Set([
  'bet_placed',
  'bet_dismissed',
  'bet_ignored',
  'bet_settled',
  'bet_expired',
  'fantasy_credit',
  'audit_col_map',
  'event_claim',
]);

export function isGameplayEvent(e: RawEvent): boolean {
  return !APP_EVENT_TYPES.has(e.event_type);
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function eventLabel(eventType: string): string {
  return humanizeKey(eventType);
}

export function fmtClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

/**
 * Period + clock as one label, read from event_data since the flat columns of
 * the same name are empty. `clock` arrives in two shapes depending on the event
 * source: already prefixed ("Q1 15:00") from script-driven sim events, or bare
 * ("4:27") from the live feed — so only prefix when it isn't already.
 */
export function periodClock(e: RawEvent): string {
  const d = e.event_data ?? {};
  const clock = typeof d.clock === 'string' ? d.clock : null;
  const period = typeof d.period === 'number' ? d.period : null;
  if (!clock && period == null) return '—';
  if (!clock) return periodLabel(d, period!);
  if (clock.includes(' ')) return clock;
  if (period == null) return clock;
  return `${periodLabel(d, period)} ${clock}`;
}

function periodLabel(d: Record<string, unknown>, period: number): string {
  // NHL runs periods, NFL runs quarters; anything past regulation is overtime.
  const isNhl = d.sport === 'NHL';
  if (isNhl) return period > 3 ? 'OT' : `P${period}`;
  return period > 4 ? 'OT' : `Q${period}`;
}
