import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import {
  CaptureEmpty, ClaimedPill, SourcePill, TD, TH, TH_GROUP, fmtTime, getCaptureStart,
} from '../rawCapture';

// raw_stat_snapshots — one row per stored, hash-distinct provider stats payload.
// This is intentionally a direct table view: every displayed field is either a
// database column or the unchanged JSON payload. Interpretation belongs in a
// future, separately-labelled analysis view, never hidden among stored columns.

interface SnapshotRow {
  id: string;
  payload_hash: string | null;
  player_count: number | null;
  fetched_at: string | null;
  claimed_at: string | null;
  source: string | null;
  payload: unknown;
}

async function getSnapshots(gameId: string): Promise<SnapshotRow[]> {
  const { data } = await supabase
    .from('raw_stat_snapshots')
    .select('id, payload_hash, player_count, fetched_at, claimed_at, source, payload')
    // Ascending query, reversed for newest-first display below.
    .order('fetched_at', { ascending: true })
    .eq('game_id', gameId)
    .limit(3000);
  return (data ?? []) as SnapshotRow[];
}

export default async function RawSnapshotsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [counts, snapshots, captureStart] = await Promise.all([
    getEventCounts(game.id),
    getSnapshots(game.id),
    getCaptureStart(),
  ]);

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="raw-snapshots" counts={counts} />

      <p className="text-secondary text-sm mb-1">
        Stored provider stat snapshots — <span className="font-mono">raw_stat_snapshots</span>,
        newest first. Each row contains one full, hash-distinct player-stats payload.
      </p>
      <p className="text-muted text-xs mb-3">
        {snapshots.length > 0 ? (
          <>
            <span className="text-gray-900 font-semibold">{snapshots.length} stored snapshots</span>
            {' '}— expand <span className="font-mono">payload</span> to inspect the exact player-stat array.
          </>
        ) : (
          <>Nothing captured for this game.</>
        )}
      </p>

      {snapshots.length === 0 ? (
        <CaptureEmpty
          table="raw_stat_snapshots"
          gameTime={game.scheduled_at ?? game.created_at}
          captureStart={captureStart}
        />
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th colSpan={3} className={TH_GROUP}>Stored columns</th>
                <th className={`${TH_GROUP} border-l border-border`}>Content</th>
                <th colSpan={2} className={`${TH_GROUP} border-l border-border`}>Capture</th>
                <th className={`${TH_GROUP} border-l border-border`}>Raw</th>
              </tr>
              <tr className="border-b border-border bg-gray-50">
                <th className={TH}>fetched_at</th>
                <th className={TH}>payload_hash</th>
                <th className={TH}>id</th>
                <th className={`${TH} text-right`}>player_count</th>
                <th className={TH}>claimed</th>
                <th className={TH}>source</th>
                <th className={TH}>payload</th>
              </tr>
            </thead>
            <tbody>
              {[...snapshots].reverse().map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className={TD}>{fmtTime(row.fetched_at)}</td>
                  <td className={`${TD} text-secondary`} title={row.payload_hash ?? undefined}>
                    {row.payload_hash ?? '—'}
                  </td>
                  <td className={`${TD} text-muted`}>{row.id.slice(0, 8)}</td>
                  <td className={`${TD} text-right`}>{row.player_count ?? '—'}</td>
                  <td className="px-3 py-2"><ClaimedPill claimedAt={row.claimed_at} /></td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
