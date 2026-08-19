import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import {
  CaptureEmpty, ClaimedPill, SourcePill, TD, TH, TH_GROUP, fmtTime, getCaptureStart,
} from '../rawCapture';
import FantasyScoringTable from './FantasyScoringTable';

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

interface PayloadChange {
  team: string;
  player: string;
  stat: string;
  before: string;
  after: string;
}

interface DisplayRow {
  snapshot: SnapshotRow;
  activity: PayloadChange | null;
  showSnapshot: boolean;
}

interface PayloadPlayerRow {
  team: string;
  player: string;
  stats: Array<{ name: string; value: string }>;
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

// These fields identify a player rather than describe an in-game stat. The
// provider has two payload shapes: historical BDL rows use nested player/team
// objects, while live capture uses NormalizedPlayer's playerName/teamAbv fields.
const IDENTITY_KEYS = new Set(['team', 'player', 'playerId', 'playerName', 'teamAbv']);

function playerIdentity(entry: Record<string, unknown>): { team: string; player: string } {
  const nestedPlayer = entry.player && typeof entry.player === 'object'
    ? (entry.player as Record<string, unknown>).last_name
    : null;
  const nestedTeam = entry.team && typeof entry.team === 'object'
    ? (entry.team as Record<string, unknown>).abbreviation
    : null;
  return {
    team: (typeof nestedTeam === 'string' && nestedTeam) ||
      (typeof entry.teamAbv === 'string' && entry.teamAbv) || '—',
    player: (typeof nestedPlayer === 'string' && nestedPlayer) ||
      (typeof entry.playerName === 'string' && entry.playerName) || '(unnamed)',
  };
}

function flattenPayload(payload: unknown): Map<string, { team: string; player: string; stats: Map<string, unknown> }> {
  const players = new Map<string, { team: string; player: string; stats: Map<string, unknown> }>();
  if (!Array.isArray(payload)) return players;

  for (const value of payload) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    const { team, player } = playerIdentity(entry);
    const key = `${team}\u0000${player}`;
    const stats = players.get(key)?.stats ?? new Map<string, unknown>();
    for (const [name, stat] of Object.entries(entry)) {
      if (!IDENTITY_KEYS.has(name)) stats.set(name, stat);
    }
    players.set(key, { team, player, stats });
  }
  return players;
}

function formatStatName(name: string): string {
  return name.replaceAll('_', ' ');
}

function latestPayloadPlayers(payload: unknown): PayloadPlayerRow[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((value): value is Record<string, unknown> => !!value && typeof value === 'object')
    .map(entry => {
      const { team, player } = playerIdentity(entry);
      const stats = Object.entries(entry)
        .filter(([name]) => !IDENTITY_KEYS.has(name))
        .map(([name, value]) => ({
          name: formatStatName(name),
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        }));
      return { team, player, stats };
    })
    .sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player));
}

function payloadChanges(current: unknown, previous: unknown): PayloadChange[] {
  const before = flattenPayload(previous);
  const after = flattenPayload(current);
  const changes: PayloadChange[] = [];

  for (const [key, currentPlayer] of Array.from(after.entries())) {
    const previousPlayer = before.get(key);
    for (const [stat, value] of Array.from(currentPlayer.stats.entries())) {
      const oldValue = previousPlayer?.stats.get(stat);
      if (JSON.stringify(value) === JSON.stringify(oldValue)) continue;
      changes.push({
        team: currentPlayer.team,
        player: currentPlayer.player,
        stat: formatStatName(stat),
        before: oldValue === undefined ? '—' : String(oldValue),
        after: String(value),
      });
    }
  }
  return changes.sort((a, b) =>
    a.team.localeCompare(b.team) || a.player.localeCompare(b.player) || a.stat.localeCompare(b.stat));
}

// Only used to provide a useful order for historical reconstruction rows that
// were inserted with the same fetched_at. Live rows always use their actual
// capture timestamps; this fallback is explicitly labelled in the UI.
function statTotal(payload: unknown): number {
  let total = 0;
  for (const { stats } of Array.from(flattenPayload(payload).values())) {
    for (const value of Array.from(stats.values())) if (typeof value === 'number') total += value;
  }
  return total;
}

export default async function RawSnapshotsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { view?: string };
}) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [counts, snapshots, captureStart] = await Promise.all([
    getEventCounts(game.id),
    getSnapshots(game.id),
    getCaptureStart(),
  ]);

  const tiedTimes = snapshots.length > 1 && new Set(snapshots.map(row => row.fetched_at)).size <= 1;
  const ordered = tiedTimes
    ? [...snapshots].sort((a, b) =>
        statTotal(a.payload) - statTotal(b.payload) ||
        (a.player_count ?? 0) - (b.player_count ?? 0) ||
        (a.payload_hash ?? '').localeCompare(b.payload_hash ?? ''))
    : snapshots;
  const rows = ordered.map((row, index) => ({
    row,
    changes: index === 0 ? [] : payloadChanges(row.payload, ordered[index - 1].payload),
    isBaseline: index === 0,
  })).reverse();
  const displayRows: DisplayRow[] = [];
  for (const { row, changes, isBaseline } of rows) {
    const activities = isBaseline || changes.length === 0 ? [null] : changes;
    activities.forEach((activity, index) => {
      displayRows.push({ snapshot: row, activity, showSnapshot: index === 0 });
    });
  }
  const view = searchParams?.view === 'totals' ? 'totals' : 'changes';
  const latestSnapshot = rows[0]?.row ?? null;
  const latestPlayers = latestPayloadPlayers(latestSnapshot?.payload);

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="raw-snapshots" counts={counts} />

      <div className="flex items-center gap-1 border-b border-border mb-4">
        <Link
          href={`/games/${game.id}/raw-snapshots`}
          className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${view === 'changes' ? 'border-amber text-amber' : 'border-transparent text-secondary hover:text-gray-900'}`}
        >
          Changes
        </Link>
        <Link
          href={`/games/${game.id}/raw-snapshots?view=totals`}
          className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${view === 'totals' ? 'border-amber text-amber' : 'border-transparent text-secondary hover:text-gray-900'}`}
        >
          Latest payload totals
        </Link>
      </div>

      <p className="text-secondary text-sm mb-1">
        {view === 'changes' ? (
          <>Stat changes between consecutive stored provider payloads — <span className="font-mono">raw_stat_snapshots</span>, newest first.</>
        ) : (
          <>Every player stat in the latest stored provider payload — no Ultimate Fan fantasy scoring is applied here.</>
        )}
      </p>
      <p className="text-muted text-xs mb-3">
        {snapshots.length > 0 ? (
          <>
            <span className="text-gray-900 font-semibold">{snapshots.length} stored snapshots</span>
            {view === 'changes' ? (
              <>{' '}— Team, Player and Event are read only from each row&apos;s stored <span className="font-mono">payload</span>;
              {' '}expand it to inspect the exact player-stat array.</>
            ) : (
              <>{' '}— expand the payload below to inspect the exact stored player-stat array.</>
            )}
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
      ) : view === 'totals' && latestSnapshot ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] items-start">
          <div className="card p-0 overflow-x-auto">
            <div className="px-4 py-3 border-b border-border text-xs text-secondary">
              Stored row: <span className="font-mono text-gray-900">{latestSnapshot.id}</span>
              {' '}· fetched <span className="font-mono text-gray-900">{fmtTime(latestSnapshot.fetched_at)}</span>
              {' '}· <SourcePill source={latestSnapshot.source} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className={TH}>team</th>
                  <th className={TH}>player</th>
                  <th className={TH}>provider stat totals from payload</th>
                </tr>
              </thead>
              <tbody>
                {latestPlayers.map((player, i) => (
                  <tr key={`${player.team}-${player.player}-${i}`} className={`border-b border-border last:border-0 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className={TD}>{player.team}</td>
                    <td className={TD}>{player.player}</td>
                    <td className={TD}>
                      {player.stats.length
                        ? player.stats.map(stat => `${stat.name}: ${stat.value}`).join(' · ')
                        : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details className="px-4 py-3 border-t border-border">
              <summary className="cursor-pointer text-xs text-secondary hover:text-amber font-mono">view exact payload</summary>
              <pre className="mt-2 bg-white border border-border rounded-md p-2 text-xs font-mono text-gray-900 whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
{JSON.stringify(latestSnapshot.payload, null, 2)}
              </pre>
            </details>
          </div>
          <FantasyScoringTable sport={game.sport} />
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th colSpan={8} className={TH_GROUP}>raw_stat_snapshots stored columns</th>
                <th colSpan={3} className={`${TH_GROUP} border-l border-border`}>Read from payload for display</th>
              </tr>
              <tr className="border-b border-border bg-gray-50">
                <th className={TH}>game_id</th>
                <th className={TH}>fetched_at</th>
                <th className={TH}>payload_hash</th>
                <th className={TH}>id</th>
                <th className={TH}>player_count</th>
                <th className={TH}>claimed_at</th>
                <th className={TH}>source</th>
                <th className={TH}>payload</th>
                <th className={TH}>team</th>
                <th className={TH}>player</th>
                <th className={TH}>event</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(({ snapshot, activity, showSnapshot }, i) => (
                <tr
                  key={`${snapshot.id}-${activity ? `${activity.team}-${activity.player}-${activity.stat}` : 'baseline'}`}
                  className={`border-b border-border last:border-0 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className={`${TD} text-muted`}>{game.id.slice(0, 8)}</td>
                  <td className={TD}>{showSnapshot ? fmtTime(snapshot.fetched_at) : ''}</td>
                  <td className={`${TD} text-secondary`} title={showSnapshot ? snapshot.payload_hash ?? undefined : undefined}>
                    {showSnapshot ? snapshot.payload_hash ?? '—' : ''}
                  </td>
                  <td className={`${TD} text-muted`}>{showSnapshot ? snapshot.id.slice(0, 8) : ''}</td>
                  <td className={TD}>{showSnapshot ? snapshot.player_count ?? '—' : ''}</td>
                  <td className="px-3 py-2">{showSnapshot && <ClaimedPill claimedAt={snapshot.claimed_at} />}</td>
                  <td className="px-3 py-2">{showSnapshot && <SourcePill source={snapshot.source} />}</td>
                  <td className="px-3 py-2">
                    {showSnapshot && (
                      <details>
                        <summary className="cursor-pointer text-xs text-secondary hover:text-amber font-mono">view</summary>
                        <pre className="mt-2 bg-white border border-border rounded-md p-2 text-xs font-mono text-gray-900 whitespace-pre-wrap break-words max-h-80 overflow-y-auto w-[min(58rem,80vw)]">
{JSON.stringify(snapshot.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className={TD}>{activity?.team ?? ''}</td>
                  <td className={TD}>{activity?.player ?? ''}</td>
                  <td className={TD}>
                    {activity ? <>{activity.stat}: <span className="text-muted">{activity.before} →</span> {activity.after}</> : ''}
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
