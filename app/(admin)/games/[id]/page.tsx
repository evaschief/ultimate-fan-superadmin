import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GenerateRosterButton from './GenerateRosterButton';
import SetFinishedButton from './SetFinishedButton';

async function getGameDetail(id: string) {
  const { data: game } = await supabase
    .from('games')
    .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, flags, audit_sheet_url')
    .eq('id', id)
    .single();

  if (!game) return null;

  const isNfl = (game.sport ?? 'NFL') === 'NFL';
  const betsTable = isNfl ? 'nfl_bets' : 'nhl_bets';
  const pbTable = isNfl ? 'nfl_player_bets' : 'nhl_player_bets';

  const [
    { data: players },
    { data: bets },
    { data: playerBets },
    { data: history },
  ] = await Promise.all([
    supabase.from('players').select('uid, display_name, balance, locked_amount').eq('game_code', id),
    supabase.from(betsTable).select('bet_id, question, option_a, option_b, status, winning_option, created_at').eq('game_code', id).order('created_at'),
    supabase.from(pbTable).select('uid, bet_id, pick, amount, status').eq('game_code', id),
    supabase.from('game_history').select('uid, final_balance, is_eliminated').eq('game_code', id),
  ]);

  // Per-player stats
  const historyByUid: Record<string, typeof history[0]> = {};
  for (const h of history ?? []) historyByUid[h.uid] = h;

  const pbByPlayer: Record<string, typeof playerBets> = {};
  for (const pb of playerBets ?? []) {
    (pbByPlayer[pb.uid] ??= []).push(pb);
  }

  const playerStats = (players ?? []).map(p => {
    const pbs = pbByPlayer[p.uid] ?? [];
    const won = pbs.filter(pb => pb.status === 'won').length;
    const lost = pbs.filter(pb => pb.status === 'lost').length;
    const totalWagered = pbs.reduce((s, pb) => s + (pb.amount ?? 0), 0);
    const h = historyByUid[p.uid];
    return {
      uid: p.uid,
      name: p.display_name ?? p.uid,
      balance: p.balance ?? 0,
      lockedAmount: p.locked_amount ?? 0,
      betsPlaced: pbs.length,
      won,
      lost,
      totalWagered,
      earlyExit: h?.is_eliminated ?? false,
      finalBalance: h?.final_balance ?? null,
    };
  });
  playerStats.sort((a, b) => (b.balance + b.lockedAmount) - (a.balance + a.lockedAmount));

  // Per-bet stats
  const pbByBet: Record<string, typeof playerBets> = {};
  for (const pb of playerBets ?? []) {
    (pbByBet[pb.bet_id] ??= []).push(pb);
  }

  const betStats = (bets ?? []).map(b => {
    const pbs = pbByBet[b.bet_id] ?? [];
    const totalWagered = pbs.reduce((s, pb) => s + (pb.amount ?? 0), 0);
    const participants = pbs.length;
    const playerCount = (players ?? []).length;
    // Vote breakdown
    const votes: Record<string, number> = {};
    for (const pb of pbs) votes[pb.pick] = (votes[pb.pick] ?? 0) + 1;
    return {
      bet_id: b.bet_id,
      question: b.question,
      optionA: b.option_a,
      optionB: b.option_b,
      status: b.status,
      winningOption: b.winning_option,
      participants,
      participationRate: playerCount > 0 ? Math.round((participants / playerCount) * 100) : 0,
      totalWagered,
      votes,
    };
  });

  const totalWagered = (playerBets ?? []).reduce((s, pb) => s + (pb.amount ?? 0), 0);

  return { game, playerStats, betStats, totalWagered };
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

export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const data = await getGameDetail(params.id);
  if (!data) notFound();

  const { game, playerStats, betStats, totalWagered } = data;

  const hasAudit = game.audit_sheet_url && game.audit_sheet_url !== 'creating';
  const playedAt = game.created_at
    ? new Date(game.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const statusColor =
    game.status === 'live' ? 'text-success' :
    game.status === 'lobby' ? 'text-amber' : 'text-muted';

  return (
    <div className="p-5 pb-10 max-w-5xl">
      {/* Header */}
      <div className="mb-5">
        <Link href="/games" className="text-xs text-muted hover:text-gray-900 transition-colors">← Games</Link>
        <div className="flex items-start justify-between mt-1 gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {game.away_team} vs {game.home_team}
              <span className="font-mono text-muted font-normal ml-2 text-base">· {game.join_code}</span>
            </h1>
            <p className="text-secondary text-sm mt-0.5">
              {game.sport}
              <span className={`ml-2 font-medium ${statusColor}`}>
                {game.status === 'live' ? `● LIVE · ${game.period} ${game.clock}` : game.status.toUpperCase()}
              </span>
              {playedAt && <span className="text-muted ml-2">· {playedAt}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {game.sport === 'NFL' && <GenerateRosterButton gameId={game.id} />}
            <SetFinishedButton gameId={game.id} currentStatus={game.status} />
            {hasAudit && (
              <a
                href={game.audit_sheet_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
              >
                Audit Sheet ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Score */}
      {game.status !== 'lobby' && (
        <div className="card px-5 py-4 mb-4 flex items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">{game.away_team}</div>
            <div className="text-3xl font-bold text-gray-900">{game.away_score}</div>
          </div>
          <div className="text-muted text-lg font-light">–</div>
          <div className="text-center">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">{game.home_team}</div>
            <div className="text-3xl font-bold text-gray-900">{game.home_score}</div>
          </div>
          {game.status === 'live' && (
            <div className="ml-4 text-sm text-secondary">{game.period} · {game.clock}</div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Players" value={playerStats.length} />
        <StatCard label="Bets" value={betStats.length} />
        <StatCard label="Total Wagered" value={totalWagered.toLocaleString()} sub="pts across all players" />
        <StatCard label="Early Exits" value={playerStats.filter(p => p.earlyExit).length} sub="went bankrupt" />
      </div>

      {/* Players table */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Players</h2>
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
              {playerStats.map((p, i) => (
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
              {playerStats.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No players yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bets table */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Bets</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Question</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Winner</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Participation</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Wagered</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Votes</th>
              </tr>
            </thead>
            <tbody>
              {betStats.map((b, i) => (
                <tr key={b.bet_id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-900 max-w-xs">{b.question}</td>
                  <td className="px-3 py-2">
                    {b.winningOption
                      ? <span className="text-success font-medium">{b.winningOption}</span>
                      : <span className="text-muted">—</span>
                    }
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
                  </td>
                </tr>
              ))}
              {betStats.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">No bets yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
