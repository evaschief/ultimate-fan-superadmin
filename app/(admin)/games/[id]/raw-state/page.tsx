import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import {
  CaptureEmpty, SourcePill, TD, TH, TH_GROUP, fmtDelta, fmtTime, getCaptureStart,
} from '../rawCapture';

// raw_game_state — one row per poll, undeduplicated, so this is the densest of
// the three and the only place the provider contradicting itself is visible.
//
// Two things are computed here, because as a plain row dump the page hides
// exactly what it exists to show:
//
//  * Period regression — a row whose period is lower than the row before it.
//    That is what fired a spurious period_end mid-quarter. Invisible in a list
//    of a thousand rows; obvious as a highlighted row.
//  * Collapsed runs — consecutive polls where only the clock moved are folded
//    into one row ("× 47 polls, clock 12:04 → 8:31"). A regression always
//    breaks a run, so it can never be hidden inside one.
//
// This table has no claimed_at column, so there is no claimed/unclaimed pill.
// Keyed on game_id, not game_code (see rawCapture.tsx).

interface StateRow {
  id: string;
  status_text: string | null;
  period: number | null;
  clock: string | null;
  fetched_at: string | null;
  source: string | null;
  payload: Record<string, unknown> | null;
}

interface Run {
  first: StateRow;
  last: StateRow;
  count: number;
  period: number | null;
  homeScore: number | null;
  awayScore: number | null;
  isRegression: boolean;
  regressedFrom: number | null;
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

function scores(row: StateRow) {
  const p = row.payload ?? {};
  return {
    home: typeof p.home_team_score === 'number' ? p.home_team_score : null,
    away: typeof p.visitor_team_score === 'number' ? p.visitor_team_score : null,
  };
}

function buildRuns(rows: StateRow[]): Run[] {
  const runs: Run[] = [];
  let prevPeriod: number | null = null;

  for (const row of rows) {
    const { home, away } = scores(row);
    const isRegression =
      row.period != null && prevPeriod != null && row.period < prevPeriod;
    const current = runs[runs.length - 1];

    const sameState =
      current &&
      current.period === row.period &&
      current.homeScore === home &&
      current.awayScore === away &&
      // A regression starts its own run so it is never folded out of sight.
      !isRegression &&
      !current.isRegression;

    if (sameState) {
      current.last = row;
      current.count += 1;
    } else {
      runs.push({
        first: row,
        last: row,
        count: 1,
        period: row.period,
        homeScore: home,
        awayScore: away,
        isRegression,
        regressedFrom: isRegression ? prevPeriod : null,
      });
    }
    if (row.period != null) prevPeriod = row.period;
  }
  return runs;
}

export default async function RawStatePage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [counts, states, captureStart] = await Promise.all([
    getEventCounts(game.id),
    getStates(game.id),
    getCaptureStart(),
  ]);

  const runs = buildRuns(states);
  const regressions = runs.filter(r => r.isRegression);
  const reconstructed = states.filter(s => s.source && s.source !== 'live').length;
  // Newest first for display; runs were built in time order.
  const display = [...runs].reverse();

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="raw-state" counts={counts} />

      <p className="text-secondary text-sm mb-1">
        Every poll of the provider&apos;s game state —{' '}
        <span className="font-mono">raw_game_state</span>, newest first, nothing deduplicated.
      </p>
      <p className="text-muted text-xs mb-3">
        {states.length > 0 ? (
          <>
            <span className="text-gray-900 font-semibold">{states.length.toLocaleString()} polls</span>
            {' '}collapsed into {runs.length.toLocaleString()} state changes
            {regressions.length > 0 ? (
              <> · <span className="text-danger font-semibold">
                {regressions.length} period {regressions.length === 1 ? 'regression' : 'regressions'}
              </span> — the provider reported an earlier period than it had already reported</>
            ) : (
              <> · <span className="text-success">no period regressions</span></>
            )}
            {reconstructed > 0 && (
              <> · <span className="text-amber">{reconstructed} reconstructed, not captured live</span></>
            )}
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
                <th colSpan={2} className={TH_GROUP}>Time</th>
                <th colSpan={3} className={`${TH_GROUP} border-l border-border`}>State</th>
                <th colSpan={1} className={`${TH_GROUP} border-l border-border`}>Score</th>
                <th className={`${TH_GROUP} border-l border-border`}>Capture</th>
              </tr>
              <tr className="border-b border-border bg-gray-50">
                <th className={TH}>fetched_at</th>
                <th className={TH}>Δt</th>
                <th className={TH}>status_text</th>
                <th className={TH}>period</th>
                <th className={TH}>clock</th>
                <th className={TH}>away – home</th>
                <th className={TH}>source</th>
              </tr>
            </thead>
            <tbody>
              {display.map((run, i) => {
                const prevRun = display[i + 1]; // one earlier in time
                return (
                  <tr
                    key={run.first.id}
                    className={
                      run.isRegression
                        ? 'border-b border-danger/30 bg-danger/5'
                        : `border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`
                    }
                  >
                    <td className={TD}>
                      {fmtTime(run.first.fetched_at)}
                      {run.count > 1 && (
                        <span className="text-muted"> → {fmtTime(run.last.fetched_at)}</span>
                      )}
                    </td>
                    <td className={`${TD} text-muted`}>
                      {fmtDelta(run.first.fetched_at, prevRun?.last.fetched_at ?? null)}
                    </td>
                    <td className={TD}>
                      {run.first.status_text ?? '—'}
                      {run.count > 1 && (
                        <span className="ml-2 text-xs bg-gray-100 text-muted border border-border px-1.5 py-0.5 rounded font-semibold">
                          × {run.count} polls
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      {run.isRegression ? (
                        <span className="text-danger font-semibold" title={`Period went backwards, from ${run.regressedFrom} to ${run.period}`}>
                          {run.period} ← was {run.regressedFrom}
                        </span>
                      ) : (
                        run.period ?? '—'
                      )}
                    </td>
                    <td className={TD}>
                      {run.count > 1
                        ? <>{run.first.clock ?? '—'} <span className="text-muted">→</span> {run.last.clock ?? '—'}</>
                        : (run.first.clock ?? '—')}
                    </td>
                    <td className={`${TD} text-secondary`}>
                      {run.awayScore ?? '—'} – {run.homeScore ?? '—'}
                    </td>
                    <td className="px-3 py-2"><SourcePill source={run.first.source} /></td>
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
