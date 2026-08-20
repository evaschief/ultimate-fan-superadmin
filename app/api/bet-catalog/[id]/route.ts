import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

const editableFields = [
  'bet_name', 'question_template', 'flavour_template', 'trigger_group',
  'trigger_description', 'trigger_context', 'description', 'option_format',
  'pricing', 'default_window_seconds', 'manual_openable', 'active',
  'sort_order', 'display_tier', 'is_player_bet', 'average_plays_to_resolve',
  'base_excitement_rating', 'implementation_status', 'option_builder',
  'selection_policy', 'settlement_rule',
] as const;

function validJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validPayload(value: Record<string, unknown>): boolean {
  for (const key of ['default_window_seconds', 'sort_order']) {
    if (!Number.isInteger(value[key]) || Number(value[key]) <= 0) return false;
  }
  for (const key of ['display_tier', 'average_plays_to_resolve', 'base_excitement_rating']) {
    if (value[key] !== null && value[key] !== undefined && !Number.isInteger(value[key])) return false;
  }
  if (value.display_tier != null && (Number(value.display_tier) < 1 || Number(value.display_tier) > 4)) return false;
  if (value.base_excitement_rating != null && (Number(value.base_excitement_rating) < 0 || Number(value.base_excitement_rating) > 100)) return false;
  if (value.average_plays_to_resolve != null && Number(value.average_plays_to_resolve) <= 0) return false;
  if (!['live', 'planned', 'retired'].includes(String(value.implementation_status))) return false;
  return ['pricing', 'option_builder', 'selection_policy', 'settlement_rule'].every((key) => validJsonObject(value[key]));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body || typeof body !== 'object' || !validPayload(body)) return NextResponse.json({ error: 'Invalid catalogue values.' }, { status: 400 });

  const update = Object.fromEntries(editableFields.map((key) => [key, body[key]]));
  const { data, error } = await supabase.from('bet_catalog')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', params.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Catalogue bet not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
