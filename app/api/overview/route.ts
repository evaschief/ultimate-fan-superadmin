import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sport = req.nextUrl.searchParams.get('sport') === 'NHL' ? 'NHL' : 'NFL';
  const simParam = req.nextUrl.searchParams.get('sim');

  // Auto-fallback: if sim param not set, check if any real games exist
  let simOnly = simParam === '1';
  if (simParam === null) {
    const { count } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('sport', sport)
      .eq('status', 'ended')
      .eq('flags->>is_sim', 'false');
    if ((count ?? 0) === 0) simOnly = true;
  }

  let gamesQuery = supabase
    .from('games')
    .select('id, join_code, sport, home_team, away_team, flags, created_at, status')
    .eq('sport', sport);

  if (simOnly) {
    // Sim games are often abandoned without a formal game_end — include live too
    gamesQuery = gamesQuery
      .eq('flags->>is_sim', 'true')
      .in('status', ['live', 'ended']);
  } else {
    gamesQuery = gamesQuery.eq('status', 'ended');
  }

  const { data: games, error } = await gamesQuery
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !games || games.length === 0) return NextResponse.json([]);

  const gameIds = games.map(g => g.id);
  const betsTable = sport === 'NFL' ? 'nfl_bets' : 'nhl_bets';
  const playerBetsTable = sport === 'NFL' ? 'nfl_player_bets' : 'nhl_player_bets';
  const periodKey = sport === 'NFL' ? 'trigger_quarter' : 'trigger_period';
  const periodSecs = sport === 'NFL' ? 900 : 1200;

  const [{ data: bets }, { data: playerBets }, { data: events }] = await Promise.all([
    supabase.from(betsTable).select(`game_code, created_at, ${periodKey}, trigger_clock`).in('game_code', gameIds),
    supabase.from(playerBetsTable).select('game_code, status').in('game_code', gameIds).in('status', ['won', 'lost']),
    supabase.from('game_events').select('game_code, event_data').in('game_code', gameIds).eq('event_type', 'fantasy_credit'),
  ]);

  const betsByGame: Record<string, typeof bets> = {};
  const pbByGame: Record<string, typeof playerBets> = {};
  const evByGame: Record<string, typeof events> = {};

  for (const b of bets ?? []) { (betsByGame[b.game_code] ??= []).push(b); }
  for (const pb of playerBets ?? []) { (pbByGame[pb.game_code] ??= []).push(pb); }
  for (const ev of events ?? []) { (evByGame[ev.game_code] ??= []).push(ev); }

  function clockToElapsed(quarter: number, clock: string): number {
    const [m, s] = clock.split(':').map(Number);
    const remaining = (m || 0) * 60 + (s || 0);
    return (quarter - 1) * periodSecs + (periodSecs - remaining);
  }

  const result = games.map(g => {
    const gb = betsByGame[g.id] ?? [];
    const gpb = pbByGame[g.id] ?? [];
    const gev = evByGame[g.id] ?? [];

    let avgRealTimeMins = 0;
    if (gb.length >= 2) {
      const sorted = [...gb].sort((a, b) => a.created_at.localeCompare(b.created_at));
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        total += (new Date(sorted[i].created_at).getTime() - new Date(sorted[i-1].created_at).getTime()) / 1000;
      }
      avgRealTimeMins = total / (sorted.length - 1) / 60;
    }

    let avgGameTimeMins = 0;
    const withClock = gb.filter(b => b.trigger_clock?.includes(':') && b[periodKey as keyof typeof b]);
    if (withClock.length >= 2) {
      const sorted = [...withClock].sort((a, b) => {
        const qa = a[periodKey as keyof typeof a] as number;
        const qb = b[periodKey as keyof typeof b] as number;
        if (qa !== qb) return qa - qb;
        return clockToElapsed(qa, a.trigger_clock) - clockToElapsed(qb, b.trigger_clock);
      });
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        const e1 = clockToElapsed(sorted[i-1][periodKey as keyof typeof sorted[0]] as number, sorted[i-1].trigger_clock);
        const e2 = clockToElapsed(sorted[i][periodKey as keyof typeof sorted[0]] as number, sorted[i].trigger_clock);
        total += Math.abs(e2 - e1);
      }
      avgGameTimeMins = total / (sorted.length - 1) / 60;
    }

    const won = gpb.filter(pb => pb.status === 'won').length;
    const winRatio = gpb.length > 0 ? won / gpb.length : 0;

    let avgFantasyPts = 0;
    if (gev.length > 0) {
      const byPlayer: Record<string, number> = {};
      for (const ev of gev) {
        const uid = String(ev.event_data?.uid ?? ev.event_data?.player_id ?? '');
        const pts = Number(ev.event_data?.pts ?? 0);
        if (uid) byPlayer[uid] = (byPlayer[uid] ?? 0) + pts;
      }
      const vals = Object.values(byPlayer);
      if (vals.length > 0) avgFantasyPts = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    return {
      gameId: g.id,
      joinCode: g.join_code ?? g.id,
      homeTeam: g.home_team ?? '',
      awayTeam: g.away_team ?? '',
      sport: g.sport,
      isSim: !!(g.flags?.is_sim),
      createdAt: g.created_at ?? null,
      betCount: gb.length,
      avgRealTimeMins,
      avgGameTimeMins,
      winRatio,
      avgFantasyPts,
    };
  });

  return NextResponse.json(result);
}
