import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';
import { getAdminSession } from '@/lib/session';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Delete child records first to avoid FK violations
  const sport = (await supabase.from('games').select('sport').eq('id', id).single()).data?.sport ?? 'NFL';
  const betsTable = sport === 'NHL' ? 'nhl_bets' : 'nfl_bets';
  const playerBetsTable = sport === 'NHL' ? 'nhl_player_bets' : 'nfl_player_bets';

  await Promise.all([
    supabase.from(ROSTER_TABLE).delete().eq('game_code', id),
    supabase.from(betsTable).delete().eq('game_code', id),
    supabase.from(playerBetsTable).delete().eq('game_code', id),
    supabase.from('game_events').delete().eq('game_code', id),
    supabase.from('game_history').delete().eq('game_code', id),
    supabase.from('player_sessions').delete().eq('game_code', id),
  ]);

  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
