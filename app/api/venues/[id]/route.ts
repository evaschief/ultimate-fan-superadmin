import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

// PATCH — update an existing venue (locations row). Supports updating
// `timezone` (IANA string, e.g. "America/New_York") and/or `venueCode` (the
// permanent code players type to join whatever game is currently live at
// this venue) — either can be sent alone or together. Extend here if other
// fields need editing later.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const timezone       = body.timezone !== undefined ? String(body.timezone).trim() : undefined;
  const venueCode      = body.venueCode !== undefined ? String(body.venueCode).trim().toUpperCase() : undefined;
  const autoClaimGames = body.autoClaimGames !== undefined ? Boolean(body.autoClaimGames) : undefined;

  if (timezone === undefined && venueCode === undefined && autoClaimGames === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }
  if (timezone !== undefined && !timezone) {
    return NextResponse.json({ error: 'Timezone cannot be empty' }, { status: 400 });
  }
  if (venueCode !== undefined && !venueCode) {
    return NextResponse.json({ error: 'Venue code cannot be empty' }, { status: 400 });
  }

  if (venueCode !== undefined) {
    const { data: existingCode } = await supabase
      .from('locations')
      .select('id')
      .ilike('venue_code', venueCode)
      .neq('id', params.id)
      .maybeSingle();
    if (existingCode) {
      return NextResponse.json({ error: 'That venue code is already in use' }, { status: 409 });
    }
  }

  const update: Record<string, string | boolean> = {};
  if (timezone !== undefined) update.timezone = timezone;
  if (venueCode !== undefined) update.venue_code = venueCode;
  if (autoClaimGames !== undefined) update.auto_claim_games = autoClaimGames;

  const { error } = await supabase
    .from('locations')
    .update(update)
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
