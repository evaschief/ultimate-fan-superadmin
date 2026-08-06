import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

// POST — create a new venue (locations row) plus its admin login (users row,
// role='admin', scoped to the new location_id via password_hash set through
// the same set_user_password RPC the admin panel's own password-reset flow
// uses — mirrors ultimate-fan/supabase/migrations/015_passwords_and_roles.sql
// + 033_users_location_id.sql exactly, so this account logs into the admin
// panel the same way any other admin does).
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const name     = (body.name ?? '').trim();
  const city     = (body.city ?? '').trim();
  const timezone = (body.timezone ?? '').trim() || 'America/New_York';
  const email    = (body.email ?? '').trim().toLowerCase();
  const password = (body.password ?? '').trim();

  if (!name)     return NextResponse.json({ error: 'Venue name is required' }, { status: 400 });
  if (!email)    return NextResponse.json({ error: 'Admin email is required' }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Email must be unique — verify_credentials looks up users by email alone.
  const { data: existing } = await supabase
    .from('users')
    .select('uid')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
  }

  const { data: location, error: locErr } = await supabase
    .from('locations')
    .insert({ name, city: city || '', timezone, is_active: true })
    .select('id')
    .single();

  if (locErr || !location) {
    return NextResponse.json({ error: locErr?.message ?? 'Failed to create venue' }, { status: 500 });
  }

  const uid = `admin-${uuidv4()}`;
  const { error: userErr } = await supabase
    .from('users')
    .insert({
      uid,
      email,
      role: 'admin',
      location_id: location.id,
      display_name: name,
    });

  if (userErr) {
    // Roll back the venue so we don't leave an orphaned location with no admin.
    await supabase.from('locations').delete().eq('id', location.id);
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  // locations.admin_uid isn't actually read anywhere in the app (the real
  // scoping is users.location_id, checked in admin/index.html), but keep it
  // populated for data completeness since the column exists.
  await supabase.from('locations').update({ admin_uid: uid }).eq('id', location.id);

  const { error: pwErr } = await supabase.rpc('set_user_password', {
    p_uid: uid,
    p_password: password,
  });

  if (pwErr) {
    // Venue + user exist but with no usable password — surface this clearly
    // rather than silently leaving a login-less admin account behind.
    return NextResponse.json({
      error: `Venue and admin account created, but setting the password failed: ${pwErr.message}. Use "Forgot password" to set one.`,
      locationId: location.id,
      uid,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, locationId: location.id, uid });
}
