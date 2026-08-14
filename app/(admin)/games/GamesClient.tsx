'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GameSession } from '@/types';
import clsx from 'clsx';

const STATUS_FILTERS = ['all', 'live', 'lobby', 'ended'] as const;

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'text-xs font-semibold px-2 py-0.5 rounded-full border',
      status === 'live'  ? 'bg-success/10 text-success border-success/30' :
      status === 'lobby' ? 'bg-amber-dim text-amber border-amber-border' :
                           'bg-gray-100 text-muted border-border'
    )}>
      {status === 'live' ? '● LIVE' : status.toUpperCase()}
    </span>
  );
}

function DeleteButton({ gameId, onDeleted }: { gameId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
    onDeleted();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-danger font-semibold hover:underline disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted hover:text-gray-900"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-muted hover:text-danger transition-colors"
    >
      Delete
    </button>
  );
}

export default function GamesClient({ initialGames }: { initialGames: (GameSession & { isSim?: boolean; auditSheetUrl?: string | null; recording?: boolean })[] }) {
  const router = useRouter();
  const [games, setGames] = useState(initialGames);
  const [filter, setFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');

  const filtered = games.filter(g => {
    if (filter !== 'all' && g.status !== filter) return false;
    if (sportFilter !== 'all' && g.sport !== sportFilter) return false;
    return true;
  });

  // Live games first, then lobby (scheduled), then ended. Within a group,
  // direction depends on whether the games are ahead of or behind us:
  // ended games run newest-first, so the game that just finished is at the top
  // instead of buried under months of history, while lobby games stay
  // soonest-first so the next kickoff leads rather than the furthest-away one.
  // Ties (two lobby games at the same scheduled_at, or rows with no
  // scheduled_at at all) fall back to created_at so ordering stays stable.
  const STATUS_ORDER: Record<string, number> = { live: 0, lobby: 1, ended: 2 };
  const ENDED_ORDER = 2;
  const sorted = [...filtered].sort((a, b) => {
    const aOrder = STATUS_ORDER[a.status] ?? 3;
    const bOrder = STATUS_ORDER[b.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aTime = a.scheduledAt ?? a.createdAt;
    const bTime = b.scheduledAt ?? b.createdAt;
    const aMs = aTime ? new Date(aTime as string).getTime() : 0;
    const bMs = bTime ? new Date(bTime as string).getTime() : 0;
    return aOrder === ENDED_ORDER ? bMs - aMs : aMs - bMs;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                filter === f
                  ? 'bg-amber-dim text-amber border-amber-border'
                  : 'bg-white text-secondary border-border hover:border-amber'
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1.5">
          {['all', 'NFL', 'NHL'].map(s => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                sportFilter === s
                  ? 'bg-amber-dim text-amber border-amber-border'
                  : 'bg-white text-secondary border-border hover:border-amber'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-muted text-xs ml-auto">{filtered.length} games</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 text-muted">No games found</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Game</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Sport</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Score</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Total Players</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((game, i) => {
                // Prefer the actual scheduled kickoff/puck-drop time; fall
                // back to row-created time only if scheduled_at is unset
                // (e.g. older rows created before scheduling was wired up).
                const gameTime = game.scheduledAt ?? game.createdAt;
                const playedAt = gameTime
                  ? new Date(gameTime as string).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })
                  : null;
                return (
                  <tr
                    key={game.id}
                    onClick={() => router.push(`/games/${game.id}`)}
                    className={clsx(
                      'border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-amber-dim/50',
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {game.hasCode === false ? (
                          <span className="text-xs text-muted italic">Code not assigned yet</span>
                        ) : (
                          <span className="font-mono font-semibold text-gray-900">{game.gameCode}</span>
                        )}
                        {game.isSim && (
                          <span className="text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded">SIM</span>
                        )}
                        {game.recording === false && game.status !== 'ended' && (
                          // poller_enabled is off: this game will play and record
                          // nothing. Only worth warning about while it still can.
                          <span
                            title="Recording is off (poller_enabled). This game will not write any events."
                            className="text-xs bg-danger/5 text-danger border border-danger/30 px-1.5 py-0.5 rounded"
                          >
                            NOT RECORDING
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary mt-0.5">
                        {game.awayTeam && game.homeTeam ? `${game.awayTeam} vs ${game.homeTeam}` : '—'}
                        {playedAt && <span className="text-muted ml-2">· {playedAt}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-secondary">{game.sport}</td>
                    <td className="px-3 py-2 font-mono text-gray-900">
                      {game.status !== 'lobby' ? `${game.awayScore} – ${game.homeScore}` : '—'}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={game.status} /></td>
                    <td className="px-3 py-2 text-secondary">
                      {game.playerCount ?? 0}
                    </td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-3 justify-end">
                        {game.auditSheetUrl && game.auditSheetUrl !== 'creating' && (
                          <a
                            href={game.auditSheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-amber font-medium hover:underline"
                          >
                            Audit Sheet ↗
                          </a>
                        )}
                        <DeleteButton
                          gameId={game.id}
                          onDeleted={() => setGames(prev => prev.filter(g => g.id !== game.id))}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
