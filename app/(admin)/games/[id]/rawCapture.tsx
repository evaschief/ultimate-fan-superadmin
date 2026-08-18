import { supabase } from '@/lib/supabase';

// Shared pieces for the three provider-capture tabs (raw_plays,
// raw_stat_snapshots, raw_game_state).
//
// TWO THINGS THAT LOOK LIKE BUGS AND AREN'T, both handled here rather than in
// each page:
//
//  1. All three tables key on `game_id`. The older event tables key on
//     `game_code`, and copying that filter across returns zero rows while
//     looking exactly like capture failed.
//  2. A game played before capture existed legitimately has zero rows. The
//     empty state says which of the two it is, rather than reading as a fault.

/** Earliest capture anywhere, used to tell "predates capture" from "captured nothing". */
export async function getCaptureStart(): Promise<string | null> {
  const { data } = await supabase
    .from('raw_plays')
    .select('fetched_at')
    .order('fetched_at', { ascending: true })
    .limit(1);
  return data?.[0]?.fetched_at ?? null;
}

/** Where a row came from. This is a stored column, so show its value plainly. */
export function SourcePill({ source }: { source: string | null }) {
  if (!source) return <span className="text-muted text-xs">—</span>;
  const isLive = source === 'live';
  return (
    <span
      title={isLive
        ? 'Captured from the provider as the game happened'
        : 'Written after the game; not evidence of the live provider feed'}
      className={isLive
        ? 'text-xs bg-success/10 text-success border border-success/30 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap'
        : 'text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded font-semibold whitespace-nowrap'}
    >
      {source}
    </span>
  );
}

/** Whether the processing side has picked this row up yet. */
export function ClaimedPill({ claimedAt }: { claimedAt: string | null }) {
  return claimedAt ? (
    <span
      title={`claimed ${claimedAt}`}
      className="text-xs bg-success/10 text-success border border-success/30 px-1.5 py-0.5 rounded font-semibold"
    >
      claimed
    </span>
  ) : (
    <span
      title="Written by the capture side but not yet consumed by processing"
      className="text-xs bg-gray-100 text-muted border border-border px-1.5 py-0.5 rounded font-semibold"
    >
      unclaimed
    </span>
  );
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function CaptureEmpty({
  table,
  gameTime,
  captureStart,
}: {
  table: string;
  gameTime: string | null;
  captureStart: string | null;
}) {
  const predates =
    gameTime && captureStart && new Date(gameTime).getTime() < new Date(captureStart).getTime();
  const startLabel = captureStart
    ? new Date(captureStart).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <div className="card text-center py-14 px-6">
      <p className="text-sm font-medium text-gray-900">
        No <span className="font-mono">{table}</span> rows for this game
      </p>
      {predates ? (
        <p className="text-xs text-secondary mt-2 max-w-xl mx-auto">
          This game was played before provider capture existed
          {startLabel && <> — the earliest captured row anywhere is from {startLabel}</>}. Zero rows
          is expected here and is not a capture failure.
        </p>
      ) : (
        <p className="text-xs text-secondary mt-2 max-w-xl mx-auto">
          Capture was already running when this game was played
          {startLabel && <> (earliest captured row anywhere: {startLabel})</>}, so an empty table
          here means nothing was written for this game — worth looking into.
        </p>
      )}
    </div>
  );
}

/** Column header styling shared by the three tables. */
export const TH =
  'text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap';
export const TH_GROUP =
  'text-left px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap';
export const TD = 'px-3 py-2 font-mono text-xs text-gray-900 whitespace-nowrap';
