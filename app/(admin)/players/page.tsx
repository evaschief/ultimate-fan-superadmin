import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';

// Adding or removing a player should show immediately rather than out of a
// cached snapshot (same reasoning as the venues and users lists).
export const dynamic = 'force-dynamic';

interface Player {
  uid: string;
  display_name: string;
  email: string | null;
  role: string;
  sports_played: string[];
  created_at: string;
  /** True once an email and password exist — i.e. the account was actually saved. */
  registered: boolean;
  /** Games this player joined, counted from their roster rows. */
  gamesJoined: number;
  lastJoined: string | null;
  earlyExits: number;
}

async function getPlayers(): Promise<Player[]> {
  try {
    const [{ data: users, error }, { data: roster }, { data: history }] = await Promise.all([
      supabase
        .from('users')
        .select('uid, display_name, email, role, sports_played, created_at, password_hash')
        .neq('role', 'superadmin')
        .order('created_at', { ascending: false })
        .limit(500),
      // The per-game roster table (renamed from `players`). Every uid in it also
      // has a users row, so this isn't a separate population — it's the record of
      // which games each user actually joined.
      supabase.from(ROSTER_TABLE).select('uid, game_code, created_at, display_name'),
      supabase.from('game_history').select('uid, is_eliminated'),
    ]);

    if (error || !users) return [];

    // Roster rows also carry the name the player typed when joining. Most users
    // rows have an empty display_name, so without this fallback the list reads
    // "no name" for people who clearly did give one.
    const joinsByUid: Record<string, { games: Set<string>; last: string | null; name: string }> = {};
    for (const r of roster ?? []) {
      const entry = (joinsByUid[r.uid] ??= { games: new Set(), last: null, name: '' });
      entry.games.add(r.game_code);
      if (r.created_at && (!entry.last || r.created_at > entry.last)) {
        entry.last = r.created_at;
        if (r.display_name) entry.name = r.display_name; // name from the most recent join
      }
      if (!entry.name && r.display_name) entry.name = r.display_name;
    }

    const exitsByUid: Record<string, number> = {};
    for (const h of history ?? []) {
      if (h.is_eliminated) exitsByUid[h.uid] = (exitsByUid[h.uid] ?? 0) + 1;
    }

    return users.map(u => ({
      uid: u.uid,
      display_name: u.display_name || joinsByUid[u.uid]?.name || '',
      email: u.email ?? null,
      role: u.role ?? '',
      sports_played: u.sports_played ?? [],
      created_at: u.created_at,
      registered: !!(u.email && u.password_hash),
      gamesJoined: joinsByUid[u.uid]?.games.size ?? 0,
      lastJoined: joinsByUid[u.uid]?.last ?? null,
      earlyExits: exitsByUid[u.uid] ?? 0,
    }));
  } catch {
    return [];
  }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-muted font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function PlayersPage() {
  const players = await getPlayers();

  const total = players.length;
  const unsaved = players.filter(p => !p.registered).length;
  const havePlayed = players.filter(p => p.gamesJoined > 0).length;
  const returning = players.filter(p => p.gamesJoined > 1).length;
  const totalEarlyExits = players.reduce((sum, p) => sum + p.earlyExits, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const newThisMonth = players.filter(p => p.created_at >= thirtyDaysAgo).length;

  // Sort by activity — the players who actually joined games first.
  const sorted = [...players].sort((a, b) => {
    if (b.gamesJoined !== a.gamesJoined) return b.gamesJoined - a.gamesJoined;
    return (b.lastJoined ?? b.created_at).localeCompare(a.lastJoined ?? a.created_at);
  });

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Players</h1>
        <p className="text-secondary text-sm mt-1">
          Everyone who isn&apos;t an admin — saved accounts and unsaved ones alike. Admin and
          superadmin logins are on the Users page.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total Players" value={total} sub={`+${newThisMonth} this month`} />
        <StatCard label="Unsaved" value={unsaved} sub="no email on the account" />
        <StatCard label="Have Played" value={havePlayed} sub={`${total - havePlayed} never joined a game`} />
        <StatCard label="Returning" value={returning} sub="joined more than one game" />
        <StatCard label="Early Exits" value={totalEarlyExits} sub="went bankrupt mid-game" />
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Account</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Email</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Sports</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Games</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Last Joined</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Early Exits</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted">No players found</td></tr>
            ) : sorted.map((p, i) => {
              const exitRate = p.gamesJoined > 0 ? Math.round((p.earlyExits / p.gamesJoined) * 100) : 0;
              return (
                <tr key={p.uid} className={i % 2 === 0 ? 'bg-white border-b border-border' : 'bg-gray-50/50 border-b border-border'}>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {p.display_name || <span className="text-muted italic">no name</span>}
                      {p.gamesJoined > 1 && (
                        <span className="text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded-full">Returning</span>
                      )}
                    </div>
                    <div className="text-xs text-muted font-mono mt-0.5">{p.uid.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2">
                    {p.registered ? (
                      <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-semibold">Saved</span>
                    ) : (
                      // Not a problem, just a state: the account exists on the
                      // device but no email was ever attached to it.
                      <span className="text-xs bg-gray-100 text-muted border border-border px-2 py-0.5 rounded-full font-semibold">Unsaved</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-secondary">{p.email || <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {p.sports_played.length === 0
                        ? <span className="text-muted text-xs">—</span>
                        : p.sports_played.map(s => (
                            <span key={s} className="text-xs bg-gray-100 text-secondary border border-border px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-secondary tabular-nums">{p.gamesJoined}</td>
                  <td className="px-3 py-2 text-secondary text-xs">{fmtDate(p.lastJoined)}</td>
                  <td className="px-3 py-2">
                    {p.earlyExits > 0 ? (
                      <span className="text-xs text-danger font-medium">
                        {p.earlyExits}
                        <span className="text-muted font-normal ml-1">({exitRate}%)</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-gray-100 text-muted border border-border px-2 py-0.5 rounded-full">{p.role}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-3 max-w-2xl">
        Games counts the rows in <span className="font-mono">unsaved_users</span>, the per-game
        roster table, which is the record of games actually joined. Early exits come from
        settled <span className="font-mono">game_history</span> rows, so they only appear for
        games that reached a formal end.
      </p>
    </div>
  );
}
