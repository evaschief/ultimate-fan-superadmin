import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { supabase } from './supabase';

export const SESSION_COOKIE = 'uf_admin_session';
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is not set');
  return secret;
}

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function hmacSign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionCookie(uid: string, email: string): string {
  const exp = Date.now() + SESSION_DURATION_MS;
  const payload = b64url(JSON.stringify({ uid, email, exp }));
  const sig = hmacSign(payload);
  return `${payload}.${sig}`;
}

export function verifySession(token: string): { uid: string; email: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;

    const expectedSig = hmacSign(payload);
    if (sig !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;

    return { uid: data.uid, email: data.email };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ uid: string; email: string } | null> {
  const cookieStore = cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return null;
  return verifySession(cookie.value);
}

export async function isAdminEmail(email: string): Promise<boolean> {
  // Check env var list first
  const envEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) ?? [];
  if (envEmails.includes(email)) return true;

  // Check users table for superadmin role
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .eq('role', 'superadmin')
      .limit(1)
      .single();
    return !!data;
  } catch {
    return false;
  }
}

export const SESSION_DURATION_MS_EXPORT = SESSION_DURATION_MS;
