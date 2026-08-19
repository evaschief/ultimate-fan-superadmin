import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GameHeader, { betTables, getEventCounts, getGame } from '../../GameHeader';
import OpenCatalogBetButton from './OpenCatalogBetButton';

type CatalogEntry = {
  id: string;
  bet_type: string;
  name: string;
  trigger_description: string;
  trigger_context: string | null;
  option_format: string;
  pricing: Record<string, unknown>;
  trigger_rule: Record<string, unknown>;
  manual_openable: boolean;
  active: boolean;
  implementation_status: 'live' | 'planned' | 'retired';
};

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

function catalogMultiplier(pricing: Record<string, unknown>) {
  if (pricing?.mode === 'fixed') return `${pricing.multiplierA} / ${pricing.multiplierB}`;
  if (pricing?.mode === 'moneyline') return 'BDL moneyline';
  return JSON.stringify(pricing ?? {});
}

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
  const [counts, catalogResult, historyResult, picksResult, currentResult] = await Promise.all([
    getEventCounts(game.id),
    supabase.from('bet_catalog').select('id, bet_type, name, trigger_description, trigger_context, option_format, pricing, trigger_rule, manual_openable, active, implementation_status').eq('sport', game.sport === 'NHL' ? 'NHL' : 'NFL').order('sort_order'),
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
  const catalog = (catalogResult.data ?? []) as CatalogEntry[];

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="bets" counts={counts} />
      <div className="flex items-center gap-1 border-b border-border mb-4">
        <Link href={`/games/${game.id}/bets`} className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-transparent text-secondary hover:text-gray-900">Bet history</Link>
        <Link href={`/games/${game.id}/bets/catalog`} className="px-3 py-2 text-sm font-medium -mb-px border-b-2 border-amber text-amber">Bet catalog</Link>
      </div>
      <p className="text-secondary text-sm mb-1">
        Every {game.sport ?? 'NFL'} bet definition stored in <span className="font-mono">bet_catalog</span>.
      </p>
      <p className="text-muted text-xs mb-3">
        The first three columns are stored catalog fields. Offered counts and player-pick results are derived from actual bet history.
        {' '}The game continues to run normally without anyone using it; opening a catalog bet is an optional Superadmin action.
      </p>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Bet</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Trigger / timing</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Options</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Trigger rule</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Offered this game</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Latest multiplier</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Historical player picks</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">This game / optional action</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry, index) => {
              const rows = history.filter(row => row.trigger_event_type === entry.bet_type);
              const offeredThisGame = currentGameBets.filter(row => row.trigger_event_type === entry.bet_type).length;
              // The query is newest-first, so this is the actual latest pair
              // stored when this bet type was offered in the current game.
              const latest = currentGameBets.find(row => row.trigger_event_type === entry.bet_type);
              const open = openTypes.has(entry.bet_type);
              const matchingPicks = playerPicks.filter(pick => rows.some(row => row.game_code === pick.game_code && row.bet_id === pick.bet_id));
              return (
                <tr key={entry.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-900">
                    <div>{entry.name}</div>
                    <div className="font-mono text-xs text-muted mt-0.5">{entry.bet_type}</div>
                  </td>
                  <td className="px-3 py-2 text-secondary">{entry.trigger_context ?? entry.trigger_description}</td>
                  <td className="px-3 py-2 text-secondary">{entry.option_format}</td>
                  <td className="px-3 py-2 text-secondary"><details><summary className="cursor-pointer text-xs text-amber whitespace-nowrap">View JSON</summary><pre className="mt-2 p-2 bg-gray-50 border border-border rounded text-xs font-mono whitespace-pre-wrap min-w-80">{JSON.stringify(entry.trigger_rule, null, 2)}</pre></details></td>
                  <td className="px-3 py-2 text-right font-mono text-secondary">{offeredThisGame}</td>
                  <td className="px-3 py-2 font-mono text-secondary">
                    {latest ? `${latest.multiplier_a} / ${latest.multiplier_b}` : catalogMultiplier(entry.pricing)}
                  </td>
                  <td className="px-3 py-2 text-secondary">{playerPickResults(rows, matchingPicks)}</td>
                  <td className="px-3 py-2">
                    {open ? <span className="text-xs bg-amber-dim text-amber border border-amber-border px-2 py-0.5 rounded-full font-semibold">Already open</span>
                      : entry.active && entry.manual_openable && game.status === 'live' ? <OpenCatalogBetButton gameId={game.id} templateId={entry.bet_type} />
                      : <span className="text-xs text-muted">{entry.implementation_status === 'planned' ? 'Planned' : 'Automatic on trigger'}</span>}
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
