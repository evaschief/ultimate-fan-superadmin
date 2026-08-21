import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';

// Every case of one player holding more than one wager row on the same bet,
// across every game.
//
// Why this exists as its own page: the per-player bet log shows a live mismatch
// only while the wagers are pending. Once a game settles, the pending count
// drops to zero and the discrepancy the player reported becomes invisible —
// only the duplicate rows themselves survive. So the retrospective question,
// "where has this happened?", has no answer anywhere else.
//
// Nothing here writes. Duplicated wagers on finished games are already settled
// and paid; deleting them would rewrite paid results.
export const dynamic = 'force-dynamic';

interface WagerRow {
  id: string;
  game_code: string;
  bet_id: string;
  uid: string;
  question: string | null;
  pick: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
}

interface DuplicateGroup {
  gameId: string;
  gameCode: string;
  gameStatus: string;
  matchup: string;
  isSim: boolean;
  uid: string;
  playerName: string;
  betId: string;
  question: string;
  offerStatus: string | null;
  rows: WagerRow[];
  /** Same bet, opposing sides — a hedge rather than a doubled stake. */
  contradictory: boolean;
  anyPending: boolean;
  extraStake: number;
  /** Gap between the first and last of the duplicated inserts. */
  spreadSeconds: number | null;
}

async function getDuplicates(): Promise<DuplicateGroup[]> {
  const [{ data: nflWagers }, { data: nhlWagers }] = await Promise.all([
    supabase.from('nfl_player_bets').select('id, game_code, bet_id, uid, question, pick, amount, status, created_at').limit(20000),
    supabase.from('nhl_player_bets').select('id, game_code, bet_id, uid, question, pick, amount, status, created_at').limit(20000),
  ]);

  const wagers = [...(nflWagers ?? []), ...(nhlWagers ?? [])] as WagerRow[];

  // A duplicate is the same player holding the same bet twice — the exact
  // combination no unique constraint currently prevents.
  const grouped = new Map<string, WagerRow[]>();
  for (const w of wagers) {
    const key = `${w.game_code}|${w.uid}|${w.bet_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), w]);
  }
  const dupes = Array.from(grouped.entries()).filter(([, rows]) => rows.length > 1);
  if (dupes.length === 0) return [];

  const gameIds = Array.from(new Set(dupes.map(([key]) => key.split('|')[0])));

  const [{ data: games }, { data: roster }, { data: nflOffers }, { data: nhlOffers }] = await Promise.all([
    supabase.from('games').select('id, join_code, status, home_team, away_team, flags').in('id', gameIds),
    supabase.from(ROSTER_TABLE).select('game_id, uid, display_name').in('game_id', gameIds),
    supabase.from('nfl_bets').select('game_code, bet_id, question, status').in('game_code', gameIds),
    supabase.from('nhl_bets').select('game_code, bet_id, question, status').in('game_code', gameIds),
  ]);

  const gameById = new Map((games ?? []).map(g => [g.id, g]));
  const nameByKey = new Map((roster ?? []).map(r => [`${r.game_id}|${r.uid}`, r.display_name]));
  const offerByKey = new Map(
    [...(nflOffers ?? []), ...(nhlOffers ?? [])].map(o => [`${o.game_code}|${o.bet_id}`, o]),
  );

  const groups: DuplicateGroup[] = dupes.map(([key, rows]) => {
    const [gameId, uid, betId] = key.split('|');
    const game = gameById.get(gameId);
    const offer = offerByKey.get(`${gameId}|${betId}`);
    const ordered = [...rows].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    const stamps = ordered.map(r => (r.created_at ? new Date(r.created_at).getTime() : null)).filter((n): n is number => n !== null);

    return {
      gameId,
      gameCode: game?.join_code ?? gameId.slice(0, 8),
      gameStatus: game?.status ?? 'unknown',
      matchup: game ? `${game.away_team} vs ${game.home_team}` : '—',
      isSim: !!game?.flags?.is_sim,
      uid,
      playerName: nameByKey.get(`${gameId}|${uid}`) || uid.slice(0, 8),
      betId,
      question: offer?.question || ordered[0].question || betId,
      offerStatus: offer?.status ?? null,
      rows: ordered,
      contradictory: new Set(ordered.map(r => r.pick)).size > 1,
      anyPending: ordered.some(r => r.status === 'pending'),
      // Every row beyond the first is stake the player should not have had at
      // risk on this bet.
      extraStake: ordered.slice(1).reduce((sum, r) => sum + (r.amount ?? 0), 0),
      spreadSeconds: stamps.length > 1 ? Math.round((Math.max(...stamps) - Math.min(...stamps)) / 100) / 10 : null,
    };
  });

  // Still-pending first (those are actionable), then newest.
  return groups.sort((a, b) => {
    if (a.anyPending !== b.anyPending) return a.anyPending ? -1 : 1;
    return (b.rows[0].created_at ?? '').localeCompare(a.rows[0].created_at ?? '');
  });
}

function StatCard({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs text-muted font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${warn ? 'text-amber' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function DuplicateWagersPage() {
  const groups = await getDuplicates();

  const extraRows = groups.reduce((sum, g) => sum + g.rows.length - 1, 0);
  const affectedGames = new Set(groups.map(g => g.gameId)).size;
  const affectedPlayers = new Set(groups.map(g => `${g.gameId}|${g.uid}`)).size;
  const pendingGroups = groups.filter(g => g.anyPending).length;
  const contradictoryGroups = groups.filter(g => g.contradictory).length;

  return (
    <div className="p-5 pb-10">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Duplicate Wagers</h1>
        <p className="text-secondary text-sm mt-1 max-w-3xl">
          One player holding more than one wager row on the same bet. Their app counts wager rows,
          the console counts distinct open bets — so while these are pending the two disagree, and
          the player sees a bet the console doesn&apos;t. Nothing on this page is modified.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Duplicate groups" value={groups.length} warn={groups.length > 0} />
        <StatCard label="Extra rows" value={extraRows} sub="beyond one per bet" />
        <StatCard label="Still pending" value={pendingGroups} sub="actionable now" warn={pendingGroups > 0} />
        <StatCard label="Opposing picks" value={contradictoryGroups} sub="hedged, not doubled" />
        <StatCard label="Affected" value={`${affectedGames} / ${affectedPlayers}`} sub="games / players" />
      </div>

      {groups.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm font-medium text-gray-900">No duplicate wagers anywhere</p>
          <p className="text-xs text-secondary mt-2 max-w-xl mx-auto">
            No player holds two wager rows on the same bet in any game. Since nothing prevents it at
            the database level, this page is worth re-checking after each game night.
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Game</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Player</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Bet</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Offer</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Rows</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Stakes</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Picks</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Settled as</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Extra stake</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Apart</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr
                  key={`${g.gameId}|${g.uid}|${g.betId}`}
                  className={`border-b border-border last:border-0 ${g.anyPending ? 'bg-amber-dim' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/games/${g.gameId}`} className="font-mono font-semibold text-gray-900 hover:underline">
                      {g.gameCode}
                    </Link>
                    {g.isSim && (
                      <span className="ml-1.5 text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded">SIM</span>
                    )}
                    <div className="text-xs text-secondary mt-0.5">{g.matchup} · {g.gameStatus}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{g.playerName}</td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="text-gray-900">{g.question}</div>
                    <div className="text-xs text-muted font-mono mt-0.5">{g.betId}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {g.offerStatus === 'open' ? (
                      <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-semibold">open</span>
                    ) : (
                      <span className="text-xs text-muted font-mono">{g.offerStatus ?? 'no offer row'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-gray-900">{g.rows.length}</td>
                  <td className="px-3 py-2 font-mono text-xs text-secondary whitespace-nowrap">
                    {g.rows.map(r => r.amount ?? 0).join(' · ')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    <span className={g.contradictory ? 'text-danger font-semibold' : 'text-secondary'}>
                      {g.rows.map(r => r.pick ?? '—').join(' · ')}
                    </span>
                    {g.contradictory && (
                      <div className="text-danger text-[10px]">opposing sides</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-secondary whitespace-nowrap">
                    {g.rows.map(r => r.status ?? '—').join(' · ')}
                    {g.anyPending && <div className="text-amber text-[10px]">still pending</div>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-gray-900">
                    {g.extraStake.toLocaleString()}
                  </td>
                  {/* A pair inserted moments apart points at a replayed batch;
                      minutes apart points at the player wagering twice. */}
                  <td className="px-3 py-2 text-right font-mono text-xs text-secondary whitespace-nowrap">
                    {g.spreadSeconds === null ? '—' : `${g.spreadSeconds}s`}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/games/${g.gameId}/users/${g.uid}`}
                      className="text-xs text-amber hover:underline whitespace-nowrap"
                    >
                      Bet log →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-3 max-w-3xl">
        Nothing prevents this at the database level: the only key on the wager tables is{' '}
        <span className="font-mono">id</span>, so two rows sharing{' '}
        <span className="font-mono">(game_code, bet_id, uid)</span> are permitted. A unique index
        would stop it, but it would also reject a deliberate second wager on the opposite side — the
        rows flagged as opposing picks here settled as genuine hedges, one won and one lost.
      </p>
    </div>
  );
}
