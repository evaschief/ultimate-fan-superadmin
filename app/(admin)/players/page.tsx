import { supabase } from '@/lib/supabase';

interface Player {
  uid: string;
  display_name: string;
  email: string;
  role: string;
  sports_played: string[];
  created_at: string;
  games_played: number;
  early_exits: number;
}

async function getPlayers(): Promise<Player[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('uid, display_name, email, role, sports_played, created_at')
      .neq('role', 'superadmin')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !users) return [];

    const { data: history } = await supabase
      .from('game_history')
      .select('uid, is_eliminated');

    const countByUid: Record<string, number> = {};
    const exitsByUid: Record<string, number> = {};
    for (const h of history ?? []) {
      countByUid[h.uid] = (countByUid[h.uid] ?? 0) + 1;
      if (h.is_eliminated) exitsByUid[h.uid] = (exitsByUid[h.uid] ?? 0) + 1;
    }

    return users.map(u => ({
      ...u,
      sports_played: u.sports_played ?? [],
      games_played: countByUid[u.uid] ?? 0,
      early_exits: exitsByUid[u.uid] ?? 0,
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

export default async function PlayersPage() {
  const players = await getPlayers();

  const total = players.length;
  const returning = players.filter(p => p.games_played > 1).length;
  const newPlayers = players.filter(p => p.games_played === 1).length;
  const neverPlayed = players.filter(p => p.games_played === 0).length;
  const avgGames = total > 0
    ? (players.reduce((sum, p) => sum + p.games_played, 0) / total).toFixed(1)
    : '0';
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const newThisMonth = players.filter(p => p.created_at >= thirtyDaysAgo).length;
  const retentionRate = total > 0 ? Math.round((returning / total) * 100) : 0;

  const totalEarlyExits = players.reduce((sum, p) => sum + p.early_exits, 0);
  const earlyExitRate = players.reduce((sum, p) => sum + p.games_played, 0) > 0
    ? Math.round((totalEarlyExits / players.reduce((sum, p) => sum + p.games_played, 0)) * 100)
    : 0;

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Players</h1>
        <p className="text-secondary text-sm mt-1">{total} registered players</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Total Players" value={total} sub={`+${newThisMonth} this month`} />
        <StatCard label="Returning" value={returning} sub={`${retentionRate}% retention rate`} />
        <StatCard label="Played Once" value={newPlayers} sub="first-time players" />
        <StatCard label="Avg Games / Player" value={avgGames} sub={`${neverPlayed} never played`} />
        <StatCard label="Early Exits" value={totalEarlyExits} sub={`${earlyExitRate}% of all games`} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Email</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Sports</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Games</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Early Exits</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const exitRate = p.games_played > 0 ? Math.round((p.early_exits / p.games_played) * 100) : 0;
              return (
                <tr key={p.uid} className={i % 2 === 0 ? 'bg-white border-b border-border' : 'bg-gray-50/50 border-b border-border'}>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {p.display_name || '—'}
                      {p.games_played > 1 && (
                        <span className="text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded-full">Returning</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-secondary">{p.email || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {(p.sports_played ?? []).map(s => (
                        <span key={s} className="text-xs bg-gray-100 text-secondary border border-border px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-secondary">{p.games_played}</td>
                  <td className="px-3 py-2">
                    {p.early_exits > 0 ? (
                      <span className="text-xs text-danger font-medium">
                        {p.early_exits}
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
    </div>
  );
}
