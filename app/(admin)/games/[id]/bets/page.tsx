import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame, betTables } from '../GameHeader';

async function getBetStats(gameId: string, sport: string | null) {
  const { bets: betsTable, playerBets: playerBetsTable } = betTables(sport);

  const [{ data: bets }, { data: playerBets }] = await Promise.all([
    supabase.from(betsTable)
      // This is intentionally the complete stored row. The table below keeps
      // those direct columns ahead of participation fields derived from the
      // matching nfl_player_bets / nhl_player_bets rows.
      .select('*')
      .eq('game_code', gameId)
      .order('created_at', { ascending: false }),
    supabase.from(playerBetsTable)
      .select('uid, bet_id, pick, amount, status')
      .eq('game_code', gameId),
  ]);

  const pbByBet: Record<string, typeof playerBets> = {};
  for (const pb of playerBets ?? []) {
    (pbByBet[pb.bet_id] ??= []).push(pb);
  }

  const stats = (bets ?? []).map(b => {
    const pbs = pbByBet[b.bet_id] ?? [];
    const votes: Record<string, number> = {};
    for (const pb of pbs) votes[pb.pick] = (votes[pb.pick] ?? 0) + 1;
    return {
      ...b,
      betId: b.bet_id,
      participants: pbs.length,
      totalWagered: pbs.reduce((s, pb) => s + (pb.amount ?? 0), 0),
      votes,
    };
  });

  const open = stats.filter(b => b.status === 'open').length;
  const chronological = [...stats].sort((a, b) =>
    Number(b.status === 'open') - Number(a.status === 'open') ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { stats: chronological, open };
}

export default async function GameBetsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const counts = await getEventCounts(game.id);

  const { stats, open } = await getBetStats(game.id, game.sport);
  const isNfl = (game.sport ?? 'NFL') === 'NFL';
  const storedColumnCount = isNfl ? 20 : 18;

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="bets" counts={counts} />

      <div className="flex items-center gap-1 border-b border-border mb-4">
        <Link href={`/games/${game.id}/bets`} className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-amber text-amber">Bet history</Link>
        <Link href={`/games/${game.id}/bets/catalog`} className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-transparent text-secondary hover:text-gray-900">Bet catalog</Link>
      </div>

      <p className="text-secondary text-sm mb-1">
        Every {isNfl ? 'NFL' : 'NHL'} bet stored for this game — open bets first, then resolved bets, newest first within each group.
      </p>
      <p className="text-muted text-xs mb-3">
        <span className="font-semibold text-gray-900">{open} open now</span>
        {' '}· Columns through <span className="font-mono">created_at</span> are stored directly in <span className="font-mono">{isNfl ? 'nfl_bets' : 'nhl_bets'}</span>.
        {' '}The last three columns are derived from the matching player-bet table.
      </p>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th colSpan={storedColumnCount} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">{isNfl ? 'nfl_bets' : 'nhl_bets'} stored columns</th>
              <th colSpan={3} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-l border-border">Derived from player bets</th>
            </tr>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">id</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">game_id</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">game_code</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">bet_id</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">question</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">flavour</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">option_a</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">option_b</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">multiplier_a</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">multiplier_b</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">window_seconds</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">status</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">winning_option</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">trigger_type</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">trigger_event_type</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">{isNfl ? 'trigger_quarter' : 'trigger_period'}</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">trigger_clock</th>
              {isNfl && <><th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">trigger_down</th><th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">yards_to_go</th></>}
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">created_at</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-l border-border">participants</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">total_wagered</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">picks</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((b, i) => (
              <tr key={b.betId} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2 font-mono text-xs text-secondary" title={b.id}>{b.id?.slice(0, 8) ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-secondary" title={b.game_id}>{b.game_id?.slice(0, 8) ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-secondary" title={b.game_code}>{b.game_code?.slice(0, 8) ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-secondary">{b.bet_id}</td>
                <td className="px-3 py-2 text-gray-900 min-w-56">{b.question}</td>
                <td className="px-3 py-2 text-secondary min-w-44">{b.flavour || '—'}</td>
                <td className="px-3 py-2 text-secondary">{b.option_a}</td>
                <td className="px-3 py-2 text-secondary">{b.option_b}</td>
                <td className="px-3 py-2 font-mono text-secondary">{b.multiplier_a}</td>
                <td className="px-3 py-2 font-mono text-secondary">{b.multiplier_b}</td>
                <td className="px-3 py-2 font-mono text-secondary">{b.window_seconds}</td>
                <td className="px-3 py-2"><span className={b.status === 'open' ? 'text-amber font-medium' : b.status === 'void' ? 'text-muted font-medium' : 'text-success font-medium'}>{b.status}</span></td>
                <td className="px-3 py-2 text-secondary">{b.winning_option ?? '—'}</td>
                <td className="px-3 py-2 text-secondary">{b.trigger_type ?? '—'}</td>
                <td className="px-3 py-2 text-secondary">{b.trigger_event_type ?? '—'}</td>
                <td className="px-3 py-2 text-secondary">{isNfl ? (b.trigger_quarter ?? '—') : (b.trigger_period ?? '—')}</td>
                <td className="px-3 py-2 font-mono text-secondary">{b.trigger_clock ?? '—'}</td>
                {isNfl && <><td className="px-3 py-2 text-secondary">{b.trigger_down ?? '—'}</td><td className="px-3 py-2 text-secondary">{b.yards_to_go ?? '—'}</td></>}
                <td className="px-3 py-2 font-mono text-xs text-secondary whitespace-nowrap">{new Date(b.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-secondary border-l border-border">{b.participants}</td>
                <td className="px-3 py-2 text-right font-mono text-secondary">{b.totalWagered.toLocaleString()}</td>
                <td className="px-3 py-2 text-secondary text-xs">
                  {Object.entries(b.votes as Record<string, number>).map(([pick, count]) => (
                    <span key={pick} className="mr-2">
                      <span className={b.winning_option === pick ? 'text-success font-medium' : ''}>{pick}</span>
                      <span className="text-muted ml-0.5">×{count}</span>
                    </span>
                  ))}
                  {Object.keys(b.votes).length === 0 && <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr><td colSpan={storedColumnCount + 3} className="px-3 py-8 text-center text-muted">No bets stored for this game.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
