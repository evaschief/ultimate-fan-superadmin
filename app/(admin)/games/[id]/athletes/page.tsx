import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';

type Credit = {
  athlete_id: string;
  athlete_name: string;
  reason: string;
  points: number;
  period: number | null;
  source: 'live' | 'backfill';
  source_detail: { team?: string } | null;
  created_at: string;
};

function signedPoints(points: number) {
  return `${points >= 0 ? '+' : ''}${points.toLocaleString()}`;
}

export default async function GameAthletesPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();
  const [counts, result] = await Promise.all([
    getEventCounts(game.id),
    supabase
      .from('athlete_fantasy_credits')
      .select('athlete_id,athlete_name,reason,points,period,source,source_detail,created_at')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false }),
  ]);
  const credits = (result.data ?? []) as Credit[];
  const athleteIds = Array.from(new Set(credits.map((credit) => credit.athlete_id)));
  const { data: historyData } = athleteIds.length
    ? await supabase
      .from('athlete_fantasy_credits')
      .select('game_id,athlete_id,athlete_name,reason,points,period,source,source_detail,created_at')
      .in('athlete_id', athleteIds)
    : { data: [] };
  const allCredits = (historyData ?? []) as Array<Credit & { game_id: string }>;
  const gameIds = Array.from(new Set(allCredits.map((credit) => credit.game_id)));
  const { data: historyGames } = gameIds.length
    ? await supabase.from('games').select('id,away_team,home_team,scheduled_at').in('id', gameIds)
    : { data: [] };
  const gameLabels = new Map((historyGames ?? []).map((historyGame) => [
    historyGame.id,
    `${historyGame.away_team ?? '—'} at ${historyGame.home_team ?? '—'}${historyGame.scheduled_at ? ` · ${new Date(historyGame.scheduled_at).toLocaleDateString()}` : ''}`,
  ]));
  const athleteHistory = new Map<string, { total: number; games: Map<string, number> }>();
  for (const historyCredit of allCredits) {
    const current = athleteHistory.get(historyCredit.athlete_id) ?? { total: 0, games: new Map<string, number>() };
    current.total += Number(historyCredit.points);
    current.games.set(historyCredit.game_id, (current.games.get(historyCredit.game_id) ?? 0) + Number(historyCredit.points));
    athleteHistory.set(historyCredit.athlete_id, current);
  }
  const hasBackfill = credits.some((credit) => credit.source === 'backfill');

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="athletes" counts={counts} />
      <p className="text-sm text-secondary mb-4">Every Ultimate Fan point awarded to an athlete in this game. This is the scoring ledger, not a user lineup or balance.</p>
      {hasBackfill && <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This historical game is populated from its stored final provider snapshot. It shows reconstructed athlete totals, not the original live, play-by-play scoring timeline.</div>}
      <div className="card p-0 overflow-hidden"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Credit activity — newest first</div><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Time</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Period</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Athlete</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Team</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Source</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Reason</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Points</th></tr></thead><tbody>
        {credits.map((credit, index) => {
          const history = athleteHistory.get(credit.athlete_id);
          return <tr key={`${credit.athlete_id}-${credit.created_at}-${index}`} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-mono text-xs text-secondary">{new Date(credit.created_at).toLocaleTimeString()}</td><td className="px-3 py-2 text-secondary">{credit.period == null ? '—' : `Q${credit.period}`}</td><td className="px-3 py-2 font-medium"><details><summary className="cursor-pointer text-amber hover:underline">{credit.athlete_name}</summary><div className="mt-2 min-w-64 rounded border border-border bg-white p-2 text-xs font-normal text-secondary shadow-sm"><div className="mb-1 font-medium text-gray-900">Total fantasy points: <span className={history && history.total >= 0 ? 'text-success' : 'text-danger'}>{signedPoints(history?.total ?? 0)}</span></div><div className="text-muted uppercase tracking-wide mb-1">Game history</div>{Array.from(history?.games.entries() ?? []).map(([historyGameId, points]) => <div key={historyGameId} className="flex justify-between gap-3 py-0.5"><span>{gameLabels.get(historyGameId) ?? historyGameId}</span><span className={points >= 0 ? 'text-success font-mono' : 'text-danger font-mono'}>{signedPoints(points)}</span></div>)}</div></details></td><td className="px-3 py-2 text-secondary">{credit.source_detail?.team ?? '—'}</td><td className="px-3 py-2 text-secondary">{credit.source}</td><td className="px-3 py-2 text-secondary">{credit.reason}</td><td className={`px-3 py-2 text-right font-mono ${credit.points >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(Number(credit.points))}</td></tr>;
        })}
        {credits.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No athlete credits yet. New live scoring events will appear here.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
