import Link from 'next/link';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import GenerateRosterButton from './GenerateRosterButton';
import SetFinishedButton from './SetFinishedButton';
import RecordingToggle from './RecordingToggle';

// Shared header + tab bar for every game detail view. Deliberately a plain
// component rather than a `layout.tsx`, because a layout at this segment
// would also wrap the pre-existing /games/[id]/audit page, which renders its
// own full-width header and would end up double-headed.
//
// Each page fetches the game itself via getGame() and passes it down, so the
// header costs no extra query beyond the one the page already needs.

export interface GameRow {
  id: string;
  join_code: string | null;
  sport: string | null;
  status: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  period: string | null;
  clock: string | null;
  created_at: string | null;
  scheduled_at: string | null;
  audit_sheet_url: string | null;
  poller_enabled: boolean | null;
  auto_activate: boolean | null;
  flags: { is_sim?: boolean } | null;
}

/** Rows written to the derived app-event table for this game. */
export interface EventCounts {
  gameEvents: number;
}

export async function getEventCounts(gameId: string): Promise<EventCounts> {
  const { count: gameEvents } = await supabase
    .from('game_events')
    .select('id', { count: 'exact', head: true })
    .eq('game_code', gameId);
  return { gameEvents: gameEvents ?? 0 };
}

export async function getGame(id: string): Promise<GameRow | null> {
  // maybeSingle() rather than single(): a missing row is a 404 for the page to
  // handle, not a query error to log (same reasoning as the venue detail page).
  const { data } = await supabase
    .from('games')
    .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, scheduled_at, flags, audit_sheet_url, poller_enabled, auto_activate')
    .eq('id', id)
    .maybeSingle();
  return (data as GameRow) ?? null;
}

// Sport-split bet tables — every page that touches bets needs the same pick.
export function betTables(sport: string | null) {
  const isNfl = (sport ?? 'NFL') === 'NFL';
  return {
    bets: isNfl ? 'nfl_bets' : 'nhl_bets',
    playerBets: isNfl ? 'nfl_player_bets' : 'nhl_player_bets',
  };
}

const TABS = [
  // Provider capture, one tab per table. Present on every game: a game with
  // nothing captured shows an empty state that says why, which is itself the
  // useful answer.
  { key: 'raw-plays',     label: 'Raw Plays',   suffix: '/raw-plays'      },
  { key: 'raw-snapshots', label: 'Raw Snapshots', suffix: '/raw-snapshots' },
  { key: 'raw-state',     label: 'Raw State',   suffix: '/raw-state'      },
  { key: 'events',        label: 'Game Events', suffix: '/events'         },
  { key: 'players',       label: 'Users',       suffix: ''                },
  { key: 'bets',          label: 'Bets',        suffix: '/bets'           },
] as const;

export type GameTab = (typeof TABS)[number]['key'];

function Tabs({ gameId, active }: { gameId: string; active: GameTab }) {
  return (
    <div className="border-b border-border flex items-center gap-1 mb-5">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`/games/${gameId}${tab.suffix}`}
          className={clsx(
            'px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
            tab.key === active
              ? 'border-amber text-amber'
              : 'border-transparent text-secondary hover:text-gray-900'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default function GameHeader({ game, active, counts }: { game: GameRow; active: GameTab; counts?: EventCounts }) {
  const hasAudit = game.audit_sheet_url && game.audit_sheet_url !== 'creating';
  // Prefer the actual scheduled kickoff/puck-drop time over row-created time.
  const gameTime = game.scheduled_at ?? game.created_at;
  const playedAt = gameTime
    ? new Date(gameTime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const statusColor =
    game.status === 'live' ? 'text-success' :
    game.status === 'lobby' ? 'text-amber' : 'text-muted';

  return (
    <>
      <div className="mb-4">
        <Link href="/games" className="text-xs text-muted hover:text-gray-900 transition-colors">← Games</Link>
        <div className="flex items-start justify-between mt-1 gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {game.away_team} vs {game.home_team}
              <span className="font-mono text-muted font-normal ml-2 text-base">
                · {game.join_code ?? 'Code not assigned yet'}
              </span>
            </h1>
            <p className="text-secondary text-sm mt-0.5">
              {game.sport}
              <span className={`ml-2 font-medium ${statusColor}`}>
                {game.status === 'live' ? `● LIVE · ${game.period} ${game.clock}` : game.status.toUpperCase()}
              </span>
              {game.flags?.is_sim && (
                <span className="text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded ml-2">SIM</span>
              )}
              {playedAt && <span className="text-muted ml-2">· {playedAt}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {game.sport === 'NFL' && <GenerateRosterButton gameId={game.id} />}
            <SetFinishedButton gameId={game.id} currentStatus={game.status} />
            {hasAudit && (
              <a
                href={game.audit_sheet_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
              >
                Audit Sheet ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Recording state — poller_enabled is what decides whether this game
          writes any events at all, and it is invisible everywhere else. */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <RecordingToggle
          gameId={game.id}
          pollerEnabled={game.poller_enabled === true}
          autoActivate={game.auto_activate === true}
          status={game.status}
        />
        {counts && (
          <span className="text-xs text-secondary font-mono">
            {counts.gameEvents.toLocaleString()} game_events
          </span>
        )}
        {counts && counts.gameEvents === 0 && game.status === 'ended' && (
          <span className="text-xs text-danger">this game ended without recording a single event</span>
        )}
      </div>

      {/* Score */}
      {game.status !== 'lobby' && (
        <div className="card px-5 py-4 mb-4 flex items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">{game.away_team}</div>
            <div className="text-3xl font-bold text-gray-900">{game.away_score}</div>
          </div>
          <div className="text-muted text-lg font-light">–</div>
          <div className="text-center">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">{game.home_team}</div>
            <div className="text-3xl font-bold text-gray-900">{game.home_score}</div>
          </div>
          {game.status === 'live' && (
            <div className="ml-4 text-sm text-secondary">{game.period} · {game.clock}</div>
          )}
        </div>
      )}

      <Tabs gameId={game.id} active={active} />
    </>
  );
}
