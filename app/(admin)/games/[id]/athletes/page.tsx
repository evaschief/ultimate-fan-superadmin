import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';

type Credit = {
  id: string;
  game_id: string;
  game_athlete_id: string | null;
  athlete_id: string;
  athlete_name: string;
  reason: string;
  points: number;
  period: number | null;
  source_event_id: string | null;
  source: 'live' | 'backfill';
  source_detail: { team?: string } | null;
  created_at: string;
};

function signedPoints(points: number) {
  return `${points >= 0 ? '+' : ''}${points.toLocaleString()}`;
}

export default async function GameAthletesPage({ params, searchParams }: { params: { id: string }; searchParams?: { view?: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();
  const [counts, result, rosterResult] = await Promise.all([
    getEventCounts(game.id),
    supabase
      .from('athlete_fantasy_credits')
      .select('id,game_id,game_athlete_id,athlete_id,athlete_name,reason,points,period,source_event_id,source,source_detail,created_at')
      .eq('game_id', game.id)
      .order('created_at', { ascending: false }),
    supabase.from('games').select('roster').eq('id', game.id).maybeSingle(),
  ]);
  const credits = (result.data ?? []) as Credit[];
  const athleteIds = Array.from(new Set(credits.map((credit) => credit.athlete_id)));
  const { data: historyData } = athleteIds.length
    ? await supabase
      .from('athlete_fantasy_credits')
      .select('id,game_id,game_athlete_id,athlete_id,athlete_name,reason,points,period,source_event_id,source,source_detail,created_at')
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
  const byPlayer = Array.from(new Map(credits.map((credit) => [credit.athlete_id, credit])).values())
    .map((credit) => ({ credit, gamePoints: credits.filter((item) => item.athlete_id === credit.athlete_id).reduce((sum, item) => sum + Number(item.points), 0) }))
    .sort((a, b) => a.credit.athlete_name.split('.').slice(-1)[0].localeCompare(b.credit.athlete_name.split('.').slice(-1)[0]) || a.credit.athlete_name.localeCompare(b.credit.athlete_name));
  const hasBackfill = credits.some((credit) => credit.source === 'backfill');
  const roster = (rosterResult.data?.roster ?? {}) as { teams?: Record<string, { roster?: Array<Record<string, unknown>> }> };
  const rosterPlayers = Object.values(roster.teams ?? {}).flatMap((team) => team.roster ?? []);
  const rosterColumns = Array.from(new Set(rosterPlayers.flatMap((player) => Object.keys(player))));
  const view = searchParams?.view === 'players' || searchParams?.view === 'roster' ? searchParams.view : 'feed';
  const rosterValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="athletes" counts={counts} />
      <p className="text-sm text-secondary mb-4">Every Ultimate Fan point awarded to an athlete in this game. This is the scoring ledger, not a user lineup or balance.</p>
      {hasBackfill && <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This historical game is populated from its stored final provider snapshot. It shows reconstructed athlete totals, not the original live, play-by-play scoring timeline.</div>}
      <div className="border-b border-border flex items-center gap-1 mb-4"><Link href={`/games/${game.id}/athletes`} className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${view === 'feed' ? 'border-amber text-amber' : 'border-transparent text-secondary hover:text-gray-900'}`}>Live credit feed</Link><Link href={`/games/${game.id}/athletes?view=players`} className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${view === 'players' ? 'border-amber text-amber' : 'border-transparent text-secondary hover:text-gray-900'}`}>By player</Link><Link href={`/games/${game.id}/athletes?view=roster`} className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${view === 'roster' ? 'border-amber text-amber' : 'border-transparent text-secondary hover:text-gray-900'}`}>Game roster</Link></div>
      {view === 'feed' ? <div className="card p-0 overflow-x-auto"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">athlete_fantasy_credits — stored columns, newest first</div><table className="w-full text-sm whitespace-nowrap"><thead><tr className="border-b border-border">{['id','game_id','game_athlete_id','athlete_id','athlete_name','reason','points','period','source_event_id','source','source_detail','created_at'].map((column) => <th key={column} className="text-left px-3 py-2 text-xs text-muted uppercase">{column}</th>)}</tr></thead><tbody>
        {credits.map((credit, index) => {
          const history = athleteHistory.get(credit.athlete_id);
          return <tr key={credit.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-mono text-xs">{credit.id}</td><td className="px-3 py-2 font-mono text-xs">{credit.game_id}</td><td className="px-3 py-2 font-mono text-xs">{credit.game_athlete_id ?? '—'}</td><td className="px-3 py-2 font-mono text-xs">{credit.athlete_id}</td><td className="px-3 py-2 font-medium"><details><summary className="cursor-pointer text-amber hover:underline">{credit.athlete_name}</summary><div className="mt-2 min-w-64 rounded border border-border bg-white p-2 text-xs font-normal text-secondary shadow-sm"><div className="mb-1 font-medium text-gray-900">Total fantasy points: <span className={history && history.total >= 0 ? 'text-success' : 'text-danger'}>{signedPoints(history?.total ?? 0)}</span></div><div className="text-muted uppercase tracking-wide mb-1">Game history</div>{Array.from(history?.games.entries() ?? []).map(([historyGameId, points]) => <div key={historyGameId} className="flex justify-between gap-3 py-0.5"><span>{gameLabels.get(historyGameId) ?? historyGameId}</span><span className={points >= 0 ? 'text-success font-mono' : 'text-danger font-mono'}>{signedPoints(points)}</span></div>)}</div></details></td><td className="px-3 py-2 text-secondary">{credit.reason}</td><td className={`px-3 py-2 text-right font-mono ${credit.points >= 0 ? 'text-success' : 'text-danger'}`}>{credit.points}</td><td className="px-3 py-2">{credit.period ?? '—'}</td><td className="px-3 py-2 font-mono text-xs">{credit.source_event_id ?? '—'}</td><td className="px-3 py-2">{credit.source}</td><td className="px-3 py-2 font-mono text-xs">{JSON.stringify(credit.source_detail ?? {})}</td><td className="px-3 py-2 font-mono text-xs">{credit.created_at}</td></tr>;
        })}
        {credits.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No athlete credits yet. New live scoring events will appear here.</td></tr>}
      </tbody></table></div> : view === 'players' ? <div className="card p-0 overflow-hidden"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Players — last name A–Z</div><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted uppercase">Athlete</th><th className="text-right px-3 py-2 text-xs text-muted uppercase">This game</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Team</th><th className="text-left px-3 py-2 text-xs text-muted uppercase">Source</th></tr></thead><tbody>
        {byPlayer.map(({ credit, gamePoints }, index) => { const history = athleteHistory.get(credit.athlete_id); return <tr key={credit.athlete_id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}><td className="px-3 py-2 font-medium"><details><summary className="cursor-pointer text-amber hover:underline">{credit.athlete_name}</summary><div className="mt-2 min-w-64 rounded border border-border bg-white p-2 text-xs font-normal text-secondary shadow-sm"><div className="mb-1 font-medium text-gray-900">Total fantasy points: <span className={history && history.total >= 0 ? 'text-success' : 'text-danger'}>{signedPoints(history?.total ?? 0)}</span></div><div className="text-muted uppercase tracking-wide mb-1">Game history</div>{Array.from(history?.games.entries() ?? []).map(([historyGameId, points]) => <div key={historyGameId} className="flex justify-between gap-3 py-0.5"><span>{gameLabels.get(historyGameId) ?? historyGameId}</span><span className={points >= 0 ? 'text-success font-mono' : 'text-danger font-mono'}>{signedPoints(points)}</span></div>)}</div></details></td><td className={`px-3 py-2 text-right font-mono ${gamePoints >= 0 ? 'text-success' : 'text-danger'}`}>{signedPoints(gamePoints)}</td><td className="px-3 py-2 text-secondary">{credit.source_detail?.team ?? '—'}</td><td className="px-3 py-2 text-secondary">{credit.source}</td></tr>; })}
        {byPlayer.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">No athlete credits yet. New live scoring events will appear here.</td></tr>}
      </tbody></table></div> : <div className="card p-0 overflow-x-auto"><div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">Games.roster — stored player fields</div><table className="w-full text-sm whitespace-nowrap"><thead><tr className="border-b border-border">{rosterColumns.map((column) => <th key={column} className="text-left px-3 py-2 text-xs text-muted uppercase">{column}</th>)}</tr></thead><tbody>{rosterPlayers.map((player, index) => <tr key={`${String(player.player_id ?? player.fullName ?? index)}`} className={`border-b border-border last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>{rosterColumns.map((column) => <td key={column} className="px-3 py-2 font-mono text-xs text-secondary">{rosterValue(player[column])}</td>)}</tr>)}{rosterPlayers.length === 0 && <tr><td colSpan={Math.max(rosterColumns.length, 1)} className="px-3 py-8 text-center text-muted">This game does not have a stored roster.</td></tr>}</tbody></table></div>}
    </div>
  );
}
