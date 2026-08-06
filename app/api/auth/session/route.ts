import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, isAdminEmail, SESSION_COOKIE } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Fast path: if email is in ADMIN_EMAILS and password matches ADMIN_PASSWORD, allow in
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
    const adminPassword = process.env.ADMIN_PASSWORD ?? '';
    if (adminEmails.includes(email) && adminPassword && password === adminPassword) {
      const token = createSessionCookie('superadmin', email);
      const res = NextResponse.json({ ok: true });
      res.cookies.set(SESSION_COOKIE, token, {
        maxAge: SESSION_DURATION_SECONDS,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return res;
    }

    // Fall back to Supabase users table
    const { data: user, error } = await supabase
      .from('users')
      .select('uid, email, role, display_name')
      .eq('email', email)
      .eq('password', password)
      .limit(1)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check role or admin email list
    const hasAdminRole = user.role === 'superadmin' || user.role === 'admin';
    const allowed = hasAdminRole || (await isAdminEmail(email));
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied. This account does not have admin privileges.' },
        { status: 403 }
      );
    }

    const token = createSessionCookie(user.uid, user.email);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      maxAge: SESSION_DURATION_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
