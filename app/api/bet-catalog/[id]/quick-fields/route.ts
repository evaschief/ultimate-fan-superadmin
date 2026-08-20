import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

function optionalPositiveInteger(value: unknown) {
  return value === null || (Number.isInteger(value) && Number(value) > 0);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body || !optionalPositiveInteger(body.average_plays_to_resolve) || !(body.base_excitement_rating === null || (Number.isInteger(body.base_excitement_rating) && body.base_excitement_rating >= 0 && body.base_excitement_rating <= 100)) || !Number.isInteger(body.default_window_seconds) || body.default_window_seconds <= 0) {
    return NextResponse.json({ error: 'Enter a positive average, a 0–100 rating, and a positive window.' }, { status: 400 });
  }

  const { error } = await supabase.from('bet_catalog').update({
    average_plays_to_resolve: body.average_plays_to_resolve,
    base_excitement_rating: body.base_excitement_rating,
    default_window_seconds: body.default_window_seconds,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
