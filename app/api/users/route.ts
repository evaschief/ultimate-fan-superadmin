import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

// POST — create a superadmin account (users row with role='superadmin' plus a
// bcrypt password set through the set_user_password RPC). This mirrors the venue
// admin creation in app/api/venues/route.ts, except the new row is unscoped
// (no location_id) and gets the superadmin role, so it can sign in to this
// console via verify_credentials in app/api/auth/session/route.ts.
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const email       = (body.email ?? '').trim().toLowerCase();
  const displayName = (body.displayName ?? '').trim();
  const password    = (body.password ?? '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Email must be unique — verify_credentials looks users up by email alone,
  // so a duplicate would make which row wins arbitrary.
  const { data: existing } = await supabase
    .from('users')
    .select('uid, role')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `An account with that email already exists (role: ${existing.role ?? 'unknown'})` },
      { status: 409 }
    );
  }

  const uid = `superadmin-${uuidv4()}`;
  const { error: insErr } = await supabase
    .from('users')
    .insert({
      uid,
      email,
      role: 'superadmin',
      display_name: displayName || email,
    });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { error: pwErr } = await supabase.rpc('set_user_password', {
    p_uid: uid,
    p_password: password,
  });

  if (pwErr) {
    // SECURITY: delete the row rather than leaving it behind. A superadmin row
    // with password_hash IS NULL is a live account-takeover path — `users` has
    // no RLS, so anyone can read the uid out of it and then claim the account
    // by calling set_user_password themselves (spelled out in
    // ultimate-fan/supabase/migrations/049_close_password_takeover_gap.sql,
    // which names the venue route's leave-it-behind branch as exactly this
    // hazard). Failing closed costs the operator one retry; failing open leaves
    // an unclaimed superadmin account.
    await supabase.from('users').delete().eq('uid', uid);
    return NextResponse.json(
      { error: `Could not set the password, so no account was created: ${pwErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, uid });
}
