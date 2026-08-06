'use client';

import { useEffect, useState } from 'react';
import { GameSession, LiveGameState } from '@/types';
import GameCard from '@/components/GameCard';

interface Props {
  initialGames: GameSession[];
}

function buildLiveState(game: GameSession): LiveGameState {
  return {
    homeScore: game.homeScore ?? 0,
    awayScore: game.awayScore ?? 0,
    period: game.period ?? '',
    clock: game.clock ?? '',
    status: game.status,
  };
}

export default function DashboardClient({ initialGames }: Props) {
  const [games, setGames] = useState<GameSession[]>(initialGames);

  // Poll /api/games every 10 seconds for updated game list
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/games');
        if (res.ok) {
          const data = await res.json();
          if (data.games) setGames(data.games);
        }
      } catch {
        // Silently ignore network errors during polling
      }
    };

    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-secondary font-medium">No active games</p>
        <p className="text-muted text-sm mt-1">Create a game session to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {games.map(game => (
        <GameCard
          key={game.id}
          game={game}
          liveState={buildLiveState(game)}
        />
      ))}
    </div>
  );
}
