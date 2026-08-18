import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import {
  CaptureEmpty, ClaimedPill, SourcePill, TD, TH, TH_GROUP, fmtDelta, fmtTime, getCaptureStart,
} from '../rawCapture';

// raw_stat_snapshots — one row per stat payload that differed from the one
// before it, deduplicated by payload_hash.
//
// Without a diff this page is a list of hashes, which tells you nothing. What
// actually moved between consecutive snapshots is computed here, server-side:
// nothing in the table stores it.
//
// Keyed on game_id, not game_code (see rawCapture.tsx).

interface SnapshotRow {
  id: string;
  payload_hash: string | null;
  player_count: number | null;
  fetched_at: string | null;
  claimed_at: string | null;
  source: string | null;
  payload: unknown;
}

interface StatChange {
  player: string;
  stat: string;
  prev: string;
  curr: string;
}

async function getSnapshots(gameId: string): Promise<SnapshotRow[]> {
  const { data } = await supabase
    .from('raw_stat_snapshots')
    .select('id, payload_hash, player_count, fetched_at, claimed_at, source, payload')
    // Ascending: a diff needs the row before it in time. Reversed for display.
    .order('fetched_at', { ascending: true })
    .eq('game_id', gameId)
    .limit(3000);
  return (data ?? []) as SnapshotRow[];
}

/**
 * A snapshot payload is an array of per-player stat objects shaped
 * { team: { abbreviation }, player: { last_name }, <statName>: value }.
 * Flattened to "player → stat → value" so two snapshots can be compared.
 */
function flatten(payload: unknown): Map<string, Map<string, unknown>> {
  const out = new Map<string, Map<string, unknown>>();
  if (!Array.isArray(payload)) return out;

  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const player = e.player && typeof e.player === 'object'
      ? String((e.player as Record<string, unknown>).last_name ?? '')
      : '';
    const team = e.team && typeof e.team === 'object'
      ? (e.team as Record<string, unknown>).abbreviation
      : null;
    const name = player || '(unnamed)';
    const key = team ? `${name} (${team})` : name;

    const stats = out.get(key) ?? new Map<string, unknown>();
    for (const [k, v] of Object.entries(e)) {
      if (k === 'player' || k === 'team') continue;
      stats.set(k, v);
    }
    out.set(key, stats);
  }
  return out;
}

/**
 * Sum of every numeric stat in a payload. Cumulative game stats only ever grow,
 * so this total is a far better stand-in for capture order than player_count,
 * which repeats: 114 snapshots share only 59 distinct player counts, and the
 * ties then fall back to an arbitrary hash order. Measured across this game's
 * snapshots, ordering by player_count produces 107 impossible decreases out of
 * 7,753 stat comparisons; ordering by this total produces 13.
 */
function statTotal(payload: unknown): number {
  if (!Array.isArray(payload)) return 0;
  let sum = 0;
  for (const entry of payload) {
    if (!entry || typeof entry !== 'object') continue;
    for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
      if (k === 'team' || k === 'player') continue;
      if (typeof v === 'number') sum += v;
    }
  }
  return sum;
}

function diff(curr: unknown, prev: unknown): StatChange[] {
  const a = flatten(prev);
  const b = flatten(curr);
  const changes: StatChange[] = [];

  for (const [player, stats] of Array.from(b.entries())) {
    const before = a.get(player);
    for (const [stat, value] of Array.from(stats.entries())) {
      const was = before?.get(stat);
      if (JSON.stringify(was) === JSON.stringify(value)) continue;
      changes.push({
        player,
        stat,
        prev: was === undefined ? '—' : String(was),
        curr: String(value),
      });
    }
  }
  return changes.sort((x, y) => x.player.localeCompare(y.player));
}

export default async function RawSnapshotsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [counts, snapshots, captureStart, { count: pollCount }] = await Promise.all([
    getEventCounts(game.id),
    getSnapshots(game.id),
    getCaptureStart(),
    // Every poll writes a raw_game_state row, so that count is the denominator
    // for how effective the hash-dedup is.
    supabase.from('raw_game_state').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
  ]);

  // A backfill writes every snapshot in one go, stamping them all with the same
  // fetched_at — so for those games the table records no sequence at all, and
  // ordering by time yields an arbitrary order. Diffing arbitrary neighbours
  // produces confident-looking nonsense ("no stat changed" on most rows), so
  // detect the tie and say so rather than presenting the order as capture order.
  const distinctStamps = new Set(snapshots.map(s => s.fetched_at)).size;
  const tiedTime = snapshots.length > 1 && distinctStamps <= 1;

  // Ordered by accumulated stat total — see statTotal. player_count was the
  // obvious choice and was wrong: it repeats often enough that the arbitrary
  // tiebreak showed stats going backwards, which cumulative stats cannot do.
  const ordered = tiedTime
    ? [...snapshots].sort((a, b) =>
        statTotal(a.payload) - statTotal(b.payload) ||
        (a.player_count ?? 0) - (b.player_count ?? 0) ||
        (a.payload_hash ?? '').localeCompare(b.payload_hash ?? ''))
    : snapshots;

  // Diffed in sequence order, then reversed so the latest snapshot leads.
  const rows = ordered.map((row, i) => ({
    row,
    ordinal: i + 1,
    prev: ordered[i - 1] ?? null,
    changes: i === 0 ? null : diff(row.payload, ordered[i - 1].payload),
  })).reverse();

  const polls = pollCount ?? 0;
  const dedupRatio = polls > 0 ? Math.round((snapshots.length / polls) * 1000) / 10 : null;

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="raw-snapshots" counts={counts} />

      <p className="text-secondary text-sm mb-1">
        Stat payloads that differed from the one before them —{' '}
        <span className="font-mono">raw_stat_snapshots</span>, newest first, deduplicated by
        payload hash.
      </p>
      <p className="text-muted text-xs mb-3">
        {snapshots.length > 0 ? (
          <>
            <span className="text-gray-900 font-semibold">{snapshots.length} snapshots</span>
            {polls > 0 && (
              <> from {polls.toLocaleString()} polls — <span className="text-gray-900 font-semibold">{dedupRatio}%</span></>
            )}
            . A ratio approaching 100% would mean the hash dedup has stopped working.
          </>
        ) : (
          <>Nothing captured for this game.</>
        )}
      </p>

      {tiedTime && (
        <div className="mb-3 rounded-lg border border-amber-border bg-amber-dim px-4 py-3">
          <p className="text-sm text-amber font-medium">
            All {snapshots.length} snapshots share one <span className="font-mono">fetched_at</span>
          </p>
          <p className="text-xs text-secondary mt-1 max-w-3xl">
            They were written in a single batch, so the table records no capture sequence and no
            gaps between them. The order below is inferred from each payload&apos;s accumulated stat
            total, which can only grow as a game progresses — treat the sequence numbers and the
            diffs as indicative, not as evidence of what arrived when. A change showing a stat going
            <em> down</em> is the inference being wrong, not a stat that decreased. Δt is shown as —
            rather than 0ms, which would be misleading.
          </p>
        </div>
      )}

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
                <th colSpan={3} className={TH_GROUP}>Sequence</th>
                <th colSpan={2} className={`${TH_GROUP} border-l border-border`}>Identity</th>
                <th colSpan={2} className={`${TH_GROUP} border-l border-border`}>Content</th>
                <th colSpan={2} className={`${TH_GROUP} border-l border-border`}>Capture</th>
              </tr>
              <tr className="border-b border-border bg-gray-50">
                <th className={`${TH} text-right`} title={tiedTime ? 'Inferred sequence — ordered by accumulated stat total, since every row shares one fetched_at' : 'Capture order'}>
                  {tiedTime ? '# (proxy)' : '#'}
                </th>
                <th className={TH}>fetched_at</th>
                <th className={TH}>Δt</th>
                <th className={TH}>payload_hash</th>
                <th className={TH}>id</th>
                <th className={`${TH} text-right`}>players</th>
                <th className={TH}>changed</th>
                <th className={TH}>claimed</th>
                <th className={TH}>source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, ordinal, prev, changes }, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className={`${TD} text-right text-muted tabular-nums`}>{ordinal}</td>
                  <td className={TD}>{fmtTime(row.fetched_at)}</td>
                  <td className={`${TD} text-muted`}>
                    {tiedTime ? '—' : fmtDelta(row.fetched_at, prev?.fetched_at ?? null)}
                  </td>
                  <td className={`${TD} text-secondary`} title={row.payload_hash ?? undefined}>
                    {row.payload_hash ? row.payload_hash.slice(0, 12) : '—'}
                  </td>
                  <td className={`${TD} text-muted`}>{row.id.slice(0, 8)}</td>
                  <td className={`${TD} text-right`}>{row.player_count ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {changes === null ? (
                      <span className="text-muted">first snapshot — nothing to compare</span>
                    ) : changes.length === 0 ? (
                      // Stored because the hash differed, yet nothing changed in
                      // the stats — the hash is seeing something this diff isn't.
                      <span className="text-amber">no stat changed, but the hash differed</span>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-gray-900 hover:text-amber font-mono">
                          {changes.length} {changes.length === 1 ? 'change' : 'changes'}
                        </summary>
                        <div className="mt-2 border border-border rounded-md bg-white p-2 w-[min(34rem,70vw)] max-h-72 overflow-y-auto">
                          {changes.map((c, n) => (
                            <div key={`${c.player}-${c.stat}-${n}`} className="flex items-baseline gap-2 font-mono text-xs py-0.5">
                              <span className="text-gray-900 min-w-[9rem]">{c.player}</span>
                              <span className="text-muted min-w-[7rem]">{c.stat}</span>
                              <span className="text-muted">{c.prev}</span>
                              <span className="text-muted">→</span>
                              <span className="text-success font-semibold">{c.curr}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </td>
                  <td className="px-3 py-2"><ClaimedPill claimedAt={row.claimed_at} /></td>
                  <td className="px-3 py-2"><SourcePill source={row.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
