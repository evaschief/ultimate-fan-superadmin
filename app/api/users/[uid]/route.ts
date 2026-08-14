import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

// DELETE — revoke a superadmin account.
//
// Scoped to role='superadmin' on purpose: venue admins (role='admin') are tied
// to a location and are created alongside their venue in
// app/api/venues/route.ts, so deleting one here would leave a venue with no
// login. Those belong on the venue page if they ever need managing.
export async function DELETE(_req: NextRequest, { params }: { params: { uid: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { uid } = params;
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

  const { data: target } = await supabase
    .from('users')
    .select('uid, email, role')
    .eq('uid', uid)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Only superadmin accounts can be revoked here. Venue admins are managed with their venue.' },
      { status: 400 }
    );
  }

  // Don't let the signed-in operator lock themselves out. Matched on email
  // rather than uid because the env-var bootstrap login (ADMIN_EMAILS) issues
  // its session with the literal uid 'superadmin', which matches no row.
  if (target.email && target.email.toLowerCase() === session.email.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot revoke your own account' }, { status: 400 });
  }

  // Never empty the table — a console with no superadmin rows can only be
  // entered through the ADMIN_EMAILS/ADMIN_PASSWORD env pair.
  const { count } = await supabase
    .from('users')
    .select('uid', { count: 'exact', head: true })
    .eq('role', 'superadmin');

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'Cannot revoke the last superadmin account' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('users').delete().eq('uid', uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
