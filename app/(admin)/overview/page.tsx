import { supabase } from '@/lib/supabase';
import OverviewClient from './OverviewClient';

export interface GameMetrics {
  gameId: string;
  joinCode: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  isSim: boolean;
  createdAt: string | null;
  scheduledAt: string | null;
  betCount: number;
  avgRealTimeMins: number;
  avgGameTimeMins: number;
  winRatio: number;
  avgFantasyPts: number;      // avg fantasy pts a player earns per quarter/period (not per whole game)
  // Audit-sourced metrics
  dismissRate: number;       // fraction of bet cards dismissed
  timeoutRate: number;       // fraction of bet cards timed out
  avgLatencySecs: number;    // avg seconds to place a bet (placed actions only)
  engagementRate: number;    // fraction of bet cards acted on (placed + dismissed + ignored) vs just ignored
}

async function fetchOverviewData(sport: string, simOnly: boolean): Promise<GameMetrics[]> {
  let query = supabase
    .from('games')
    .select('id, join_code, sport, home_team, away_team, flags, created_at, scheduled_at, status')
    .eq('sport', sport);

  if (simOnly) {
    // Sim games are often abandoned mid-run without a formal game_end — include
    // 'live' status too so past sessions show up in the overview.
    query = query.eq('flags->>is_sim', 'true').in('status', ['live', 'ended']);
  } else {
    query = query.eq('status', 'ended');
  }

  const { data: games, error } = await query
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !games || games.length === 0) return [];

  const gameIds = games.map(g => g.id);
  const betsTable = sport === 'NFL' ? 'nfl_bets' : 'nhl_bets';
  const playerBetsTable = sport === 'NFL' ? 'nfl_player_bets' : 'nhl_player_bets';
  const periodKey = sport === 'NFL' ? 'trigger_quarter' : 'trigger_period';

  const [{ data: bets }, { data: playerBets }, { data: fantasyEvents }, { data: auditEvents }] = await Promise.all([
    supabase.from(betsTable).select(`game_code, created_at, ${periodKey}, trigger_clock`).in('game_code', gameIds),
    supabase.from(playerBetsTable).select('game_code, status').in('game_code', gameIds).in('status', ['won', 'lost']),
    supabase.from('game_events').select('game_code, event_data').in('game_code', gameIds).eq('event_type', 'fantasy_credit'),
    supabase.from('game_events').select('game_code, event_type, event_data').in('game_code', gameIds).in('event_type', ['bet_placed', 'bet_dismissed', 'bet_ignored']),
  ]);

  const betsByGame: Record<string, typeof bets> = {};
  const pbByGame: Record<string, typeof playerBets> = {};
  const evByGame: Record<string, typeof fantasyEvents> = {};
  const auditByGame: Record<string, typeof auditEvents> = {};

  for (const b of bets ?? []) { (betsByGame[b.game_code] ??= []).push(b); }
  for (const pb of playerBets ?? []) { (pbByGame[pb.game_code] ??= []).push(pb); }
  for (const ev of fantasyEvents ?? []) { (evByGame[ev.game_code] ??= []).push(ev); }
  for (const ev of auditEvents ?? []) { (auditByGame[ev.game_code] ??= []).push(ev); }

  const periodSecs = sport === 'NFL' ? 900 : 1200;

  function clockToElapsed(quarter: number, clock: string): number {
    const [m, s] = clock.split(':').map(Number);
    const remaining = (m || 0) * 60 + (s || 0);
    return (quarter - 1) * periodSecs + (periodSecs - remaining);
  }

  return games.map(g => {
    const gb = betsByGame[g.id] ?? [];
    const gpb = pbByGame[g.id] ?? [];
    const gev = evByGame[g.id] ?? [];
    const gau = auditByGame[g.id] ?? [];

    // Real-time between bets
    let avgRealTimeMins = 0;
    if (gb.length >= 2) {
      const sorted = [...gb].sort((a, b) => a.created_at.localeCompare(b.created_at));
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        const diff = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime();
        total += diff / 1000;
      }
      avgRealTimeMins = total / (sorted.length - 1) / 60;
    }

    // Game-time between bets
    // Bet row shape differs by sport (trigger_quarter for NFL, trigger_period
    // for NHL), so TS can't statically index it with the dynamic periodKey —
    // read via an untyped view instead.
    const period = (row: Record<string, unknown>): number => row[periodKey] as number;
    let avgGameTimeMins = 0;
    const withClock = gb.filter(b => b.trigger_clock?.includes(':') && period(b));
    if (withClock.length >= 2) {
      const sorted = [...withClock].sort((a, b) => {
        const qa = period(a), qb = period(b);
        if (qa !== qb) return qa - qb;
        return clockToElapsed(qa, a.trigger_clock) - clockToElapsed(qb, b.trigger_clock);
      });
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        const e1 = clockToElapsed(period(sorted[i-1]), sorted[i-1].trigger_clock);
        const e2 = clockToElapsed(period(sorted[i]), sorted[i].trigger_clock);
        total += Math.abs(e2 - e1);
      }
      avgGameTimeMins = total / (sorted.length - 1) / 60;
    }

    // Win ratio
    const won = gpb.filter(pb => pb.status === 'won').length;
    const winRatio = gpb.length > 0 ? won / gpb.length : 0;

    // Fantasy pts per player, per quarter/period
    // FIX: fantasy_credit events actually carry { playerId, points, reason }
    // (see creditFantasyPoints in supabase/functions/process-event/index.ts)
    // — this was reading event_data.uid / .player_id / .pts, none of which
    // exist, so `uid` was always '' and every credit was silently skipped.
    // avgFantasyPts has been computing 0 (displayed as "—") for every game.
    //
    // CHANGE: this metric is meant to reflect a per-quarter/period rate, not
    // the whole-game total a player accumulates. Previously it summed all of
    // a player's fantasy_credit points across the entire game and averaged
    // that total across players, which conflated a 4-quarter total with a
    // per-quarter rate. Now it groups by (playerId, period) and averages
    // across those pairs instead, so a player's Q1 total and Q2 total count
    // as two separate data points rather than being combined into one.
    // creditFantasyPoints now tags event_data.period with ev.period at write
    // time; events fired before that change won't have a period value and
    // are excluded here (`period == null`), since they can't be attributed
    // to a specific quarter. That means historical sim-game data recorded
    // before this deploy will show fewer/no data points for this metric —
    // expected, not a bug — until new games generate fresh, period-tagged data.
    let avgFantasyPts = 0;
    if (gev.length > 0) {
      const byPlayerPeriod: Record<string, number> = {};
      for (const ev of gev) {
        const playerId = String(ev.event_data?.playerId ?? '');
        const period = ev.event_data?.period;
        const pts = Number(ev.event_data?.points ?? 0);
        if (!playerId || period == null) continue;
        const key = `${playerId}_${period}`;
        byPlayerPeriod[key] = (byPlayerPeriod[key] ?? 0) + pts;
      }
      const vals = Object.values(byPlayerPeriod);
      if (vals.length > 0) avgFantasyPts = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    // Audit-sourced metrics
    const placed   = gau.filter(e => e.event_type === 'bet_placed');
    const dismissed = gau.filter(e => e.event_type === 'bet_dismissed');
    const timedOut  = gau.filter(e => e.event_type === 'bet_ignored');
    const totalActions = placed.length + dismissed.length + timedOut.length;
    const dismissRate   = totalActions > 0 ? dismissed.length / totalActions : 0;
    const timeoutRate   = totalActions > 0 ? timedOut.length / totalActions  : 0;
    const engagementRate = totalActions > 0 ? (placed.length + dismissed.length) / totalActions : 0;
    const latencies = placed.map(e => Number(e.event_data?.latency_seconds ?? 0)).filter(v => v > 0);
    const avgLatencySecs = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    return {
      gameId: g.id,
      joinCode: g.join_code ?? g.id,
      homeTeam: g.home_team ?? '',
      awayTeam: g.away_team ?? '',
      sport: g.sport,
      isSim: !!(g.flags?.is_sim),
      createdAt: g.created_at ?? null,
      scheduledAt: g.scheduled_at ?? null,
      betCount: gb.length,
      avgRealTimeMins,
      avgGameTimeMins,
      winRatio,
      avgFantasyPts,
      dismissRate,
      timeoutRate,
      avgLatencySecs,
      engagementRate,
    };
  });
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: { sport?: string; sim?: string };
}) {
  const sport = searchParams.sport === 'NHL' ? 'NHL' : 'NFL';

  // If sim param not explicitly set, auto-fall-back to sim data when no real games exist
  let simOnly = searchParams.sim === '1';
  if (searchParams.sim === undefined) {
    const { count } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('sport', sport)
      .eq('status', 'ended')
      .eq('flags->>is_sim', 'false');
    if ((count ?? 0) === 0) simOnly = true;
  }

  const data = await fetchOverviewData(sport, simOnly);

  return <OverviewClient initialData={data} initialSport={sport} initialSim={simOnly} />;
}
