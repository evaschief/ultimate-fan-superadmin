// Shared read/format helpers for the `game_events` table, used by both the
// Game Events and Raw Events views.
//
// IMPORTANT: everything meaningful lives in the `event_data` JSON blob. The
// table also has a wide set of flat ESPN-shaped columns (period, clock, team,
// play_text, type_text, home_score, yards, start_down, …) but they are
// unpopulated on every row currently in the table — the only flat column ever
// set is `player`, and only on some rows. So all display values are read out
// of event_data, with the flat column used purely as a fallback.

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

export const RAW_EVENT_COLUMNS =
  'id, event_type, event_id, bet_id, winning_option, created_at, player, event_data';

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

// event_data keys that are rendered in their own column (or are pure plumbing),
// so they shouldn't be repeated in the generic per-event detail list.
const META_KEYS = new Set([
  'type', 'sport', 'period', 'clock', 'firedAt', 'description',
  'homeScore', 'awayScore', 'homeTeam', 'awayTeam',
  'player', 'playerId', 'team', 'subtype', 'secondary_player',
  'scriptId', 'simulationMode', 'receivingTeam',
]);

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
 * Period + clock as one label. `clock` arrives in two shapes depending on the
 * event source: already prefixed ("Q1 15:00") from script-driven sim events,
 * or bare ("4:27") from the live feed — so only prefix when it isn't already.
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

/** 'home'/'away' resolve against the event's own team names; abbreviations pass through. */
export function teamLabel(e: RawEvent): string {
  const d = e.event_data ?? {};
  const team = d.team;
  if (typeof team !== 'string' || !team) return '—';
  if (team === 'home') return String(d.homeTeam ?? 'Home');
  if (team === 'away') return String(d.awayTeam ?? 'Away');
  return team;
}

export function scoreLabel(e: RawEvent): string {
  const d = e.event_data ?? {};
  const away = d.awayScore;
  const home = d.homeScore;
  if (typeof away !== 'number' || typeof home !== 'number') return '—';
  return `${away} – ${home}`;
}

export function playerLabel(e: RawEvent): string | null {
  const d = e.event_data ?? {};
  const name = d.player ?? d.playerName ?? e.player;
  return typeof name === 'string' && name ? name : null;
}

/** Leftover event_data fields — the per-type payload (yards, distance, points, …). */
export function eventExtras(e: RawEvent): [string, string][] {
  const d = e.event_data ?? {};
  return Object.entries(d)
    .filter(([k, v]) => !META_KEYS.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => [
      humanizeKey(k),
      typeof v === 'object' ? JSON.stringify(v) : String(v),
    ]);
}

/**
 * One-line human description. Script-driven events carry a ready-made
 * `description` ("🎯 FIELD GOAL — DEN · Lutz 28yd"); live-feed events don't, so
 * one is composed from the player, subtype and remaining payload fields.
 */
export function describeEvent(e: RawEvent): string {
  const d = e.event_data ?? {};
  if (typeof d.description === 'string' && d.description.trim()) return d.description;

  const parts: string[] = [];
  const player = playerLabel(e);
  if (player) parts.push(player);
  if (typeof d.subtype === 'string' && d.subtype) parts.push(humanizeKey(d.subtype));
  if (typeof d.secondary_player === 'string' && d.secondary_player) {
    parts.push(`with ${d.secondary_player}`);
  }
  const extras = eventExtras(e).map(([label, value]) => `${label}: ${value}`);
  if (extras.length) parts.push(extras.join(' · '));

  return parts.length ? parts.join(' · ') : '—';
}
