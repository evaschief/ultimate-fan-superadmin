import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';
import { manualCatalogEntry } from '@/lib/betCatalog';

const STATIC_MULTIPLIERS: Record<string, [number, number]> = {
  scores_next: [1.85, 1.85],
  td_or_fg: [1.85, 1.85],
};

// Optional Superadmin tooling. The database RPC performs game/venue
// authorization, serializes duplicate checks, and records the audit event in
// the same transaction as the bet record.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const templateId = typeof body?.templateId === 'string' ? body.templateId : '';

  const { data: game } = await supabase
    .from('games')
    .select('id, sport, home_team, away_team, period, clock')
    .eq('id', params.id)
    .maybeSingle();
  if (!game) return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  const entry = manualCatalogEntry(game.sport, templateId);
  if (!entry) return NextResponse.json({ error: 'That catalog bet is not approved for manual opening.' }, { status: 400 });

  let optionA = game.home_team ?? 'Home';
  let optionB = game.away_team ?? 'Away';
  let multiplierA = STATIC_MULTIPLIERS[entry.id]?.[0] ?? 1.85;
  let multiplierB = STATIC_MULTIPLIERS[entry.id]?.[1] ?? 1.85;
  let oddsSource = 'ultimate_fan';
  if (entry.id === 'td_or_fg') { optionA = 'Touchdown'; optionB = 'Field Goal'; }
  if (entry.id === 'who_wins_game') {
    const { data: odds } = await supabase.from('admin_config').select('value')
      .eq('key', `gameOdds_${game.id}`).maybeSingle();
    if (typeof odds?.value?.homeMultiplier === 'number' && typeof odds.value.awayMultiplier === 'number') {
      multiplierA = odds.value.homeMultiplier;
      multiplierB = odds.value.awayMultiplier;
      oddsSource = 'balldontlie_moneyline';
    }
  }

  const betId = `manual_${crypto.randomUUID()}`;
  const { data, error } = await supabase.rpc('open_catalog_bet', {
    p_actor_uid: session.uid,
    p_game_id: game.id,
    p_sport: game.sport ?? 'NFL',
    p_bet_id: betId,
    p_question: entry.name,
    p_flavour: `Opened manually from the Superadmin catalog · ${entry.trigger}`,
    p_option_a: optionA,
    p_option_b: optionB,
    p_multiplier_a: multiplierA,
    p_multiplier_b: multiplierB,
    p_window_seconds: entry.id === 'who_wins_game' ? 120 : 45,
    p_trigger_event_type: entry.id,
    p_trigger_period: String(game.period ?? ''),
    p_trigger_clock: game.clock ?? '',
    p_event_data: { source: 'superadmin_catalog', templateId: entry.id, oddsSource, openedBy: session.email },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, betId, rowId: data, oddsSource });
}
