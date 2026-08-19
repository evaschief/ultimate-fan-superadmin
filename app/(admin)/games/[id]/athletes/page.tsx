import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';

type Credit = {
  athlete_id: string;
  athlete_name: string;
  reason: string;
  points: number;
  period: number | null;
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
      .select('athlete_id,athlete_name,reason,points,period,created_at')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false }),
  ]);
  const credits = (result.data ?? []) as Credit[];
  const athletes = new Map<string, { id: string; name: string; total: number; credits: number; latest: Credit }>();
  for (const credit of credits) {
    const current = athletes.get(credit.athlete_id);
    if (current) {
      current.total += Number(credit.points);
      current.credits++;
    } else {
      athletes.set(credit.athlete_id, { id: credit.athlete_id, name: credit.athlete_name, total: Number(credit.points), credits: 1, latest: credit });
    }
  }
  const totals = Array.from(athletes.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="athletes" counts={counts} />
      <p className="text-sm text-secondary mb-4">Every Ultimate Fan point awarded to an athlete in this game. This is the live scoring ledger, not a user lineup or balance.</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="card px-4 py-3"><div className="text-xs text-muted uppercase tracking-wider">Athletes credited</div><div className="text-xl font-semibold text-gray-900 mt-1">{totals.length}</div></div>
        <div className="card px-4 py-3"><div className="text-xs text-muted uppercase tracking-wider">Points awarded</div><div className="text-xl font-semibold text-gray-900 mt-1">{credits.reduce((sum, credit) => sum + Number(credit.points), 0).toLocaleString()}</div></div>
        <div className="card px-4 py-3"><div className="text-xs text-muted uppercase tracking-wider">Credit entries</div><div className="text-xl font-semibold text-gray-900 mt-1">{credits.length}</div></div>
      </div>
      <div className="card p-0 overflow-hidden mb-5">
        <div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Athlete totals</div>
        <table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Athlete</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Fantasy points</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Credits</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Latest reason</th></tr></thead><tbody>
          {totals.map((athlete, index) => <tr key={athlete.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-medium text-gray-900">{athlete.name}</td><td className={`px-3 py-2 text-right font-mono font-medium ${athlete.total >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(athlete.total)}</td><td className="px-3 py-2 text-right text-secondary">{athlete.credits}</td><td className="px-3 py-2 text-secondary">{athlete.latest.reason}</td></tr>)}
          {totals.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">No athlete credits yet. New live scoring events will appear here.</td></tr>}
        </tbody></table>
      </div>
      <div className="card p-0 overflow-hidden"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Credit activity — newest first</div><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Time</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Period</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Athlete</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Reason</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Points</th></tr></thead><tbody>
        {credits.map((credit, index) => <tr key={`${credit.athlete_id}-${credit.created_at}-${index}`} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-mono text-xs text-secondary">{new Date(credit.created_at).toLocaleTimeString()}</td><td className="px-3 py-2 text-secondary">{credit.period == null ? '—' : `Q${credit.period}`}</td><td className="px-3 py-2 font-medium text-gray-900">{credit.athlete_name}</td><td className="px-3 py-2 text-secondary">{credit.reason}</td><td className={`px-3 py-2 text-right font-mono ${credit.points >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(Number(credit.points))}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}
