import { supabase } from '@/lib/supabase';
import DashboardClient from './DashboardClient';
import { GameSession } from '@/types';

async function getActiveGames(): Promise<GameSession[]> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at, scheduled_at')
      .in('status', ['lobby', 'live'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      gameCode: row.join_code ?? row.id,
      sport: row.sport ?? 'NHL',
      status: row.status ?? 'lobby',
      homeTeam: row.home_team ?? '',
      awayTeam: row.away_team ?? '',
      homeScore: row.home_score ?? 0,
      awayScore: row.away_score ?? 0,
      period: row.period ?? '',
      clock: row.clock ?? '',
      createdAt: row.created_at ?? null,
      scheduledAt: row.scheduled_at ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const initialGames = await getActiveGames();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wide">Active Games</h1>
        <p className="text-secondary text-sm mt-1">
          Live view of all game sessions currently in lobby or live status
        </p>
      </div>
      <DashboardClient initialGames={initialGames} />
    </div>
  );
}
