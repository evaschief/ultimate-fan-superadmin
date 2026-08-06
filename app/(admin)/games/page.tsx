import { supabase } from '@/lib/supabase';
import { GameSession } from '@/types';
import GamesClient from './GamesClient';

async function getAllGames(): Promise<GameSession[]> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, flags, audit_sheet_url')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    // Total players per game — replaces the old Period column in the list
    // view (per-game live period/clock is still available on the game
    // detail page; this list is about roster size, not in-progress state).
    const gameIds = data.map(g => g.id);
    const playerCounts: Record<string, number> = {};
    if (gameIds.length > 0) {
      const { data: playerRows } = await supabase
        .from('players')
        .select('game_code')
        .in('game_code', gameIds);
      for (const p of playerRows ?? []) {
        playerCounts[p.game_code] = (playerCounts[p.game_code] ?? 0) + 1;
      }
    }

    return data.map(row => ({
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
      isSim: !!(row.flags?.is_sim),
      auditSheetUrl: row.audit_sheet_url ?? null,
      playerCount: playerCounts[row.id] ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function GamesPage() {
  const games = await getAllGames();

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">All Games</h1>
        <p className="text-secondary text-sm mt-1">
          All game sessions — live, lobby, and ended
        </p>
      </div>
      <GamesClient initialGames={games} />
    </div>
  );
}
