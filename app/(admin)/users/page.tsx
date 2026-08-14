import { supabase } from '@/lib/supabase';
import UsersClient, { AdminUser } from './UsersClient';

// Always live: adding or revoking an account must show up immediately rather
// than out of a cached snapshot (same reasoning as the venues list).
export const dynamic = 'force-dynamic';

async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('uid, email, display_name, role, location_id, password_hash, created_at')
      .in('role', ['superadmin', 'admin'])
      .order('created_at', { ascending: false });

    if (error || !users) return [];

    // Venue admins are scoped to a location — resolve its name for the table.
    const locationIds = users.map(u => u.location_id).filter(Boolean) as string[];
    const venueNames: Record<string, string> = {};
    if (locationIds.length > 0) {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds);
      for (const l of locations ?? []) venueNames[l.id] = l.name ?? '';
    }

    return users.map(u => ({
      uid: u.uid,
      email: u.email ?? '',
      displayName: u.display_name ?? '',
      role: u.role ?? '',
      venueName: u.location_id ? (venueNames[u.location_id] ?? '—') : null,
      // Never send the hash itself to the client — only whether one exists.
      hasPassword: !!u.password_hash,
      createdAt: u.created_at ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  const users = await getAdminUsers();
  // ADMIN_EMAILS is the env-var bootstrap login that bypasses the users table
  // entirely, so it's worth showing alongside the real rows.
  const envEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  return <UsersClient users={users} envEmails={envEmails} />;
}
