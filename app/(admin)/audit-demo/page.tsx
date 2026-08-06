import Link from 'next/link';

// ── Mock data based on game N739: SF vs DET, NFL ─────────────────────────────

const GAME = { joinCode: 'N739', sport: 'NFL', away: 'SF', home: 'DET', playedAt: 'Jul 28, 2026, 4:21 PM' };

interface Col {
  utc: string;
  gameClock: string;
  betEvent: { type: 'open' | 'resolved'; question: string; winner?: string } | null;
  scoreEvent: string | null;
  periodEvent: string | null;
}

const COLS: Col[] = [
  { utc: '16:22', gameClock: 'Q1 14:57', betEvent: { type: 'open', question: 'Will there be a TD in the 1st quarter?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:56', betEvent: { type: 'open', question: 'Who scores first in Q1?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:54', betEvent: { type: 'open', question: 'First Sack' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:53', betEvent: { type: 'open', question: 'Game Winner' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:52', betEvent: { type: 'open', question: 'Opening Kickoff' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:50', betEvent: { type: 'open', question: 'TD or FG?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:49', betEvent: { type: 'open', question: 'Will the opening drive score?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:22', gameClock: 'Q1 14:48', betEvent: { type: 'open', question: 'Will there be a safety in this game?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:23', gameClock: 'Q1 13:09', betEvent: { type: 'resolved', question: 'Who scores first in Q1?', winner: 'SF' }, scoreEvent: null, periodEvent: null },
  { utc: '16:23', gameClock: 'Q1 13:08', betEvent: { type: 'resolved', question: 'Will the opening drive score?', winner: 'YES' }, scoreEvent: null, periodEvent: null },
  { utc: '16:23', gameClock: 'Q1 13:07', betEvent: { type: 'open', question: 'Will any player score 2+ touchdowns?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:24', gameClock: 'Q1 13:07', betEvent: { type: 'resolved', question: 'Opening Kickoff', winner: 'Touchback' }, scoreEvent: null, periodEvent: null },
  { utc: '16:27', gameClock: 'Q1 9:44',  betEvent: { type: 'open', question: 'Which QB gets sacked more today?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:27', gameClock: 'Q1 9:45',  betEvent: null, scoreEvent: 'SACK\nBosa · SF', periodEvent: null },
  { utc: '16:30', gameClock: 'Q1 6:19',  betEvent: { type: 'resolved', question: 'Which team scores next?', winner: 'SF' }, scoreEvent: null, periodEvent: null },
  { utc: '16:30', gameClock: 'Q1 6:20',  betEvent: null, scoreEvent: 'RUSHING TD 🏈\nMcCaffrey · SF · Q1\n7–0', periodEvent: null },
  { utc: '16:34', gameClock: 'Q1 0:00',  betEvent: null, scoreEvent: null, periodEvent: '← Q1 ended' },
  { utc: '16:34', gameClock: 'Q2 14:57', betEvent: { type: 'resolved', question: 'Total Q1 points: Over/Under 10?', winner: 'Under' }, scoreEvent: null, periodEvent: null },
  { utc: '16:35', gameClock: 'Q2 14:55', betEvent: { type: 'open', question: 'Will there be a defensive or return touchdown?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:35', gameClock: 'Q2 14:50', betEvent: { type: 'open', question: 'Will any QB pass for 300+ yards?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:36', gameClock: 'Q2 12:28', betEvent: { type: 'resolved', question: 'Which team scores next?', winner: 'DET' }, scoreEvent: null, periodEvent: null },
  { utc: '16:36', gameClock: 'Q2 12:30', betEvent: null, scoreEvent: 'FIELD GOAL 🎯\nPatterson · 48yd · DET · Q2\n7–10', periodEvent: null },
  { utc: '16:38', gameClock: 'Q2 9:52',  betEvent: { type: 'open', question: 'Who scores next in Q2?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:39', gameClock: 'Q2 7:40',  betEvent: { type: 'open', question: 'Which team scores next?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:39', gameClock: 'Q2 7:38',  betEvent: { type: 'resolved', question: 'Next score: TD or Field Goal?', winner: 'TD' }, scoreEvent: null, periodEvent: null },
  { utc: '16:40', gameClock: 'Q2 4:13',  betEvent: { type: 'open', question: 'Which team scores next?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:40', gameClock: 'Q2 4:15',  betEvent: null, scoreEvent: 'RUSHING TD 🏈\nKittle · SF · Q2\n21–10', periodEvent: null },
  { utc: '16:42', gameClock: 'Q2 1:43',  betEvent: { type: 'resolved', question: 'Which team scores next?', winner: 'DET' }, scoreEvent: null, periodEvent: null },
  { utc: '16:42', gameClock: 'Q2 1:45',  betEvent: null, scoreEvent: 'RUSHING TD 🏈\nGoff · DET · Q2\n21–17', periodEvent: null },
  { utc: '16:43', gameClock: 'Q2 0:00',  betEvent: null, scoreEvent: null, periodEvent: '← Q2 ended' },
  { utc: '16:45', gameClock: 'Q3 15:00', betEvent: { type: 'open', question: 'Will any player rush for 100+ yards?' }, scoreEvent: null, periodEvent: 'Q3 started →' },
  { utc: '16:45', gameClock: 'Q3 14:54', betEvent: { type: 'open', question: 'Will any receiver catch for 100+ yards?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:46', gameClock: 'Q3 10:52', betEvent: { type: 'resolved', question: 'Which team scores next?', winner: 'DET' }, scoreEvent: null, periodEvent: null },
  { utc: '16:47', gameClock: 'Q3 8:20',  betEvent: null, scoreEvent: 'RUSHING TD 🏈\nSt. Brown · DET · Q3\n21–24', periodEvent: null },
  { utc: '16:47', gameClock: 'Q3 5:33',  betEvent: { type: 'open', question: 'Which team scores next?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:49', gameClock: 'Q3 2:08',  betEvent: { type: 'resolved', question: 'Which team scores next?', winner: 'SF' }, scoreEvent: null, periodEvent: null },
  { utc: '16:49', gameClock: 'Q3 2:10',  betEvent: null, scoreEvent: 'FIELD GOAL 🎯\nMcPherson · 44yd · SF · Q3\n24–24', periodEvent: null },
  { utc: '16:50', gameClock: 'Q3 0:00',  betEvent: null, scoreEvent: null, periodEvent: '← Q3 ended' },
  { utc: '16:50', gameClock: 'Q4 15:00', betEvent: null, scoreEvent: 'FIELD GOAL 🎯\nMcPherson · 37yd · SF · Q4\n27–24', periodEvent: 'Q4 started →' },
  { utc: '16:52', gameClock: 'Q4 11:40', betEvent: { type: 'open', question: 'Which team scores next?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:52', gameClock: 'Q4 11:37', betEvent: { type: 'resolved', question: 'Next score: TD or Field Goal?', winner: 'TD' }, scoreEvent: null, periodEvent: null },
  { utc: '16:52', gameClock: 'Q4 11:35', betEvent: { type: 'resolved', question: 'Who scores first in Q4?', winner: 'SF' }, scoreEvent: null, periodEvent: null },
  { utc: '16:53', gameClock: 'Q4 9:04',  betEvent: { type: 'open', question: 'Who scores next in Q4?' }, scoreEvent: null, periodEvent: null },
  { utc: '16:55', gameClock: 'Q4 4:20',  betEvent: { type: 'resolved', question: 'Which team scores next?', winner: 'SF' }, scoreEvent: null, periodEvent: null },
  { utc: '16:56', gameClock: 'Q4 4:22',  betEvent: null, scoreEvent: 'RUSHING TD 🏈\nMcCaffrey · SF · Q4\n34–24', periodEvent: null },
  { utc: '16:56', gameClock: 'Q4 0:00',  betEvent: { type: 'resolved', question: 'Score on this possession?', winner: 'TD' }, scoreEvent: null, periodEvent: '← Q4 ended' },
  { utc: '16:58', gameClock: 'FINAL',    betEvent: { type: 'resolved', question: 'Game Winner', winner: 'SF' }, scoreEvent: null, periodEvent: null },
  { utc: '16:58', gameClock: 'FINAL',    betEvent: { type: 'resolved', question: 'Which defense gets more sacks?', winner: 'DET' }, scoreEvent: null, periodEvent: null },
  { utc: '16:59', gameClock: 'FINAL',    betEvent: { type: 'resolved', question: 'Will any QB pass for 300+ yards?', winner: 'NO' }, scoreEvent: null, periodEvent: null },
  { utc: '16:59', gameClock: 'FINAL',    betEvent: { type: 'resolved', question: 'Will any player score 2+ touchdowns?', winner: 'YES' }, scoreEvent: null, periodEvent: null },
];

interface PlayerColData {
  response: string;
}

interface Player {
  name: string;
  joinTime: string;
  cols: PlayerColData[];
}

const PLAYERS: Player[] = [
  {
    name: 'EV',
    joinTime: '16:21',
    cols: [
      { response: 'Picked: NO\n(50 pts) · 4s' },
      { response: 'DISMISSED · 2s' },
      { response: 'Picked: BUF\n(235 pts) · 11s' },
      { response: 'Picked: KC\n(245 pts) · 7s' },
      { response: 'Picked: BUF\n(110 pts) · 9s' },
      { response: 'Picked: TD\n(80 pts) · 6s' },
      { response: 'TIMED OUT' },
      { response: 'TIMED OUT' },
      { response: 'DID NOT BET' },
      { response: 'DID NOT BET' },
      { response: 'TIMED OUT' },
      { response: 'LOST ✗\n(bet BUF · 110 pts)' },
      { response: 'DID NOT BET' },
      { response: 'WON ✓\n(bet TD · 80 pts)' },
      { response: 'DISMISSED · 1s' },
      { response: '—' },
      { response: '—' },
      { response: 'DID NOT BET' },
      { response: 'TIMED OUT' },
      { response: 'DISMISSED · 5s' },
      { response: 'DID NOT BET' },
      { response: '—' },
      { response: 'TIMED OUT' },
      { response: 'TIMED OUT' },
      { response: 'LOST ✗\n(bet Field Goal · 40 pts)' },
      { response: 'Picked: SF\n(45 pts) · 3s' },
      { response: '—' },
      { response: 'LOST ✗\n(bet NO · 15 pts)' },
      { response: '—' },
      { response: '—' },
      { response: 'DISMISSED · 8s' },
      { response: 'TIMED OUT' },
      { response: 'DISMISSED · 2s' },
      { response: '—' },
      { response: 'DID NOT BET' },
      { response: '—' },
      { response: '—' },
      { response: '—' },
      { response: 'TIMED OUT' },
      { response: '—' },
      { response: 'WON ✓\n(bet TD · 10 pts)' },
      { response: 'WON ✓\n(bet SF · 20 pts)' },
      { response: 'DISMISSED · 4s' },
      { response: '—' },
      { response: 'DID NOT BET' },
      { response: 'REFUNDED\n(bet NO · 5 pts)' },
      { response: 'DID NOT BET' },
      { response: 'REFUNDED\n(bet KC · 245 pts)' },
      { response: '—' },
      { response: '—' },
    ],
  },
  {
    name: 'Jordan M.',
    joinTime: '16:22',
    cols: [
      { response: 'Picked: YES\n(100 pts) · 8s' },
      { response: 'Picked: DET\n(80 pts) · 5s' },
      { response: 'TIMED OUT' },
      { response: 'Picked: DET\n(120 pts) · 14s' },
      { response: 'Picked: Touchback\n(60 pts) · 3s' },
      { response: 'Picked: FG\n(40 pts) · 6s' },
      { response: 'Picked: YES\n(50 pts) · 9s' },
      { response: 'DISMISSED · 7s' },
      { response: 'LOST ✗\n(bet DET · 80 pts)' },
      { response: 'WON ✓\n(bet YES · 50 pts)' },
      { response: 'Picked: YES\n(70 pts) · 12s' },
      { response: 'WON ✓\n(bet Touchback · 60 pts)' },
      { response: 'Picked: Goff\n(90 pts) · 4s' },
      { response: '—' },
      { response: 'DISMISSED · 2s' },
      { response: '—' },
      { response: '—' },
      { response: 'WON ✓\n(bet Under · — pts)' },
      { response: 'TIMED OUT' },
      { response: 'Picked: YES\n(55 pts) · 7s' },
      { response: 'DID NOT BET' },
      { response: '—' },
      { response: 'Picked: McCaffrey\n(80 pts) · 6s' },
      { response: 'Picked: SF\n(60 pts) · 10s' },
      { response: 'LOST ✗\n(bet FG · 40 pts)' },
      { response: 'Picked: SF\n(45 pts) · 5s' },
      { response: '—' },
      { response: 'WON ✓\n(bet SF · 45 pts)' },
      { response: '—' },
      { response: '—' },
      { response: 'DISMISSED · 3s' },
      { response: 'TIMED OUT' },
      { response: 'DISMISSED · 6s' },
      { response: '—' },
      { response: 'Picked: DET\n(30 pts) · 11s' },
      { response: 'LOST ✗\n(bet DET · 30 pts)' },
      { response: '—' },
      { response: '—' },
      { response: 'Picked: SF\n(50 pts) · 4s' },
      { response: 'LOST ✗\n(bet TD · 10 pts)' },
      { response: 'WON ✓\n(bet TD · — pts)' },
      { response: 'WON ✓\n(bet SF · — pts)' },
      { response: 'Picked: McCaffrey\n(60 pts) · 9s' },
      { response: '—' },
      { response: 'WON ✓\n(bet SF · 50 pts)' },
      { response: 'WON ✓\n(bet TD · — pts)' },
      { response: '—' },
      { response: 'WON ✓\n(bet DET · — pts)' },
      { response: 'LOST ✗\n(bet YES · — pts)' },
      { response: 'LOST ✗\n(bet YES · 70 pts)' },
    ],
  },
  {
    name: 'Sam K.',
    joinTime: '16:22',
    cols: [
      { response: 'Picked: YES\n(60 pts) · 2s' },
      { response: 'Picked: SF\n(100 pts) · 6s' },
      { response: 'Picked: Bosa\n(70 pts) · 3s' },
      { response: 'Picked: SF\n(90 pts) · 8s' },
      { response: 'DISMISSED · 1s' },
      { response: 'Picked: TD\n(50 pts) · 5s' },
      { response: 'Picked: NO\n(40 pts) · 4s' },
      { response: 'Picked: NO\n(30 pts) · 10s' },
      { response: 'WON ✓\n(bet SF · 100 pts)' },
      { response: 'LOST ✗\n(bet NO · 40 pts)' },
      { response: 'TIMED OUT' },
      { response: 'DID NOT BET' },
      { response: 'TIMED OUT' },
      { response: '—' },
      { response: 'TIMED OUT' },
      { response: '—' },
      { response: '—' },
      { response: 'DID NOT BET' },
      { response: 'DISMISSED · 9s' },
      { response: 'TIMED OUT' },
      { response: 'DID NOT BET' },
      { response: '—' },
      { response: 'Picked: Kittle\n(45 pts) · 7s' },
      { response: 'Picked: SF\n(75 pts) · 4s' },
      { response: 'WON ✓\n(bet TD · 50 pts)' },
      { response: 'DISMISSED · 3s' },
      { response: '—' },
      { response: 'WON ✓\n(bet SF · 75 pts)' },
      { response: '—' },
      { response: '—' },
      { response: 'Picked: YES\n(55 pts) · 6s' },
      { response: 'TIMED OUT' },
      { response: 'DISMISSED · 2s' },
      { response: '—' },
      { response: 'Picked: SF\n(80 pts) · 5s' },
      { response: '—' },
      { response: '—' },
      { response: '—' },
      { response: 'TIMED OUT' },
      { response: '—' },
      { response: 'WON ✓\n(bet TD · — pts)' },
      { response: 'WON ✓\n(bet SF · — pts)' },
      { response: 'DISMISSED · 4s' },
      { response: '—' },
      { response: 'WON ✓\n(bet SF · 80 pts)' },
      { response: 'WON ✓\n(bet TD · — pts)' },
      { response: '—' },
      { response: 'LOST ✗\n(bet DET · — pts)' },
      { response: 'DID NOT BET' },
      { response: 'WON ✓\n(bet YES · — pts)' },
    ],
  },
];

// ── Styling helpers ────────────────────────────────────────────────────────────

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

// Render a response cell — splits latency suffix onto its own muted line
function ResponseCell({ r }: { r: string }) {
  if (r.startsWith('Picked') && r.includes(' · ') && /· \d+s$/.test(r)) {
    const latencyMatch = r.match(/ · (\d+s)$/);
    const latency = latencyMatch?.[1];
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditDemoPage() {
  const STICKY = 'sticky left-0 z-10 bg-white border-r border-border';
  const STICKY_HDR = 'sticky left-0 z-20 bg-gray-50 border-r border-border';
  const COL = 'min-w-[150px] max-w-[190px]';

  return (
    <div className="p-5 pb-10">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/games" className="text-xs text-muted hover:text-gray-900 transition-colors">← Games</Link>
            <span className="text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded">DEMO</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mt-1">
            Game Audit · <span className="font-mono">{GAME.joinCode}</span>
          </h1>
          <p className="text-secondary text-sm">
            {GAME.away} vs {GAME.home} · {GAME.sport}
            <span className="text-muted ml-2">· {GAME.playedAt}</span>
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto text-xs">
        <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${160 + COLS.length * 165}px` }}>
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className={`${STICKY_HDR} px-3 py-2 text-left font-semibold text-muted uppercase tracking-wider w-40`}>UTC</th>
              {COLS.map((c, i) => (
                <th key={i} className={`${COL} px-2 py-2 text-center font-mono font-bold text-gray-700 border-l border-border`}>{c.utc}</th>
              ))}
            </tr>
            <tr className="border-b border-border bg-gray-50">
              <th className={`${STICKY_HDR} px-3 py-2 text-left font-semibold text-muted uppercase tracking-wider`}>Game Clock</th>
              {COLS.map((c, i) => (
                <td key={i} className={`${COL} px-2 py-1.5 text-center text-secondary border-l border-border`}>{c.gameClock}</td>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* GAME EVENTS */}
            <tr className="border-b border-border">
              <td colSpan={COLS.length + 1} className="px-3 py-1 bg-amber-dim text-amber font-bold uppercase tracking-widest">
                GAME EVENTS
              </td>
            </tr>

            {/* Bets */}
            <tr className="border-b border-border">
              <td className={`${STICKY} px-3 py-2 font-semibold text-gray-700 align-top`}>Bets</td>
              {COLS.map((c, i) => (
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
                      {c.betEvent.winner && <div className="text-secondary mt-0.5">Winner: {c.betEvent.winner}</div>}
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Goals / Scores */}
            <tr className="border-b border-border">
              <td className={`${STICKY} px-3 py-2 font-semibold text-gray-700 align-top`}>Goals / Scores</td>
              {COLS.map((c, i) => (
                <td key={i} className={`${COL} px-2 py-2 border-l border-border align-top`}>
                  {c.scoreEvent ? (
                    <div className="font-medium text-gray-700 leading-tight whitespace-pre-line">{c.scoreEvent}</div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Periods */}
            <tr className="border-b border-border">
              <td className={`${STICKY} px-3 py-2 font-semibold text-gray-700`}>Periods</td>
              {COLS.map((c, i) => (
                <td key={i} className={`${COL} px-2 py-2 text-center border-l border-border`}>
                  {c.periodEvent ? (
                    <span className="text-secondary italic">{c.periodEvent}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* PLAYER RESPONSES */}
            <tr className="border-b border-border">
              <td colSpan={COLS.length + 1} className="px-3 py-1 bg-amber-dim text-amber font-bold uppercase tracking-widest">
                PLAYER RESPONSES
              </td>
            </tr>

            {PLAYERS.map((player, pi) => (
              <>
                <tr key={`h-${pi}`} className="border-b border-border bg-gray-50">
                  <td className={`${STICKY_HDR} px-3 py-1.5 font-semibold text-gray-900`}>{player.name}</td>
                  <td colSpan={COLS.length} className="px-3 py-1.5 text-muted border-l border-border">
                    Join time: {player.joinTime}
                  </td>
                </tr>
                <tr key={`r-${pi}`} className="border-b border-border">
                  <td className={`${STICKY} px-3 py-2 text-muted align-top`}>Response</td>
                  {player.cols.map((cell, ci) => (
                    <td key={ci} className={`${COL} px-2 py-2 text-center border-l border-border align-top`}>
                      <ResponseCell r={cell.response} />
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
