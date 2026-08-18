import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import {
  CaptureEmpty, SourcePill, TD, TH, TH_GROUP, fmtTime, getCaptureStart,
} from '../rawCapture';

// raw_game_state — one stored row per provider poll. This is deliberately a
// direct table view: no collapsed runs or inferred regressions hide individual
// rows from the underlying table.

interface StateRow {
  id: string;
  status_text: string | null;
  period: number | null;
  clock: string | null;
  fetched_at: string | null;
  source: string | null;
  payload: Record<string, unknown> | null;
}

async function getStates(gameId: string): Promise<StateRow[]> {
  const { data } = await supabase
    .from('raw_game_state')
    .select('id, status_text, period, clock, fetched_at, source, payload')
    // Ascending: regressions and runs are both defined against the preceding
    // row in time. Reversed for display.
    .order('fetched_at', { ascending: true })
    .eq('game_id', gameId)
    .limit(5000);
  return (data ?? []) as StateRow[];
}

export default async function RawStatePage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [counts, states, captureStart] = await Promise.all([
    getEventCounts(game.id),
    getStates(game.id),
    getCaptureStart(),
  ]);

  const display = [...states].reverse();

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="raw-state" counts={counts} />

      <p className="text-secondary text-sm mb-1">
        Every poll of the provider&apos;s game state —{' '}
        <span className="font-mono">raw_game_state</span>, newest first, nothing deduplicated or collapsed.
      </p>
      <p className="text-muted text-xs mb-3">
        {states.length > 0 ? (
          <>
            <span className="text-gray-900 font-semibold">{states.length.toLocaleString()} stored rows</span>
            {' '}— expand <span className="font-mono">payload</span> to inspect the exact provider game record.
          </>
        ) : (
          <>Nothing captured for this game.</>
        )}
      </p>

      {states.length === 0 ? (
        <CaptureEmpty
          table="raw_game_state"
          gameTime={game.scheduled_at ?? game.created_at}
          captureStart={captureStart}
        />
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th colSpan={2} className={TH_GROUP}>Identity</th>
                <th colSpan={3} className={`${TH_GROUP} border-l border-border`}>State</th>
                <th className={`${TH_GROUP} border-l border-border`}>Capture</th>
                <th className={`${TH_GROUP} border-l border-border`}>Raw</th>
              </tr>
              <tr className="border-b border-border bg-gray-50">
                <th className={TH}>fetched_at</th>
                <th className={TH}>id</th>
                <th className={TH}>status_text</th>
                <th className={TH}>period</th>
                <th className={TH}>clock</th>
                <th className={TH}>source</th>
                <th className={TH}>payload</th>
              </tr>
            </thead>
            <tbody>
              {display.map((row, i) => {
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className={TD}>{fmtTime(row.fetched_at)}</td>
                    <td className={`${TD} text-muted`}>{row.id.slice(0, 8)}</td>
                    <td className={TD}>{row.status_text ?? '—'}</td>
                    <td className={TD}>{row.period ?? '—'}</td>
                    <td className={TD}>{row.clock ?? '—'}</td>
                    <td className="px-3 py-2"><SourcePill source={row.source} /></td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-secondary hover:text-amber font-mono">view</summary>
                        <pre className="mt-2 bg-white border border-border rounded-md p-2 text-xs font-mono text-gray-900 whitespace-pre-wrap break-words max-h-80 overflow-y-auto w-[min(58rem,80vw)]">
{JSON.stringify(row.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
