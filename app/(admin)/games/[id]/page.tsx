import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';
import GameHeader, { getEventCounts, getGame } from './GameHeader';

// Stored columns, in the table's operational order. select('*') plus the
// appended extras below means a future database column cannot be hidden here.
const STORED_COLUMNS = [
  'id', 'game_id', 'game_code', 'uid', 'display_name', 'balance',
  'locked_amount', 'pending_potential', 'rank',
  'lineup', 'created_at',
] as const;

// This legacy database field is retained for historical records, but the game
// no longer eliminates users so it is intentionally not part of this screen.
const HIDDEN_LEGACY_COLUMNS = new Set(['is_eliminated']);

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export default async function GameUsersPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const [{ data: users }, counts] = await Promise.all([
    supabase.from(ROSTER_TABLE).select('*').eq('game_id', game.id).order('created_at', { ascending: false }),
    getEventCounts(game.id),
  ]);
  const rows = users ?? [];
  const extraColumns = Array.from(new Set(
    rows.flatMap(row => Object.keys(row).filter(key =>
      !STORED_COLUMNS.includes(key as typeof STORED_COLUMNS[number]) && !HIDDEN_LEGACY_COLUMNS.has(key),
    )),
  ));
  const columns = [...STORED_COLUMNS, ...extraColumns];

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="players" counts={counts} />

      <p className="text-sm text-secondary mb-3">
        One stored <code className="font-mono text-xs">unsaved_users</code> row per user participating in this game. No betting or leaderboard summaries are added here.
      </p>
      <div className="card p-0 overflow-x-auto">
        <div className="px-3 py-2 border-b border-border bg-gray-50 text-xs font-semibold text-muted uppercase tracking-wider">
          unsaved_users — stored columns
        </div>
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="px-3 py-2" />
              {columns.map(column => (
                <th key={column} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
                  {column.replaceAll('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? `${row.game_id}:${row.uid}`} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2">
                  <Link href={`/games/${game.id}/users/${row.uid}`} className="text-xs text-amber hover:underline whitespace-nowrap">
                    Bet log →
                  </Link>
                </td>
                {columns.map(column => (
                  <td key={column} className="px-3 py-2 font-mono text-xs text-secondary align-top whitespace-nowrap">
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted">No users have joined this game.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
