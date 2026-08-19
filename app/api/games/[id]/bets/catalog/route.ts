import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

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
  const { data: entry } = await supabase.from('bet_catalog')
    .select('bet_type, name, trigger_description, pricing, default_window_seconds, manual_openable, active')
    .eq('sport', game.sport === 'NHL' ? 'NHL' : 'NFL')
    .eq('bet_type', templateId)
    .maybeSingle();
  if (!entry?.active || !entry.manual_openable) return NextResponse.json({ error: 'That catalog bet is not approved for manual opening.' }, { status: 400 });

  let optionA = game.home_team ?? 'Home';
  let optionB = game.away_team ?? 'Away';
  const pricing = entry.pricing && typeof entry.pricing === 'object' ? entry.pricing as Record<string, unknown> : {};
  let multiplierA = Number(pricing.multiplierA) || 1.85;
  let multiplierB = Number(pricing.multiplierB) || 1.85;
  let oddsSource = String(pricing.mode ?? 'ultimate_fan_model');
  if (entry.bet_type === 'td_or_fg') { optionA = 'Touchdown'; optionB = 'Field Goal'; }
  if (pricing.mode === 'moneyline') {
    const { data: odds } = await supabase.from('admin_config').select('value')
      .eq('key', `gameOdds_${game.id}`).maybeSingle();
    if (typeof odds?.value?.homeMultiplier === 'number' && typeof odds.value.awayMultiplier === 'number') {
      multiplierA = odds.value.homeMultiplier;
      multiplierB = odds.value.awayMultiplier;
      oddsSource = 'balldontlie_moneyline';
    }
  } else if (pricing.mode === 'model') {
    const probabilityA = entry.bet_type === 'td_or_fg' ? 0.64 : Number(pricing.yesProbability) || 0.5;
    multiplierA = Math.max(1.1, Math.min(8, Math.round((0.92 / probabilityA) * 100) / 100));
    multiplierB = Math.max(1.1, Math.min(8, Math.round((0.92 / (1 - probabilityA)) * 100) / 100));
  }

  const betId = `manual_${crypto.randomUUID()}`;
  const { data, error } = await supabase.rpc('open_catalog_bet', {
    p_actor_uid: session.uid,
    p_game_id: game.id,
    p_sport: game.sport ?? 'NFL',
    p_bet_id: betId,
    p_question: entry.name,
    p_flavour: `Opened manually from the Superadmin catalog · ${entry.trigger_description}`,
    p_option_a: optionA,
    p_option_b: optionB,
    p_multiplier_a: multiplierA,
    p_multiplier_b: multiplierB,
    p_window_seconds: entry.default_window_seconds,
    p_trigger_event_type: entry.bet_type,
    p_trigger_period: String(game.period ?? ''),
    p_trigger_clock: game.clock ?? '',
    p_event_data: { source: 'superadmin_catalog', templateId: entry.bet_type, oddsSource, openedBy: session.email },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, betId, rowId: data, oddsSource });
}
