import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import {
  CaptureEmpty, ClaimedPill, SourcePill, TD, TH, TH_GROUP, fmtTime, getCaptureStart,
} from '../rawCapture';

// raw_plays — one row per play the provider returned, stored verbatim. This is
// the "did it reach us at all" page: the count against the gamebook is the
// whole acceptance check, which is why the header leads with it and the id range.
//
// Keyed on game_id, not game_code (see rawCapture.tsx).

interface PlayRow {
  id: string;
  bdl_play_id: number | null;
  fetched_at: string | null;
  claimed_at: string | null;
  source: string | null;
  payload: Record<string, unknown> | null;
}

async function getPlays(gameId: string): Promise<PlayRow[]> {
  const { data } = await supabase
    .from('raw_plays')
    .select('id, bdl_play_id, fetched_at, claimed_at, source, payload')
    .eq('game_id', gameId)
    .order('bdl_play_id', { ascending: false })
    .limit(3000);
  return (data ?? []) as PlayRow[];
}

/** Values lifted out of the BDL play object for the readable columns. */
function lift(payload: Record<string, unknown> | null) {
  const p = payload ?? {};
  // team is null on non-team plays such as END GAME, so this can't assume an object.
  const team = p.team && typeof p.team === 'object'
    ? (p.team as Record<string, unknown>).abbreviation
    : null;
  return {
    period: typeof p.period === 'number' ? p.period : null,
    clock: typeof p.clock_display === 'string' ? p.clock_display : null,
    team: typeof team === 'string' ? team : null,
    typeText: typeof p.type_text === 'string' ? p.type_text : null,
    text: typeof p.text === 'string' ? p.text : null,
    homeScore: typeof p.home_score === 'number' ? p.home_score : null,
    awayScore: typeof p.away_score === 'number' ? p.away_score : null,
    scoring: p.scoring_play === true,
  };
}

export default async function RawPlaysPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [counts, plays, captureStart] = await Promise.all([
    getEventCounts(game.id),
    getPlays(game.id),
    getCaptureStart(),
  ]);

  const ids = plays.map(p => p.bdl_play_id).filter((n): n is number => typeof n === 'number');
  const unclaimed = plays.filter(p => !p.claimed_at).length;
  const reconstructed = plays.filter(p => p.source && p.source !== 'live').length;

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="raw-plays" counts={counts} />

      <p className="text-secondary text-sm mb-1">
        Every play the provider returned for this game, stored verbatim as{' '}
        <span className="font-mono">raw_plays</span> — newest first.
      </p>
      <p className="text-muted text-xs mb-3">
        {plays.length > 0 ? (
          <>
            <span className="text-gray-900 font-semibold">{plays.length} plays</span>
            {ids.length > 0 && (
              <> · ids <span className="font-mono">{Math.min(...ids)}–{Math.max(...ids)}</span></>
            )}
            {unclaimed > 0 && <> · <span className="text-amber">{unclaimed} unclaimed</span></>}
            {reconstructed > 0 && (
              <> · <span className="text-amber">{reconstructed} reconstructed, not captured live</span></>
            )}
            {' '}— compare the count against the gamebook to confirm nothing was dropped.
          </>
        ) : (
          <>Nothing captured for this game.</>
        )}
      </p>

      {plays.length === 0 ? (
        <CaptureEmpty
          table="raw_plays"
          gameTime={game.scheduled_at ?? game.created_at}
          captureStart={captureStart}
        />
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th colSpan={2} className={TH_GROUP}>Identity</th>
                <th colSpan={3} className={`${TH_GROUP} border-l border-border`}>Capture</th>
                <th colSpan={6} className={`${TH_GROUP} border-l border-border`}>Play</th>
                <th className={`${TH_GROUP} border-l border-border`}>Raw</th>
              </tr>
              <tr className="border-b border-border bg-gray-50">
                <th className={TH}>bdl_play_id</th>
                <th className={TH}>id</th>
                <th className={TH}>fetched_at</th>
                <th className={TH}>claimed</th>
                <th className={TH}>source</th>
                <th className={TH}>period</th>
                <th className={TH}>clock</th>
                <th className={TH}>team</th>
                <th className={TH}>type</th>
                <th className={TH}>text</th>
                <th className={TH}>score</th>
                <th className={TH}>payload</th>
              </tr>
            </thead>
            <tbody>
              {plays.map((row, i) => {
                const v = lift(row.payload);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className={TD}>{row.bdl_play_id ?? '—'}</td>
                    <td className={`${TD} text-muted`}>{row.id.slice(0, 8)}</td>
                    <td className={`${TD} text-muted`}>{fmtTime(row.fetched_at)}</td>
                    <td className="px-3 py-2"><ClaimedPill claimedAt={row.claimed_at} /></td>
                    <td className="px-3 py-2"><SourcePill source={row.source} /></td>
                    <td className={TD}>{v.period ?? '—'}</td>
                    <td className={TD}>{v.clock ?? '—'}</td>
                    <td className={TD}>{v.team ?? <span className="text-muted">—</span>}</td>
                    <td className={`${TD} ${v.scoring ? 'text-success font-semibold' : ''}`}>
                      {v.typeText ?? '—'}
                    </td>
                    {/* The one column allowed to wrap — a play description is the
                        point of the row, and truncating it hides the detail. */}
                    <td className="px-3 py-2 text-xs text-gray-900 min-w-[22rem]">
                      {v.text ?? <span className="text-muted">—</span>}
                    </td>
                    <td className={`${TD} text-secondary`}>
                      {v.awayScore ?? '—'} – {v.homeScore ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-secondary hover:text-amber font-mono">
                          view
                        </summary>
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
