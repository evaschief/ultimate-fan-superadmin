import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ROSTER_TABLE } from '@/lib/tables';
import GameHeader, { getEventCounts, getGame, betTables } from '../../GameHeader';

// Stored columns of nfl_player_bets / nhl_player_bets, in the table's own
// order. Same approach as the Users tab: select('*') plus the appended extras
// below, so a future database column cannot silently go missing from this view.
const STORED_COLUMNS = [
  'id', 'game_code', 'game_id', 'bet_id', 'uid',
  'question', 'pick', 'other_option',
  'amount', 'multiplier', 'status', 'payout', 'created_at',
] as const;

// Read back from the parent bet row the wager points at — what the offer
// actually was, as opposed to the copy the client denormalised into the wager.
const PAYLOAD_COLUMNS = [
  'question', 'flavour', 'option_a', 'option_b',
  'multiplier_a', 'multiplier_b', 'window_seconds',
  'status', 'winning_option', 'trigger_type', 'trigger_event_type', 'trigger_clock',
] as const;

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export default async function UserBetLogPage({ params }: { params: { id: string; uid: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const { bets: betsTable, playerBets: playerBetsTable } = betTables(game.sport);

  const [{ data: user }, { data: wagers }, { data: parents }, counts] = await Promise.all([
    supabase.from(ROSTER_TABLE).select('*').eq('game_id', game.id).eq('uid', params.uid).maybeSingle(),
    // game_code stores the game UUID on these rows despite the name — see
    // joinGame in the app. Filtering on the short join code returns nothing.
    supabase.from(playerBetsTable).select('*').eq('game_code', game.id).eq('uid', params.uid)
      .order('created_at', { ascending: true }),
    supabase.from(betsTable).select('*').eq('game_code', game.id),
    getEventCounts(game.id),
  ]);

  if (!user) notFound();

  const rows = wagers ?? [];
  const parentByBetId = new Map((parents ?? []).map(bet => [bet.bet_id, bet]));

  // A wager row per (bet_id) beyond the first is a duplicate: the client had no
  // unique constraint and no idempotency on the insert, so a replayed pregame
  // batch created a second row for a bet the player already held. That is what
  // makes a player's My Bets count exceed the number of genuinely open offers,
  // so it is called out rather than left for the reader to spot.
  const seenBetIds = new Map<string, number>();
  const duplicateBetIds = new Set<string>();
  for (const row of rows) {
    const count = (seenBetIds.get(row.bet_id) ?? 0) + 1;
    seenBetIds.set(row.bet_id, count);
    if (count > 1) duplicateBetIds.add(row.bet_id);
  }

  const extraColumns = Array.from(new Set(
    rows.flatMap(row => Object.keys(row).filter(
      key => !STORED_COLUMNS.includes(key as typeof STORED_COLUMNS[number]),
    )),
  ));
  const storedColumns = [...STORED_COLUMNS, ...extraColumns];

  const pending = rows.filter(row => row.status === 'pending');
  const pendingSum = pending.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const lockedAmount = user.locked_amount ?? 0;
  const openParents = new Set(
    pending.map(row => row.bet_id).filter(betId => parentByBetId.get(betId)?.status === 'open'),
  );

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="players" counts={counts} />

      <div className="mb-4">
        <Link href={`/games/${game.id}`} className="text-xs text-muted hover:text-gray-900 transition-colors">← Users</Link>
        <h2 className="text-base font-semibold text-gray-900 mt-1">
          {user.display_name || 'Unnamed'}
          <span className="font-mono text-muted font-normal ml-2 text-sm">· {params.uid.slice(0, 8)}</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Stat label="Wagers" value={rows.length} />
        <Stat label="Pending rows" value={pending.length} />
        <Stat
          label="Distinct open bets"
          value={openParents.size}
          warn={pending.length !== openParents.size}
        />
        <Stat label="Balance" value={user.balance ?? 0} />
        <Stat label="Locked" value={lockedAmount} warn={lockedAmount !== pendingSum} />
      </div>

      {pending.length !== openParents.size && (
        <p className="text-sm text-amber mb-2">
          This player holds <strong>{pending.length}</strong> pending wager rows across{' '}
          <strong>{openParents.size}</strong> bets that are still open. Their app counts rows, so it
          shows {pending.length}; the Bets tab counts open offers, so it shows {openParents.size}.
        </p>
      )}
      {lockedAmount !== pendingSum && (
        <p className="text-sm text-amber mb-2">
          <span className="font-mono">locked_amount</span> is <strong>{lockedAmount}</strong> but pending
          stakes total <strong>{pendingSum}</strong> — a difference of {Math.abs(lockedAmount - pendingSum)}.
        </p>
      )}
      {duplicateBetIds.size > 0 && (
        <p className="text-sm text-amber mb-2">
          {duplicateBetIds.size} bet{duplicateBetIds.size === 1 ? '' : 's'} carry more than one wager row
          from this player. Duplicated rows are marked below.
        </p>
      )}

      <p className="text-sm text-secondary mb-3">
        Every <code className="font-mono text-xs">{playerBetsTable}</code> row for this player, oldest
        first. Columns through <span className="font-mono">created_at</span> are stored directly on the
        wager; the group after them is read back from the matching{' '}
        <code className="font-mono text-xs">{betsTable}</code> offer.
      </p>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">dup</th>
              <th colSpan={storedColumns.length} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
                {playerBetsTable} — stored columns
              </th>
              <th colSpan={PAYLOAD_COLUMNS.length} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-l border-border">
                read from {betsTable} payload
              </th>
            </tr>
            <tr className="border-b border-border bg-gray-50">
              <th className="px-3 py-2" />
              {storedColumns.map(column => (
                <th key={column} className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
                  {column.replaceAll('_', ' ')}
                </th>
              ))}
              {PAYLOAD_COLUMNS.map((column, i) => (
                <th key={column} className={`text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider ${i === 0 ? 'border-l border-border' : ''}`}>
                  {column.replaceAll('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const parent = parentByBetId.get(row.bet_id);
              const isDup = duplicateBetIds.has(row.bet_id);
              return (
                <tr key={row.id ?? `${row.bet_id}:${i}`} className={`border-b border-border last:border-0 ${isDup ? 'bg-amber/5' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-xs text-amber font-semibold">{isDup ? 'DUP' : ''}</td>
                  {storedColumns.map(column => (
                    <td key={column} className="px-3 py-2 font-mono text-xs text-secondary align-top whitespace-nowrap">
                      {formatCell(row[column])}
                    </td>
                  ))}
                  {PAYLOAD_COLUMNS.map((column, j) => (
                    <td key={column} className={`px-3 py-2 font-mono text-xs text-secondary align-top whitespace-nowrap ${j === 0 ? 'border-l border-border' : ''}`}>
                      {parent ? formatCell(parent[column]) : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={storedColumns.length + PAYLOAD_COLUMNS.length + 1} className="px-3 py-8 text-center text-muted">
                  This player has placed no wagers in this game.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-semibold ${warn ? 'text-amber' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
