import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';
import GameHeader, { getEventCounts, getGame, betTables } from '../GameHeader';

async function getBetStats(gameId: string, sport: string | null) {
  const { bets: betsTable, playerBets: playerBetsTable } = betTables(sport);

  const [{ data: bets }, { data: playerBets }, { count: playerCount }] = await Promise.all([
    supabase.from(betsTable)
      .select('bet_id, question, option_a, option_b, status, winning_option, created_at')
      .eq('game_code', gameId)
      .order('created_at'),
    supabase.from(playerBetsTable)
      .select('uid, bet_id, pick, amount, status')
      .eq('game_code', gameId),
    supabase.from(ROSTER_TABLE)
      .select('uid', { count: 'exact', head: true })
      .eq('game_code', gameId),
  ]);

  const pbByBet: Record<string, typeof playerBets> = {};
  for (const pb of playerBets ?? []) {
    (pbByBet[pb.bet_id] ??= []).push(pb);
  }

  const roster = playerCount ?? 0;

  const stats = (bets ?? []).map(b => {
    const pbs = pbByBet[b.bet_id] ?? [];
    const votes: Record<string, number> = {};
    for (const pb of pbs) votes[pb.pick] = (votes[pb.pick] ?? 0) + 1;
    return {
      betId: b.bet_id,
      question: b.question,
      optionA: b.option_a,
      optionB: b.option_b,
      status: b.status,
      winningOption: b.winning_option,
      participants: pbs.length,
      participationRate: roster > 0 ? Math.round((pbs.length / roster) * 100) : 0,
      totalWagered: pbs.reduce((s, pb) => s + (pb.amount ?? 0), 0),
      votes,
    };
  });

  const totalWagered = (playerBets ?? []).reduce((s, pb) => s + (pb.amount ?? 0), 0);
  // A voided bet can carry the literal string 'void' in winning_option rather
  // than null (process-event writes { status: 'void' } for bets whose trigger
  // never resolved, and at least one row in current data has 'void' in the
  // winner column too). Counting winning_option for truthiness alone therefore
  // reported a voided bet as settled — hence isRealWinner.
  const settled = stats.filter(b => isRealWinner(b.winningOption)).length;
  const voided = stats.filter(b => isVoid(b)).length;
  const unresolved = stats.length - settled - voided;
  const avgParticipation = stats.length > 0
    ? Math.round(stats.reduce((s, b) => s + b.participationRate, 0) / stats.length)
    : 0;

  return { stats, totalWagered, settled, voided, unresolved, avgParticipation };
}

function isRealWinner(winningOption: string | null): boolean {
  return !!winningOption && winningOption.toLowerCase() !== 'void';
}

function isVoid(bet: { status: string | null; winningOption: string | null }): boolean {
  if (isRealWinner(bet.winningOption)) return false;
  return bet.status === 'void' || (bet.winningOption ?? '').toLowerCase() === 'void';
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function GameBetsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const counts = await getEventCounts(game.id);

  const { stats, totalWagered, settled, voided, unresolved, avgParticipation } = await getBetStats(game.id, game.sport);

  return (
    <div className="p-5 pb-10 max-w-5xl">
      <GameHeader game={game} active="bets" counts={counts} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Bets" value={stats.length} />
        <StatCard label="Settled" value={settled} sub={`${voided} void · ${unresolved} unresolved`} />
        <StatCard label="Total Wagered" value={totalWagered.toLocaleString()} sub="pts across all bets" />
        <StatCard label="Avg Participation" value={`${avgParticipation}%`} sub="of the roster per bet" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Question</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Options</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Winner</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Participation</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Wagered</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Votes</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((b, i) => (
              <tr key={b.betId} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2 text-gray-900 max-w-xs">
                  {b.question}
                  <div className="text-xs text-muted font-mono mt-0.5">{b.betId}</div>
                </td>
                <td className="px-3 py-2 text-secondary text-xs">
                  {[b.optionA, b.optionB].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className="px-3 py-2">
                  {isRealWinner(b.winningOption) ? (
                    <span className="text-success font-medium">{b.winningOption}</span>
                  ) : isVoid(b) ? (
                    // Distinct from '—': the bet was explicitly voided at game
                    // end (trigger never resolved), not merely awaiting a result.
                    <span className="text-xs bg-gray-100 text-muted border border-border px-2 py-0.5 rounded-full font-semibold">Void</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-secondary">
                  {b.participants} <span className="text-muted text-xs">({b.participationRate}%)</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-secondary">{b.totalWagered.toLocaleString()}</td>
                <td className="px-3 py-2 text-secondary text-xs">
                  {Object.entries(b.votes).map(([pick, count]) => (
                    <span key={pick} className="mr-2">
                      <span className={b.winningOption === pick ? 'text-success font-medium' : ''}>{pick}</span>
                      <span className="text-muted ml-0.5">×{count}</span>
                    </span>
                  ))}
                  {Object.keys(b.votes).length === 0 && <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No bets yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
