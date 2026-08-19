import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { betTables, getEventCounts, getGame } from '../../GameHeader';
import { catalogForSport } from '@/lib/betCatalog';

type BetHistoryRow = {
  trigger_event_type: string | null;
  status: string | null;
  winning_option: string | null;
  option_a: string | null;
  option_b: string | null;
};

function outcomeSplit(rows: BetHistoryRow[]) {
  let a = 0;
  let b = 0;
  for (const row of rows) {
    if (!row.winning_option || row.status !== 'settled') continue;
    if (row.winning_option === row.option_a) a++;
    if (row.winning_option === row.option_b) b++;
  }
  const total = a + b;
  return total === 0 ? '—' : `A ${Math.round((a / total) * 100)}% · B ${Math.round((b / total) * 100)}%`;
}

export default async function BetCatalogPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();
  const { bets: betsTable } = betTables(game.sport);
  const [counts, historyResult, currentResult] = await Promise.all([
    getEventCounts(game.id),
    // History is sport-wide: it answers how often each supported bet has
    // actually appeared across all recorded games of this sport.
    supabase.from(betsTable).select('trigger_event_type, status, winning_option, option_a, option_b').limit(10000),
    supabase.from(betsTable).select('trigger_event_type').eq('game_code', game.id).eq('status', 'open'),
  ]);
  const history = (historyResult.data ?? []) as BetHistoryRow[];
  const openTypes = new Set((currentResult.data ?? []).map(row => row.trigger_event_type));
  const catalog = catalogForSport(game.sport);

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="bet-catalog" counts={counts} />
      <p className="text-secondary text-sm mb-1">
        Every bet type the automatic game flow can create for {game.sport ?? 'NFL'}.
      </p>
      <p className="text-muted text-xs mb-3">
        Frequency and outcome split are calculated from all stored <span className="font-mono">{betsTable}</span> rows for this sport.
        {' '}This catalog is read-only: the game continues to run normally without anyone using it.
      </p>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Bet</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Trigger / timing</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Options</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Times offered</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Settled</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Voided</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Historical outcome split</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">This game</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry, index) => {
              const rows = history.filter(row => row.trigger_event_type === entry.id);
              const settled = rows.filter(row => row.status === 'settled').length;
              const voided = rows.filter(row => row.status === 'void').length;
              const open = openTypes.has(entry.id);
              return (
                <tr key={entry.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-900">
                    <div>{entry.name}</div>
                    <div className="font-mono text-xs text-muted mt-0.5">{entry.id}</div>
                  </td>
                  <td className="px-3 py-2 text-secondary">{entry.trigger}</td>
                  <td className="px-3 py-2 text-secondary">{entry.options}</td>
                  <td className="px-3 py-2 text-right font-mono text-secondary">{rows.length}</td>
                  <td className="px-3 py-2 text-right font-mono text-secondary">{settled}</td>
                  <td className="px-3 py-2 text-right font-mono text-secondary">{voided}</td>
                  <td className="px-3 py-2 text-secondary">{outcomeSplit(rows)}</td>
                  <td className="px-3 py-2">
                    {open ? <span className="text-xs bg-amber-dim text-amber border border-amber-border px-2 py-0.5 rounded-full font-semibold">Open now</span>
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
