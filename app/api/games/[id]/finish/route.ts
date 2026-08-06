import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Fetch game to confirm it exists and get sport
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('id, sport, status')
    .eq('id', id)
    .single();

  if (gameErr || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.status === 'ended') return NextResponse.json({ ok: true, message: 'Already ended' });

  // Fire a game_end event via process-event so all server-side settlement runs
  // (expires open bets, saves game_history, writes final game_winner, etc.)
  try {
    const evRes = await fetch(`${SUPABASE_URL}/functions/v1/process-event`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        game_code:    id,
        event_id:     crypto.randomUUID(),
        bet_id:       '',
        winning_option: '',
        event_type:   'game_end',
        event_data:   {
          type:   'game_end',
          sport:  game.sport ?? 'NFL',
          source: 'superadmin_manual',
        },
      }),
    });

    if (!evRes.ok) {
      const txt = await evRes.text();
      console.error('process-event game_end failed:', txt);
      // Fall through — still mark status ended in DB directly
    }
  } catch (e) {
    console.error('process-event call failed:', e);
    // Fall through — patch status directly so the game is at least marked done
  }

  // Always ensure status is set to ended in DB (process-event does this too,
  // but this is a safety net in case the function call failed).
  const { error: patchErr } = await supabase
    .from('games')
    .update({ status: 'ended' })
    .eq('id', id);

  if (patchErr) return NextResponse.json({ error: patchErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
