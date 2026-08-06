import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getAuditData(gameId: string) {
  const { data: game } = await supabase
    .from('games')
    .select('id, join_code, sport, home_team, away_team, created_at, flags')
    .eq('id', gameId)
    .single();

  if (!game) return null;

  const sport = game.sport ?? 'NFL';
  const isNfl = sport === 'NFL';
  const betsTable = isNfl ? 'nfl_bets' : 'nhl_bets';
  const pbTable = isNfl ? 'nfl_player_bets' : 'nhl_player_bets';
  const periodKey = isNfl ? 'trigger_quarter' : 'trigger_period';

  const [
    { data: bets },
    { data: playerBets },
    { data: gameEvents },
    { data: sessions },
  ] = await Promise.all([
    supabase.from(betsTable)
      .select(`bet_id, question, option_a, option_b, status, winning_option, created_at, ${periodKey}, trigger_clock`)
      .eq('game_code', gameId)
      .order('created_at'),
    supabase.from(pbTable)
      .select('uid, display_name, bet_id, pick, amount, status, payout, created_at')
      .eq('game_code', gameId)
      .order('created_at'),
    supabase.from('game_events')
      .select('bet_id, winning_option, created_at, event_type, event_data')
      .eq('game_code', gameId)
      .order('created_at'),
    supabase.from('player_sessions')
      .select('uid, display_name, event, created_at')
      .eq('game_code', gameId)
      .in('event', ['join'])
      .order('created_at'),
  ]);

  // bet_id → bet
  const betById: Record<string, typeof bets[0]> = {};
  for (const b of bets ?? []) betById[b.bet_id] = b;

  // bet_id → resolve timestamp (from game_events)
  const resolveTs: Record<string, string> = {};
  for (const ge of gameEvents ?? []) {
    if (ge.bet_id && ge.created_at) resolveTs[ge.bet_id] = ge.created_at;
  }

  // Build sorted unique timestamps: bet opens + bet resolves
  const allTs = new Set<string>();
  for (const b of bets ?? []) if (b.created_at) allTs.add(b.created_at);
  for (const ts of Object.values(resolveTs)) allTs.add(ts);
  const sortedTs = [...allTs].sort();

  // uid → name, join time
  const playerNames: Record<string, string> = {};
  const joinTimes: Record<string, string> = {};
  for (const s of sessions ?? []) {
    playerNames[s.uid] = s.display_name ?? s.uid;
    joinTimes[s.uid] ??= new Date(s.created_at).toISOString().slice(11, 16);
  }
  for (const pb of playerBets ?? []) {
    playerNames[pb.uid] ??= pb.display_name ?? pb.uid;
  }

  // uid → bet_id → player_bet
  const pbMap: Record<string, Record<string, typeof playerBets[0]>> = {};
  for (const pb of playerBets ?? []) {
    (pbMap[pb.uid] ??= {})[pb.bet_id] = pb;
  }

  // uid → bet_id → action event (bet_placed / bet_dismissed / bet_ignored)
  const actionMap: Record<string, Record<string, { action: string; latency: number | null; pick: string | null; amount: number | null }>> = {};
  for (const ge of gameEvents ?? []) {
    if (ge.event_type !== 'bet_placed' && ge.event_type !== 'bet_dismissed' && ge.event_type !== 'bet_ignored') continue;
    const ed = ge.event_data ?? {};
    const uid = ed.uid ?? ed.display_name ?? '';
    const bid = ge.bet_id;
    if (!uid || !bid) continue;
    (actionMap[uid] ??= {})[bid] = {
      action: ge.event_type,
      latency: ed.latency_seconds ?? null,
      pick: ed.pick ?? null,
      amount: ed.amount ?? null,
    };
  }

  const uids = Object.keys(playerNames);
  uids.sort((a, b) => (joinTimes[a] ?? '').localeCompare(joinTimes[b] ?? ''));

  // Build columns
  interface Col {
    ts: string;
    utc: string;
    gameClock: string;
    betEvent: { type: 'open' | 'resolved'; question: string; winner?: string } | null;
  }

  const cols: Col[] = sortedTs.map(ts => {
    const openedBet = (bets ?? []).find(b => b.created_at === ts);
    const resolvedBid = Object.entries(resolveTs).find(([, rts]) => rts === ts)?.[0];
    const resolvedBet = resolvedBid ? betById[resolvedBid] : null;

    let betEvent: Col['betEvent'] = null;
    if (openedBet) {
      betEvent = { type: 'open', question: openedBet.question };
    } else if (resolvedBet) {
      betEvent = {
        type: 'resolved',
        question: resolvedBet.question,
        winner: betById[resolvedBid!]?.winning_option ?? resolveTs[resolvedBid!] ? (gameEvents ?? []).find(ge => ge.bet_id === resolvedBid)?.winning_option : undefined,
      };
    }

    const pKey = periodKey;
    const gameClock = openedBet && openedBet[pKey] && openedBet.trigger_clock
      ? `Q${openedBet[pKey]} ${openedBet.trigger_clock}`
      : '—';

    return {
      ts,
      utc: new Date(ts).toISOString().slice(11, 16),
      gameClock,
      betEvent,
    };
  });

  // uid → cumulative fantasy pts (from fantasy_credit game_events)
  const fantasyByUid: Record<string, number> = {};
  // Build rosterPlayerId → uid via player lineup stored in players table
  const { data: players } = await supabase
    .from('players')
    .select('uid, lineup')
    .eq('game_code', gameId);
  const rosterIdToUid: Record<string, string> = {};
  for (const p of players ?? []) {
    for (const pid of Object.values(p.lineup ?? {})) {
      if (pid) rosterIdToUid[String(pid)] = p.uid;
    }
  }
  const fantasyEvents = (gameEvents ?? []).filter(ge => ge.event_type === 'fantasy_credit');
  for (const ev of fantasyEvents) {
    const { playerId, points } = ev.event_data ?? {};
    const uid = rosterIdToUid[String(playerId)];
    if (uid && points) fantasyByUid[uid] = (fantasyByUid[uid] ?? 0) + points;
  }

  return { game, cols, uids, playerNames, joinTimes, pbMap, betById, resolveTs, gameEvents: gameEvents ?? [], actionMap, fantasyByUid };
}

function cellStyle(r: string) {
  if (r.startsWith('WON')) return 'text-success font-semibold';
  if (r.startsWith('LOST')) return 'text-danger font-semibold';
  if (r.startsWith('REFUNDED')) return 'text-secondary italic';
  if (r.startsWith('Picked')) return 'text-amber font-medium';
  if (r.startsWith('DISMISSED')) return 'text-secondary italic';
  if (r === 'TIMED OUT') return 'text-danger/60 italic';
  if (r === 'DID NOT BET') return 'text-muted';
  return 'text-muted';
}

function ResponseCell({ r }: { r: string }) {
  if (r.startsWith('Picked') && / · \d+s$/.test(r)) {
    const latency = r.match(/ · (\d+s)$/)?.[1];
    const main = r.replace(/ · \d+s$/, '');
    return (
      <span className={`whitespace-pre-line leading-tight ${cellStyle(r)}`}>
        {main}
        {latency && <span className="text-muted font-normal text-[10px]"> · {latency}</span>}
      </span>
    );
  }
  if (r.startsWith('DISMISSED') && r.includes(' · ')) {
    const [label, latency] = r.split(' · ');
    return (
      <span className="whitespace-pre-line leading-tight text-secondary italic">
        {label}
        <span className="text-muted font-normal not-italic text-[10px]"> · {latency}</span>
      </span>
    );
  }
  return <span className={`whitespace-pre-line leading-tight ${cellStyle(r)}`}>{r}</span>;
}

export default async function AuditPage({ params }: { params: { id: string } }) {
  const data = await getAuditData(params.id);
  if (!data) notFound();

  const { game, cols, uids, playerNames, joinTimes, pbMap, betById, resolveTs, gameEvents, actionMap, fantasyByUid } = data;

  const playedAt = game.created_at
    ? new Date(game.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  // For each col, build per-player activity + latency
  function getActivity(uid: string, col: typeof cols[0]): { activity: string; latency: string | null } {
    const openedBet = (Object.values(betById)).find(b => b.created_at === col.ts);
    const resolvedBid = Object.entries(resolveTs).find(([, rts]) => rts === col.ts)?.[0];

    if (openedBet) {
      const bid = openedBet.bet_id;
      const action = actionMap[uid]?.[bid];
      if (action) {
        if (action.action === 'bet_placed') {
          return {
            activity: `Picked: ${action.pick}\n(${action.amount} pts)`,
            latency: action.latency != null ? `${action.latency}s` : null,
          };
        }
        if (action.action === 'bet_dismissed') {
          return {
            activity: 'DISMISSED',
            latency: action.latency != null ? `${action.latency}s` : null,
          };
        }
        if (action.action === 'bet_ignored') return { activity: 'TIMED OUT', latency: null };
      }
      // Fall back to player_bets table
      const pb = pbMap[uid]?.[bid];
      if (pb) return { activity: `Picked: ${pb.pick}\n(${pb.amount} pts)`, latency: null };
      return { activity: 'DID NOT BET', latency: null };
    }

    if (resolvedBid) {
      const pb = pbMap[uid]?.[resolvedBid];
      if (!pb) return { activity: 'DID NOT BET', latency: null };
      const ge = gameEvents.find(g => g.bet_id === resolvedBid && !g.event_type);
      const winner = ge?.winning_option;
      if (pb.status === 'won') return { activity: 'WON ✓', latency: null };
      if (pb.status === 'lost') return { activity: 'LOST ✗', latency: null };
      if (pb.status === 'voided' || pb.status === 'refunded') return { activity: 'REFUNDED', latency: null };
      if (winner) {
        return pb.pick === winner
          ? { activity: 'WON ✓', latency: null }
          : { activity: 'LOST ✗', latency: null };
      }
      return { activity: 'DID NOT BET', latency: null };
    }

    return { activity: '—', latency: null };
  }

  const STICKY = 'sticky left-0 z-10 bg-white border-r border-border';
  const STICKY_HDR = 'sticky left-0 z-20 bg-gray-50 border-r border-border';
  const COL = 'min-w-[140px] max-w-[180px]';

  return (
    <div className="p-5 pb-10">
      <div className="mb-4">
        <Link href="/games" className="text-xs text-muted hover:text-gray-900 transition-colors">← Games</Link>
        <h1 className="text-lg font-semibold text-gray-900 mt-1">
          Game Audit · <span className="font-mono">{game.join_code}</span>
        </h1>
        <p className="text-secondary text-sm">
          {game.away_team} vs {game.home_team} · {game.sport}
          {playedAt && <span className="text-muted ml-2">· {playedAt}</span>}
        </p>
      </div>

      <div className="card p-0 overflow-x-auto text-xs">
        <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${140 + cols.length * 155}px` }}>
          <thead>
            {/* UTC */}
            <tr className="border-b border-border bg-gray-50">
              <th className={`${STICKY_HDR} px-3 py-2 text-left font-semibold text-muted uppercase tracking-wider w-36`}>UTC</th>
              {cols.map((c, i) => (
                <th key={i} className={`${COL} px-2 py-2 text-center font-mono font-bold text-gray-700 border-l border-border`}>{c.utc}</th>
              ))}
            </tr>
            {/* Game Clock */}
            <tr className="border-b border-border bg-gray-50">
              <th className={`${STICKY_HDR} px-3 py-2 text-left font-semibold text-muted uppercase tracking-wider`}>Game Clock</th>
              {cols.map((c, i) => (
                <td key={i} className={`${COL} px-2 py-1.5 text-center text-secondary border-l border-border`}>{c.gameClock}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* GAME EVENTS header */}
            <tr className="border-b border-border">
              <td colSpan={cols.length + 1} className="px-3 py-1 bg-amber-dim text-amber font-bold uppercase tracking-widest">
                GAME EVENTS
              </td>
            </tr>

            {/* Bets */}
            <tr className="border-b border-border">
              <td className={`${STICKY} px-3 py-2 font-semibold text-gray-700 align-top`}>Bets</td>
              {cols.map((c, i) => (
                <td key={i} className={`${COL} px-2 py-2 border-l border-border align-top`}>
                  {!c.betEvent ? (
                    <span className="text-muted">—</span>
                  ) : c.betEvent.type === 'open' ? (
                    <div>
                      <div className="font-semibold text-amber">BET OPEN</div>
                      <div className="text-gray-700 mt-0.5 leading-tight">{c.betEvent.question}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-success">BET RESOLVED</div>
                      <div className="text-gray-700 mt-0.5 leading-tight">{c.betEvent.question}</div>
                      {c.betEvent.winner && (
                        <div className="text-secondary mt-0.5">Winner: {c.betEvent.winner}</div>
                      )}
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* PLAYER RESPONSES header */}
            <tr className="border-b border-border">
              <td colSpan={cols.length + 1} className="px-3 py-1 bg-amber-dim text-amber font-bold uppercase tracking-widest">
                PLAYER RESPONSES
              </td>
            </tr>

            {/* Per-player rows */}
            {uids.map(uid => (
              <>
                {/* Player name bar */}
                <tr key={`h-${uid}`} className="border-b border-border bg-gray-50">
                  <td className={`${STICKY_HDR} px-3 py-1.5 font-semibold text-gray-900`}>
                    {playerNames[uid]}
                  </td>
                  <td colSpan={cols.length} className="px-3 py-1.5 text-muted border-l border-border">
                    Join time: {joinTimes[uid] ?? '—'}
                  </td>
                </tr>
                {/* Player Activity row */}
                <tr key={`a-${uid}`} className="border-b border-border">
                  <td className={`${STICKY} px-3 py-2 text-muted align-top`}>Player Activity</td>
                  {cols.map((c, ci) => {
                    const { activity } = getActivity(uid, c);
                    return (
                      <td key={ci} className={`${COL} px-2 py-2 text-center border-l border-border align-top`}>
                        <ResponseCell r={activity} />
                      </td>
                    );
                  })}
                </tr>
                {/* Latency row */}
                <tr key={`l-${uid}`} className="border-b border-border">
                  <td className={`${STICKY} px-3 py-1.5 text-muted align-top italic`}>Latency</td>
                  {cols.map((c, ci) => {
                    const { latency } = getActivity(uid, c);
                    return (
                      <td key={ci} className={`${COL} px-2 py-1.5 text-center border-l border-border align-top text-muted`}>
                        {latency ?? '—'}
                      </td>
                    );
                  })}
                </tr>
                {/* Fantasy Pts row */}
                <tr key={`f-${uid}`} className="border-b border-border">
                  <td className={`${STICKY} px-3 py-1.5 text-muted align-top italic`}>Fantasy Pts</td>
                  {cols.map((_, ci) => (
                    <td key={ci} className={`${COL} px-2 py-1.5 text-center border-l border-border align-top text-secondary`}>
                      {ci === cols.length - 1 && fantasyByUid[uid]
                        ? <span className="font-medium text-amber">{fantasyByUid[uid]}</span>
                        : '—'}
                    </td>
                  ))}
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
