import Link from 'next/link';
import { GameSession, LiveGameState } from '@/types';
import clsx from 'clsx';

interface Props {
  game: GameSession;
  liveState?: LiveGameState;
}

function SportIcon({ sport }: { sport: string }) {
  if (sport === 'NFL') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="12" rx="10" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 17l6-6 4 4 5-5 3 3M3 7h18" />
    </svg>
  );
}

export default function GameCard({ game, liveState }: Props) {
  const homeScore = liveState?.homeScore ?? 0;
  const awayScore = liveState?.awayScore ?? 0;
  const period = liveState?.period ?? '—';
  const clock = liveState?.clock ?? '—';
  const playerCount = liveState?.playerCount ?? game.playerCount ?? 0;
  const openBets = liveState?.openBetCount ?? game.openBetCount ?? 0;

  return (
    <Link
      href={`/games/${game.id}`}
      className="card hover:border-amber-border hover:shadow-lg transition-all group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 text-amber">
          <SportIcon sport={game.sport} />
          <span className="text-xs font-semibold tracking-wider">{game.sport}</span>
        </div>
        <span className={clsx(
          game.status === 'live' ? 'badge-active' :
          game.status === 'lobby' ? 'badge-lobby' : 'badge-ended'
        )}>
          {game.status === 'live' ? '● LIVE' : game.status === 'lobby' ? 'LOBBY' : 'ENDED'}
        </span>
      </div>

      {/* Teams & Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-gray-900 font-bold text-lg leading-tight truncate">
              {game.awayTeam || 'Away'}
            </p>
            <p className="text-muted text-xs">Away</p>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="text-2xl font-black text-gray-900 tabular-nums">
              {awayScore} – {homeScore}
            </div>
            <div className="text-muted text-xs mt-0.5">
              {period !== '—' ? `${period} · ${clock}` : 'Pre-game'}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-gray-900 font-bold text-lg leading-tight truncate">
              {game.homeTeam || 'Home'}
            </p>
            <p className="text-muted text-xs">Home</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{playerCount} players</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>{openBets} bets open</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-secondary">
            {game.gameCode}
          </span>
        </div>
      </div>
    </Link>
  );
}
