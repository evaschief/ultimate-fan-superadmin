import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

// POST — change an existing admin/superadmin account's password.
//
// Uses admin_set_user_password (ultimate-fan/supabase/migrations/
// 051_admin_set_user_password.sql) rather than set_user_password, because the
// latter refuses to overwrite a password that is already set — see 049, which
// hardened it to close an anon-key takeover path. The new RPC is granted to
// service_role only and this route runs server-side with the service key.
export async function POST(req: NextRequest, { params }: { params: { uid: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { uid } = params;
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

  const body = await req.json();
  const password = (body.password ?? '').trim();
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Checked here as well as in the RPC so the operator gets a specific message
  // rather than a generic RPC error code.
  const { data: target } = await supabase
    .from('users')
    .select('uid, email, role')
    .eq('uid', uid)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.role !== 'superadmin' && target.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admin and superadmin passwords can be changed here' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('admin_set_user_password', {
    p_uid: uid,
    p_password: password,
  });

  if (error) {
    // PGRST202 = function not found in the schema cache, i.e. migration 051 has
    // not been applied to this database yet. Worth naming explicitly, since the
    // fix is a migration rather than anything in the app.
    if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message)) {
      return NextResponse.json(
        { error: 'Password changes need database migration 051_admin_set_user_password.sql, which has not been applied yet.' },
        { status: 501 }
      );
    }
    console.error('admin_set_user_password failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as { success?: boolean; error?: string } | null;
  if (!result?.success) {
    const map: Record<string, string> = {
      password_too_short:   'Password must be at least 8 characters',
      not_found:            'User not found',
      not_an_admin_account: 'Only admin and superadmin passwords can be changed here',
    };
    return NextResponse.json(
      { error: map[result?.error ?? ''] ?? 'Could not change the password' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
