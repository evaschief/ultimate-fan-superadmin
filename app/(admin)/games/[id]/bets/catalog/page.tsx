import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GameHeader, { betTables, getEventCounts, getGame } from '../../GameHeader';
import { catalogForSport, defaultMultiplierFor } from '@/lib/betCatalog';
import OpenCatalogBetButton from './OpenCatalogBetButton';

type BetHistoryRow = {
  game_code: string;
  bet_id: string;
  trigger_event_type: string | null;
  status: string | null;
  winning_option: string | null;
  option_a: string | null;
  option_b: string | null;
};

type PlayerPickRow = { game_code: string; bet_id: string; pick: string | null };

function playerPickResults(rows: BetHistoryRow[], picks: PlayerPickRow[]) {
  const settled = new Map(
    rows.filter(row => row.status === 'settled' && row.winning_option)
      .map(row => [`${row.game_code}\u0000${row.bet_id}`, row.winning_option]),
  );
  let won = 0;
  let lost = 0;
  for (const pick of picks) {
    const winner = settled.get(`${pick.game_code}\u0000${pick.bet_id}`);
    if (!winner || !pick.pick) continue;
    if (pick.pick === winner) won++;
    else lost++;
  }
  const total = won + lost;
  return total === 0 ? '—' : `${won} won · ${lost} lost · ${Math.round((won / total) * 100)}% won`;
}

export default async function BetCatalogPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();
  const { bets: betsTable, playerBets: playerBetsTable } = betTables(game.sport);
  const [counts, historyResult, picksResult, currentResult] = await Promise.all([
    getEventCounts(game.id),
    // History is sport-wide: it answers how often each supported bet has
    // actually appeared across all recorded games of this sport.
    supabase.from(betsTable).select('game_code, bet_id, trigger_event_type, status, winning_option, option_a, option_b').limit(10000),
    supabase.from(playerBetsTable).select('game_code, bet_id, pick').limit(50000),
    supabase.from(betsTable)
      .select('trigger_event_type, status, multiplier_a, multiplier_b, created_at')
      .eq('game_code', game.id)
      .order('created_at', { ascending: false }),
  ]);
  const history = (historyResult.data ?? []) as BetHistoryRow[];
  const playerPicks = (picksResult.data ?? []) as PlayerPickRow[];
  const currentGameBets = currentResult.data ?? [];
  const openTypes = new Set(currentGameBets.filter(row => row.status === 'open').map(row => row.trigger_event_type));
  const catalog = catalogForSport(game.sport);

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="bets" counts={counts} />
      <div className="flex items-center gap-1 border-b border-border mb-4">
        <Link href={`/games/${game.id}/bets`} className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-transparent text-secondary hover:text-gray-900">Bet history</Link>
        <Link href={`/games/${game.id}/bets/catalog`} className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-amber text-amber">Bet catalog</Link>
      </div>
      <p className="text-secondary text-sm mb-1">
        Every bet type the automatic game flow can create for {game.sport ?? 'NFL'}.
      </p>
      <p className="text-muted text-xs mb-3">
        Offered this game counts this game&apos;s stored rows. Historical player pick results compare player-bet picks with each settled winner across all recorded games.
        {' '}If a type has not been offered, its multiplier is labelled Default: that is the opening rule, not a stored bet. The game continues to run normally without anyone using it; opening a catalog bet is an optional Superadmin action.
      </p>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Bet</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Trigger / timing</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Options</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Offered this game</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Latest / default multiplier</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Historical player picks</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">This game / optional action</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry, index) => {
              const rows = history.filter(row => row.trigger_event_type === entry.id);
              const offeredThisGame = currentGameBets.filter(row => row.trigger_event_type === entry.id).length;
              // The query is newest-first, so this is the actual latest pair
              // stored when this bet type was offered in the current game.
              const latest = currentGameBets.find(row => row.trigger_event_type === entry.id);
              const open = openTypes.has(entry.id);
              const matchingPicks = playerPicks.filter(pick => rows.some(row => row.game_code === pick.game_code && row.bet_id === pick.bet_id));
              return (
                <tr key={entry.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-900">
                    <div>{entry.name}</div>
                    <div className="font-mono text-xs text-muted mt-0.5">{entry.id}</div>
                  </td>
                  <td className="px-3 py-2 text-secondary">{entry.trigger}</td>
                  <td className="px-3 py-2 text-secondary">{entry.options}</td>
                  <td className="px-3 py-2 text-right font-mono text-secondary">{offeredThisGame}</td>
                  <td className="px-3 py-2 font-mono text-secondary">
                    {latest ? `${latest.multiplier_a} / ${latest.multiplier_b}` : <><span className="text-muted text-xs">Default </span>{defaultMultiplierFor(entry)}</>}
                  </td>
                  <td className="px-3 py-2 text-secondary">{playerPickResults(rows, matchingPicks)}</td>
                  <td className="px-3 py-2">
                    {open ? <span className="text-xs bg-amber-dim text-amber border border-amber-border px-2 py-0.5 rounded-full font-semibold">Already open</span>
                      : entry.manualOpenable && game.status === 'live' ? <OpenCatalogBetButton gameId={game.id} templateId={entry.id} />
                      : <span className="text-xs text-muted">Automatic on trigger</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
