import { supabase } from '@/lib/supabase';
import { GameSession } from '@/types';
import GamesClient from './GamesClient';

async function getAllGames(): Promise<GameSession[]> {
  try {
    // Fetched wider than the ~100 rows this list actually shows: the bulk of
    // the `games` table is prepopulated future schedule rows (see
    // schedule-games' assignCodes:false path) which get filtered out below
    // for having no stored data, so a 100-row window would leave only a
    // handful of real games visible.
    const { data, error } = await supabase
      .from('games')
      .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, scheduled_at, flags, audit_sheet_url')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !data) return [];

    // Total players per game — replaces the old Period column in the list
    // view (per-game live period/clock is still available on the game
    // detail page; this list is about roster size, not in-progress state).
    //
    // The same queries decide which games appear at all: a game is only
    // listed if something was actually stored against it — players who
    // joined, bets that were generated, or settled game_history rows. That
    // drops scheduled-but-never-played games (and prepopulated schedule
    // rows) from the view. `players` rows survive game end — process-event's
    // game_end upserts game_history without deleting them — so ended games
    // still qualify. Bets are checked too, since a game can generate bets
    // before/without anyone joining.
    const gameIds = data.map(g => g.id);
    const playerCounts: Record<string, number> = {};
    const gamesWithData = new Set<string>();
    if (gameIds.length > 0) {
      const [
        { data: playerRows },
        { data: historyRows },
        { data: nflBetRows },
        { data: nhlBetRows },
      ] = await Promise.all([
        supabase.from('players').select('game_code').in('game_code', gameIds),
        supabase.from('game_history').select('game_code').in('game_code', gameIds),
        supabase.from('nfl_bets').select('game_code').in('game_code', gameIds),
        supabase.from('nhl_bets').select('game_code').in('game_code', gameIds),
      ]);

      for (const p of playerRows ?? []) {
        playerCounts[p.game_code] = (playerCounts[p.game_code] ?? 0) + 1;
        gamesWithData.add(p.game_code);
      }
      for (const rows of [historyRows, nflBetRows, nhlBetRows]) {
        for (const r of rows ?? []) gamesWithData.add(r.game_code);
      }
    }

    return data.filter(row => gamesWithData.has(row.id)).map(row => ({
      id: row.id,
      // Prepopulated future games (see schedule-games' assignCodes:false
      // path) have no join_code yet — fall back to the row id only as an
      // internal identifier, never shown as-is (see GamesClient's hasCode
      // check, which shows "Code not assigned yet" instead).
      gameCode: row.join_code ?? row.id,
      hasCode: row.join_code != null,
      sport: row.sport ?? 'NHL',
      status: row.status ?? 'lobby',
      homeTeam: row.home_team ?? '',
      awayTeam: row.away_team ?? '',
      homeScore: row.home_score ?? 0,
      awayScore: row.away_score ?? 0,
      period: row.period ?? '',
      clock: row.clock ?? '',
      createdAt: row.created_at ?? null,
      scheduledAt: row.scheduled_at ?? null,
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
          Games with recorded data — live, lobby, and ended
        </p>
      </div>
      <GamesClient initialGames={games} />
    </div>
  );
}
