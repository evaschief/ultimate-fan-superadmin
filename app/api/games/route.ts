import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

// GET — list all active/lobby game sessions
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('games')
    .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, period, clock, created_at')
    .in('status', ['lobby', 'live'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const games = (data ?? []).map(row => ({
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
  }));

  return NextResponse.json({ games });
}
