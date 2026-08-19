import { notFound } from 'next/navigation';
import Link from 'next/link';
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
  const hasBackfill = credits.some((credit) => credit.source === 'backfill');

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="athletes" counts={counts} />
      <p className="text-sm text-secondary mb-4">Every Ultimate Fan point awarded to an athlete in this game. This is the scoring ledger, not a user lineup or balance.</p>
      {hasBackfill && <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This historical game is populated from its stored final provider snapshot. It shows reconstructed athlete totals, not the original live, play-by-play scoring timeline.</div>}
      <div className="card p-0 overflow-hidden"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Credit activity — newest first</div><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Time</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Period</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Athlete</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Team</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Source</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Reason</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Points</th></tr></thead><tbody>
        {credits.map((credit, index) => <tr key={`${credit.athlete_id}-${credit.created_at}-${index}`} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-mono text-xs text-secondary">{new Date(credit.created_at).toLocaleTimeString()}</td><td className="px-3 py-2 text-secondary">{credit.period == null ? '—' : `Q${credit.period}`}</td><td className="px-3 py-2 font-medium"><Link href={`/athletes/${encodeURIComponent(credit.athlete_id)}`} className="text-amber hover:underline">{credit.athlete_name}</Link></td><td className="px-3 py-2 text-secondary">{credit.source_detail?.team ?? '—'}</td><td className="px-3 py-2 text-secondary">{credit.source}</td><td className="px-3 py-2 text-secondary">{credit.reason}</td><td className={`px-3 py-2 text-right font-mono ${credit.points >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(Number(credit.points))}</td></tr>)}
        {credits.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No athlete credits yet. New live scoring events will appear here.</td></tr>}
      </tbody></table></div>
    </div>
  );
}
