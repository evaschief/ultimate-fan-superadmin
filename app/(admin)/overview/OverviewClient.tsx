'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameMetrics } from './page';
import clsx from 'clsx';

const TARGETS = {
  NFL: { fantasy: 500, bets: 10, realTime: 5, gameTime: 2, winRatio: 0.5, dismissRate: 0.15, timeoutRate: 0.1, avgLatencySecs: 8, engagementRate: 0.85 },
  NHL: { fantasy: 500, bets: 8,  realTime: 4, gameTime: 2, winRatio: 0.5, dismissRate: 0.15, timeoutRate: 0.1, avgLatencySecs: 8, engagementRate: 0.85 },
};

function avg(data: GameMetrics[], key: keyof GameMetrics): number {
  if (data.length === 0) return 0;
  const vals = data.map(g => g[key] as number);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function dotColor(deviation: number) {
  if (deviation < 0.15) return 'bg-success';
  if (deviation < 0.30) return 'bg-amber';
  return 'bg-danger';
}

function fmtMins(v: number) {
  if (v === 0) return '—';
  const m = Math.floor(v);
  const s = Math.round((v - m) * 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

interface MetricCardProps {
  label: string;
  actual: string;
  target: string;
  deviation: number;
  onClick: () => void;
}

function MetricCard({ label, actual, target, deviation, onClick }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className="card text-left hover:shadow-md hover:border-amber transition-all w-full"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted font-medium uppercase tracking-wider leading-tight pr-2">{label}</p>
        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', dotColor(deviation))} />
      </div>
      <p className="text-xl font-bold text-gray-900">{actual}</p>
      <p className="text-xs text-muted mt-1 flex items-center gap-1">
        <span>target</span>
        <span className="font-semibold text-secondary">{target}</span>
      </p>
    </button>
  );
}

interface BreakdownSheetProps {
  title: string;
  data: GameMetrics[];
  getValue: (g: GameMetrics) => string;
  target: number;
  getRaw: (g: GameMetrics) => number;
  onClose: () => void;
}

function BreakdownSheet({ title, data, getValue, target, getRaw, onClose }: BreakdownSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-2xl max-h-[70vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {data.map(g => {
            const raw = getRaw(g);
            const dev = target === 0 ? 0 : Math.abs(raw - target) / target;
            return (
              <div key={g.gameId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', dotColor(dev))} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-900">{g.joinCode}</span>
                      {g.isSim && (
                        <span className="text-xs bg-amber-dim text-amber border border-amber-border px-1.5 py-0.5 rounded">SIM</span>
                      )}
                    </div>
                    <p className="text-xs text-secondary">
                      {g.awayTeam && g.homeTeam ? `${g.awayTeam} vs ${g.homeTeam}` : '—'}
                      {(g.scheduledAt ?? g.createdAt) && (
                        <span className="text-muted ml-1">
                          · {new Date((g.scheduledAt ?? g.createdAt) as string).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{getValue(g)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function OverviewClient({
  initialData,
  initialSport,
  initialSim,
}: {
  initialData: GameMetrics[];
  initialSport: string;
  initialSim?: boolean;
}) {
  const router = useRouter();
  const [sport, setSport] = useState(initialSport);
  const [simOnly, setSimOnly] = useState(initialSim ?? false);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<string | null>(null);

  async function navigate(s: string, sim: boolean) {
    setLoading(true);
    const params = new URLSearchParams({ sport: s });
    if (sim) params.set('sim', '1');
    router.push(`/overview?${params.toString()}`);
    const res = await fetch(`/api/overview?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function switchSport(s: string) {
    setSport(s);
    await navigate(s, simOnly);
  }

  async function toggleSim() {
    const next = !simOnly;
    setSimOnly(next);
    await navigate(sport, next);
  }

  const tgt = TARGETS[sport as 'NFL' | 'NHL'];

  const avgFantasy     = avg(data, 'avgFantasyPts');
  const avgBets        = avg(data, 'betCount');
  const avgRealTime    = avg(data, 'avgRealTimeMins');
  const avgGameTime    = avg(data, 'avgGameTimeMins');
  const avgWin         = avg(data, 'winRatio');
  const avgDismiss     = avg(data, 'dismissRate');
  const avgTimeout     = avg(data, 'timeoutRate');
  const avgLatency     = avg(data, 'avgLatencySecs');
  const avgEngagement  = avg(data, 'engagementRate');
  const hasAuditData   = data.some(g => g.dismissRate > 0 || g.timeoutRate > 0 || g.avgLatencySecs > 0);

  const metrics = [
    {
      key: 'fantasy',
      label: 'Avg Fantasy Pts / Player / Quarter',
      actual: avgFantasy === 0 ? '—' : `${Math.round(avgFantasy)} pts`,
      target: `${tgt.fantasy} pts`,
      deviation: tgt.fantasy === 0 ? 0 : Math.abs(avgFantasy - tgt.fantasy) / tgt.fantasy,
      getValue: (g: GameMetrics) => `${Math.round(g.avgFantasyPts)} pts`,
      getRaw: (g: GameMetrics) => g.avgFantasyPts,
      targetVal: tgt.fantasy,
    },
    {
      key: 'bets',
      label: 'Bets Fired / Game',
      actual: avgBets === 0 ? '—' : avgBets.toFixed(1),
      target: String(tgt.bets),
      deviation: tgt.bets === 0 ? 0 : Math.abs(avgBets - tgt.bets) / tgt.bets,
      getValue: (g: GameMetrics) => String(g.betCount),
      getRaw: (g: GameMetrics) => g.betCount,
      targetVal: tgt.bets,
    },
    {
      key: 'realTime',
      label: 'Real-Time Between Bets',
      actual: fmtMins(avgRealTime),
      target: fmtMins(tgt.realTime),
      deviation: tgt.realTime === 0 ? 0 : Math.abs(avgRealTime - tgt.realTime) / tgt.realTime,
      getValue: (g: GameMetrics) => fmtMins(g.avgRealTimeMins),
      getRaw: (g: GameMetrics) => g.avgRealTimeMins,
      targetVal: tgt.realTime,
    },
    {
      key: 'gameTime',
      label: 'Game-Time Between Bets',
      actual: fmtMins(avgGameTime),
      target: fmtMins(tgt.gameTime),
      deviation: tgt.gameTime === 0 ? 0 : Math.abs(avgGameTime - tgt.gameTime) / tgt.gameTime,
      getValue: (g: GameMetrics) => fmtMins(g.avgGameTimeMins),
      getRaw: (g: GameMetrics) => g.avgGameTimeMins,
      targetVal: tgt.gameTime,
    },
    {
      key: 'winRatio',
      label: 'Player Bet Accuracy',
      actual: avgWin === 0 ? '—' : `${(avgWin * 100).toFixed(1)}%`,
      target: `${tgt.winRatio * 100}%`,
      deviation: tgt.winRatio === 0 ? 0 : Math.abs(avgWin - tgt.winRatio) / tgt.winRatio,
      getValue: (g: GameMetrics) => `${(g.winRatio * 100).toFixed(1)}%`,
      getRaw: (g: GameMetrics) => g.winRatio,
      targetVal: tgt.winRatio,
    },
  ];

  const auditMetrics = [
    {
      key: 'engagement',
      label: 'Engagement Rate',
      actual: avgEngagement === 0 ? '—' : `${(avgEngagement * 100).toFixed(1)}%`,
      target: `${tgt.engagementRate * 100}%`,
      deviation: tgt.engagementRate === 0 ? 0 : Math.abs(avgEngagement - tgt.engagementRate) / tgt.engagementRate,
      getValue: (g: GameMetrics) => g.engagementRate > 0 ? `${(g.engagementRate * 100).toFixed(1)}%` : '—',
      getRaw: (g: GameMetrics) => g.engagementRate,
      targetVal: tgt.engagementRate,
    },
    {
      key: 'latency',
      label: 'Avg Pick Latency',
      actual: avgLatency === 0 ? '—' : `${avgLatency.toFixed(1)}s`,
      target: `${tgt.avgLatencySecs}s`,
      deviation: tgt.avgLatencySecs === 0 ? 0 : Math.abs(avgLatency - tgt.avgLatencySecs) / tgt.avgLatencySecs,
      getValue: (g: GameMetrics) => g.avgLatencySecs > 0 ? `${g.avgLatencySecs.toFixed(1)}s` : '—',
      getRaw: (g: GameMetrics) => g.avgLatencySecs,
      targetVal: tgt.avgLatencySecs,
    },
    {
      key: 'dismiss',
      label: 'Dismiss Rate',
      actual: avgDismiss === 0 ? '—' : `${(avgDismiss * 100).toFixed(1)}%`,
      target: `${tgt.dismissRate * 100}%`,
      deviation: tgt.dismissRate === 0 ? 0 : Math.abs(avgDismiss - tgt.dismissRate) / tgt.dismissRate,
      getValue: (g: GameMetrics) => g.dismissRate > 0 ? `${(g.dismissRate * 100).toFixed(1)}%` : '—',
      getRaw: (g: GameMetrics) => g.dismissRate,
      targetVal: tgt.dismissRate,
    },
    {
      key: 'timeout',
      label: 'Timeout Rate',
      actual: avgTimeout === 0 ? '—' : `${(avgTimeout * 100).toFixed(1)}%`,
      target: `${tgt.timeoutRate * 100}%`,
      deviation: tgt.timeoutRate === 0 ? 0 : Math.abs(avgTimeout - tgt.timeoutRate) / tgt.timeoutRate,
      getValue: (g: GameMetrics) => g.timeoutRate > 0 ? `${(g.timeoutRate * 100).toFixed(1)}%` : '—',
      getRaw: (g: GameMetrics) => g.timeoutRate,
      targetVal: tgt.timeoutRate,
    },
  ];

  const activeBreakdown = [...metrics, ...auditMetrics].find(m => m.key === breakdown);

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
          <p className="text-secondary text-sm mt-1">
            {data.length} {simOnly ? 'sim ' : ''}{sport} game{data.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSim}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              simOnly
                ? 'bg-amber-dim text-amber border-amber-border'
                : 'bg-white text-muted border-border hover:border-amber'
            )}
          >
            SIM
          </button>
          <div className="w-px h-4 bg-border" />
          {['NFL', 'NHL'].map(s => (
            <button
              key={s}
              onClick={() => switchSport(s)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-semibold border transition-colors',
                sport === s
                  ? 'bg-amber-dim text-amber border-amber-border'
                  : 'bg-white text-secondary border-border hover:border-amber'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="card text-center py-24 text-muted">
          No ended {sport} games yet
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(m => (
              <MetricCard
                key={m.key}
                label={m.label}
                actual={m.actual}
                target={m.target}
                deviation={m.deviation}
                onClick={() => setBreakdown(m.key)}
              />
            ))}
          </div>

          {hasAuditData && (
            <div className="mt-5">
              <p className="text-xs text-muted uppercase tracking-wider font-medium mb-3">Player Behaviour · from Audit</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {auditMetrics.map(m => (
                  <MetricCard
                    key={m.key}
                    label={m.label}
                    actual={m.actual}
                    target={m.target}
                    deviation={m.deviation}
                    onClick={() => setBreakdown(m.key)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeBreakdown && (
        <BreakdownSheet
          title={activeBreakdown.label}
          data={data}
          getValue={activeBreakdown.getValue}
          getRaw={activeBreakdown.getRaw}
          target={activeBreakdown.targetVal}
          onClose={() => setBreakdown(null)}
        />
      )}
    </div>
  );
}
