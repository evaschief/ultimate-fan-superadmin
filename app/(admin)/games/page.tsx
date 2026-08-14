import { supabase } from '@/lib/supabase';
import { GameSession } from '@/types';
import GamesClient from './GamesClient';

async function getAllGames(): Promise<GameSession[]> {
  try {
    // Excludes the reference pool: rows with neither a location_id nor a
    // join_code. schedule-games prepopulates one of those per real fixture up
    // to 14 days out, and claiming one (venue Schedule tab, or the auto-claim
    // toggle) creates an independent COPY with its own id, join_code and
    // location_id — the reference row is left in place ON PURPOSE so other
    // venues can claim their own copy of the same matchup. So every claimed
    // game has a same-matchup reference row beside it, which is what looked
    // like duplication here. It isn't; it's a template that was never meant to
    // appear as a manageable game. The venue admin panel's list_games applies
    // exactly this rule (see admin-api's comment on that case) — this list now
    // matches it.
    //
    // Tested with OR rather than location_id alone so sim runs and older games
    // that predate venue scoping (a join_code but no location_id — N686, N730,
    // N512, N383, ARCA) stay visible.
    const { data, error } = await supabase
      .from('games')
      .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, scheduled_at, location_id, flags, audit_sheet_url')
      .or('location_id.not.is.null,join_code.not.is.null')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !data) return [];

    // Total players per game — replaces the old Period column in the list
    // view (per-game live period/clock is still available on the game
    // detail page; this list is about roster size, not in-progress state).
    //
    // The same queries decide which ENDED games appear: a finished game is
    // only listed if something was actually stored against it — players who
    // joined, bets that were generated, or settled game_history rows — so
    // games that were claimed but never actually played don't clutter the
    // history. `players` rows survive game end (process-event's game_end
    // upserts game_history without deleting them), so real ended games still
    // qualify. Bets are checked too, since a game can generate bets
    // before/without anyone joining.
    //
    // Live and lobby games are NEVER filtered this way. An upcoming game has
    // no players, bets or history yet by definition, so requiring stored data
    // hid every scheduled game — including tonight's — which is exactly what
    // this list needs to show.
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

    return data.filter(row => row.status !== 'ended' || gamesWithData.has(row.id)).map(row => ({
      id: row.id,
      // A venue game scheduled for a future date legitimately has no join_code
      // yet: assignCodesForToday() hands out codes day-of, so the code appears
      // on the morning of the game. Fall back to the row id purely as an
      // internal identifier — GamesClient's hasCode check renders "Code not
      // assigned yet" rather than showing a raw uuid.
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
          Live, upcoming and played games. Unclaimed schedule templates are excluded.
        </p>
      </div>
      <GamesClient initialGames={games} />
    </div>
  );
}
