import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Credit = { game_id: string; athlete_name: string; reason: string; points: number; source: 'live' | 'backfill'; created_at: string; };
type Game = { id: string; away_team: string | null; home_team: string | null; scheduled_at: string | null; };

function signedPoints(points: number) { return `${points >= 0 ? '+' : ''}${points.toLocaleString()}`; }

export default async function AthleteHistoryPage({ params }: { params: { athleteId: string } }) {
  const athleteId = decodeURIComponent(params.athleteId);
  const { data } = await supabase.from('athlete_fantasy_credits')
    .select('game_id,athlete_name,reason,points,source,created_at').eq('athlete_id', athleteId).order('created_at', { ascending: false });
  const credits = (data ?? []) as Credit[];
  if (credits.length === 0) notFound();

  const gameIds = Array.from(new Set(credits.map((credit) => credit.game_id)));
  const { data: gameData } = await supabase.from('games').select('id,away_team,home_team,scheduled_at').in('id', gameIds);
  const games = new Map(((gameData ?? []) as Game[]).map((game) => [game.id, game]));
  const history = new Map<string, { points: number; credits: number; latest: Credit }>();
  for (const credit of credits) {
    const existing = history.get(credit.game_id);
    if (existing) { existing.points += Number(credit.points); existing.credits += 1; }
    else history.set(credit.game_id, { points: Number(credit.points), credits: 1, latest: credit });
  }
  const gameHistory = Array.from(history.entries()).sort(([, a], [, b]) => b.latest.created_at.localeCompare(a.latest.created_at));
  const totalPoints = credits.reduce((total, credit) => total + Number(credit.points), 0);
  const athleteName = credits[0].athlete_name;
  const gameLabel = (gameId: string) => {
    const game = games.get(gameId);
    return game ? `${game.away_team} at ${game.home_team}` : gameId;
  };

  return <div className="p-5 pb-10">
    <Link href="/games" className="text-xs text-muted hover:text-gray-900">← Games</Link>
    <h1 className="mt-2 text-xl font-semibold text-gray-900">{athleteName}</h1>
    <p className="mt-1 text-sm text-secondary">Fantasy-credit history across all recorded games.</p>
    <div className="grid grid-cols-2 gap-3 mt-5 mb-5 max-w-lg">
      <div className="card px-4 py-3"><div className="text-xs text-muted uppercase tracking-wider">Total fantasy points</div><div className={`text-xl font-semibold mt-1 ${totalPoints >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(totalPoints)}</div></div>
      <div className="card px-4 py-3"><div className="text-xs text-muted uppercase tracking-wider">Games credited</div><div className="text-xl font-semibold text-gray-900 mt-1">{gameHistory.length}</div></div>
    </div>
    <div className="card p-0 overflow-hidden mb-5"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Game history</div><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Game</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Date</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Points</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Credits</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Source</th></tr></thead><tbody>
      {gameHistory.map(([gameId, item], index) => <tr key={gameId} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-medium"><Link href={`/games/${gameId}/athletes`} className="text-amber hover:underline">{gameLabel(gameId)}</Link></td><td className="px-3 py-2 text-secondary">{games.get(gameId)?.scheduled_at ? new Date(games.get(gameId)!.scheduled_at!).toLocaleDateString() : '—'}</td><td className={`px-3 py-2 text-right font-mono font-medium ${item.points >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(item.points)}</td><td className="px-3 py-2 text-right text-secondary">{item.credits}</td><td className="px-3 py-2 text-secondary">{item.latest.source}</td></tr>)}
    </tbody></table></div>
    <div className="card p-0 overflow-hidden"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Credit activity — newest first</div><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Time</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Game</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Reason</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">Points</th></tr></thead><tbody>
      {credits.map((credit, index) => <tr key={`${credit.game_id}-${credit.created_at}-${index}`} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-mono text-xs text-secondary">{new Date(credit.created_at).toLocaleString()}</td><td className="px-3 py-2"><Link href={`/games/${credit.game_id}/athletes`} className="text-amber hover:underline">{gameLabel(credit.game_id)}</Link></td><td className="px-3 py-2 text-secondary">{credit.reason}</td><td className={`px-3 py-2 text-right font-mono ${credit.points >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(Number(credit.points))}</td></tr>)}
    </tbody></table></div>
  </div>;
}
