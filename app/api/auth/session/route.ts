import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, SESSION_COOKIE } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

function withSession(uid: string, email: string) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionCookie(uid, email), {
    maxAge: SESSION_DURATION_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();

    // Fast path: the bootstrap account from env vars. Kept so the console stays
    // reachable even if the users table or the RPC below is unavailable.
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const adminPassword = process.env.ADMIN_PASSWORD ?? '';
    if (adminEmails.includes(normalized) && adminPassword && password === adminPassword) {
      return withSession('superadmin', normalized);
    }

    // BUG FIX: this fallback used to query
    //   .eq('email', email).eq('password', password)
    // against a `users.password` column that does not exist in the schema
    // (015_passwords_and_roles.sql added `password_hash`, and no migration ever
    // added a plaintext `password`). PostgREST therefore failed the request
    // outright, the error branch returned 401, and EVERY database-backed login
    // was rejected — the env fast path above was the only way into the console,
    // and existing superadmin rows with a valid password_hash could never sign
    // in. It also meant passwords were being compared in plaintext by design.
    //
    // Now verified through the verify_credentials RPC
    // (020_admin_password_required.sql), which bcrypt-checks password_hash
    // server-side and explicitly refuses admin/superadmin rows that have no
    // password set.
    const { data, error } = await supabase.rpc('verify_credentials', {
      p_email: normalized,
      p_password: password,
    });

    if (error) {
      console.error('verify_credentials failed:', error.message);
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable' }, { status: 500 });
    }

    const result = data as {
      success?: boolean;
      uid?: string;
      role?: string;
      error?: string;
      password_required?: boolean;
    } | null;

    if (!result?.success) {
      if (result?.error === 'password_not_set') {
        return NextResponse.json(
          { error: 'This account has no password set. Create it again from Users, or use the app\'s password reset flow.' },
          { status: 403 }
        );
      }
      // not_found / wrong_password are deliberately reported identically so the
      // response can't be used to enumerate which emails have accounts.
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Superadmin only. Venue admins (role='admin') are scoped to a single
    // location in their own admin panel; this console has no location scoping
    // at all — it lists every venue, player and game and can delete games — so
    // letting an 'admin' row in here would be a straight privilege escalation.
    // The previous code intended to allow both, but never actually ran (see
    // above), so restricting to superadmin changes no working login.
    if (result.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. This account does not have superadmin privileges.' },
        { status: 403 }
      );
    }

    // Belt-and-braces: verify_credentials has a legacy branch that reports
    // success with password_required=false for rows whose password_hash is NULL
    // (email-only player recovery). 020 already blocks that for admin roles;
    // refuse it here too so a passwordless row can never open a console session.
    if (result.password_required === false) {
      return NextResponse.json(
        { error: 'This account has no password set.' },
        { status: 403 }
      );
    }

    if (!result.uid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return withSession(result.uid, normalized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
