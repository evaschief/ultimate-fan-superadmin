import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';
import { getAdminSession } from '@/lib/session';

// PATCH — the two flags that decide whether a game's events get recorded at all.
//
// The poller only fetches for games matching `status = 'live' AND poller_enabled
// = true` (getLiveGames in supabase/functions/poller/index.ts), and a lobby game
// only reaches 'live' by itself when auto_activate is true. Neither depends on
// anyone having joined — an empty game records exactly like a full one — but a
// game with poller_enabled false records nothing at all, silently, and until now
// there was no way to see or change that from here.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const update: Record<string, boolean> = {};
  if (body.pollerEnabled !== undefined) update.poller_enabled = Boolean(body.pollerEnabled);
  if (body.autoActivate !== undefined) update.auto_activate = Boolean(body.autoActivate);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase.from('games').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...update });
}

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
