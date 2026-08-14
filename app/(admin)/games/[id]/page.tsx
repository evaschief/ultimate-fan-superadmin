import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';
import GameHeader, { getEventCounts, getGame, betTables } from './GameHeader';

async function getPlayerStats(gameId: string, sport: string | null) {
  const { playerBets } = betTables(sport);

  const [{ data: players }, { data: bets }, { data: history }] = await Promise.all([
    supabase.from(ROSTER_TABLE).select('uid, display_name, balance, locked_amount').eq('game_code', gameId),
    supabase.from(playerBets).select('uid, bet_id, pick, amount, status').eq('game_code', gameId),
    supabase.from('game_history').select('uid, final_balance, is_eliminated').eq('game_code', gameId),
  ]);

  const historyByUid: Record<string, NonNullable<typeof history>[number]> = {};
  for (const h of history ?? []) historyByUid[h.uid] = h;

  const pbByPlayer: Record<string, typeof bets> = {};
  for (const pb of bets ?? []) {
    (pbByPlayer[pb.uid] ??= []).push(pb);
  }

  const stats = (players ?? []).map(p => {
    const pbs = pbByPlayer[p.uid] ?? [];
    const h = historyByUid[p.uid];
    return {
      uid: p.uid,
      name: p.display_name ?? p.uid,
      balance: p.balance ?? 0,
      lockedAmount: p.locked_amount ?? 0,
      betsPlaced: pbs.length,
      won: pbs.filter(pb => pb.status === 'won').length,
      lost: pbs.filter(pb => pb.status === 'lost').length,
      totalWagered: pbs.reduce((s, pb) => s + (pb.amount ?? 0), 0),
      earlyExit: h?.is_eliminated ?? false,
      finalBalance: h?.final_balance ?? null,
    };
  });

  stats.sort((a, b) => (b.balance + b.lockedAmount) - (a.balance + a.lockedAmount));

  const totalWagered = (bets ?? []).reduce((s, pb) => s + (pb.amount ?? 0), 0);
  return { stats, totalWagered };
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

export default async function GamePlayersPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const counts = await getEventCounts(game.id);

  const { stats, totalWagered } = await getPlayerStats(game.id, game.sport);

  return (
    <div className="p-5 pb-10 max-w-5xl">
      <GameHeader game={game} active="players" counts={counts} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Players" value={stats.length} />
        <StatCard label="Total Wagered" value={totalWagered.toLocaleString()} sub="pts across all players" />
        <StatCard label="Early Exits" value={stats.filter(p => p.earlyExit).length} sub="went bankrupt" />
        <StatCard
          label="Bets Placed"
          value={stats.reduce((s, p) => s + p.betsPlaced, 0)}
          sub="player picks"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Balance</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">At Risk</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Bets</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">W / L</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Wagered</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {stats.map((p, i) => (
              <tr key={p.uid} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2 font-medium text-gray-900">
                  {p.name}
                  {p.finalBalance != null && (
                    <span className="ml-1.5 text-xs text-muted">(final: {p.finalBalance.toLocaleString()})</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-900">{p.balance.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-secondary">{p.lockedAmount > 0 ? p.lockedAmount.toLocaleString() : '—'}</td>
                <td className="px-3 py-2 text-right text-secondary">{p.betsPlaced}</td>
                <td className="px-3 py-2 text-right">
                  <span className="text-success font-medium">{p.won}</span>
                  <span className="text-muted mx-1">/</span>
                  <span className="text-danger font-medium">{p.lost}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-secondary">{p.totalWagered.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  {p.earlyExit && (
                    <span className="text-xs text-danger border border-danger/30 bg-danger/5 px-1.5 py-0.5 rounded">Bankrupt</span>
                  )}
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No players yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
