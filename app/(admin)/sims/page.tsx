import { supabase } from '@/lib/supabase';
import { GameSession } from '@/types';
import GamesClient from '../games/GamesClient';

async function getSimGames(): Promise<(GameSession & { isSim: boolean })[]> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, flags')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data
      .filter(row => !!(row.flags?.is_sim))
      .map(row => ({
        id: row.id,
        gameCode: row.join_code ?? row.id,
        sport: row.sport ?? 'NHL',
        status: row.status ?? 'lobby',
        homeTeam: row.home_team ?? '',
        awayTeam: row.away_team ?? '',
        homeScore: row.home_score ?? 0,
        awayScore: row.away_score ?? 0,
        period: row.period ?? '',
        clock: row.clock ?? '',
        createdAt: row.created_at ?? null,
        isSim: true,
      }));
  } catch {
    return [];
  }
}

export default async function SimsPage() {
  const games = await getSimGames();

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Simulations</h1>
        <p className="text-secondary text-sm mt-1">All simulated game sessions</p>
      </div>
      <GamesClient initialGames={games} initialSource="sim" />
    </div>
  );
}
