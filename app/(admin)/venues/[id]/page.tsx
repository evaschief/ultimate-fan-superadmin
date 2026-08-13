import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TimezoneEditor from './TimezoneEditor';
import VenueCodeEditor from './VenueCodeEditor';
import AutoClaimToggle from './AutoClaimToggle';

export const dynamic = 'force-dynamic';

interface VenueGame {
  id: string;
  joinCode: string;
  hasCode: boolean;
  sport: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  createdAt: string | null;
}

async function getVenue(id: string) {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, city, timezone, venue_code, is_active, created_at, auto_claim_games')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[venue detail] getVenue error for id', id, error);
  }
  return data;
}

async function getVenueGames(locationId: string): Promise<VenueGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select('id, join_code, sport, status, home_team, away_team, home_score, away_score, scheduled_at, created_at')
    .eq('location_id', locationId)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    joinCode: row.join_code ?? row.id,
    hasCode: row.join_code != null,
    sport: row.sport ?? 'NHL',
    status: row.status ?? 'lobby',
    homeTeam: row.home_team ?? '',
    awayTeam: row.away_team ?? '',
    homeScore: row.home_score ?? 0,
    awayScore: row.away_score ?? 0,
    scheduledAt: row.scheduled_at ?? null,
    createdAt: row.created_at ?? null,
  }));
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'live'  ? 'bg-success/10 text-success border-success/30'
            : status === 'lobby' ? 'bg-amber-dim text-amber border-amber-border'
            : 'bg-gray-100 text-muted border-border';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {status === 'live' ? '● LIVE' : status.toUpperCase()}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default async function VenueSchedulePage({ params }: { params: { id: string } }) {
  const venue = await getVenue(params.id);
  if (!venue) notFound();

  const games = await getVenueGames(params.id);
  const now = Date.now();
  const upcoming = games.filter(g => g.scheduledAt && new Date(g.scheduledAt).getTime() > now && g.status !== 'ended');
  const live      = games.filter(g => g.status === 'live');
  const past      = games.filter(g => g.status === 'ended' || (!upcoming.includes(g) && !live.includes(g)));

  function Section({ title, rows }: { title: string; rows: VenueGame[] }) {
    if (!rows.length) return null;
    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">{title}</p>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((g, i) => (
                <tr key={g.id} className={i % 2 === 0 ? 'bg-white border-b border-border last:border-0' : 'bg-gray-50/50 border-b border-border last:border-0'}>
                  <td className="px-3 py-2">
                    {g.hasCode ? (
                      <Link href={`/games/${g.id}`} className="font-mono font-semibold text-gray-900 hover:underline">
                        {g.joinCode}
                      </Link>
                    ) : (
                      <Link href={`/games/${g.id}`} className="text-xs text-muted italic hover:underline">
                        Code not assigned yet
                      </Link>
                    )}
                    <div className="text-xs text-secondary mt-0.5">
                      {g.awayTeam && g.homeTeam ? `${g.awayTeam} vs ${g.homeTeam}` : '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-secondary">{g.sport}</td>
                  <td className="px-3 py-2 font-mono text-gray-900">
                    {g.status !== 'lobby' ? `${g.awayScore} – ${g.homeScore}` : '—'}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={g.status} /></td>
                  <td className="px-3 py-2 text-secondary">
                    {g.scheduledAt ? fmtDate(g.scheduledAt) : fmtDate(g.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <Link href="/venues" className="text-xs text-secondary hover:text-gray-900 mb-2 inline-block">← Venues</Link>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{venue.name}</h1>
          <p className="text-secondary text-sm mt-1">
            {venue.city || '—'} · {games.length} game{games.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VenueCodeEditor locationId={venue.id} initialCode={venue.venue_code ?? ''} />
          <TimezoneEditor locationId={venue.id} initialTimezone={venue.timezone ?? 'America/New_York'} />
          <AutoClaimToggle locationId={venue.id} initialValue={venue.auto_claim_games ?? false} />
          {venue.is_active ? (
            <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-semibold">Active</span>
          ) : (
            <span className="text-xs bg-gray-100 text-muted border border-border px-2 py-0.5 rounded-full font-semibold">Inactive</span>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="card text-center py-16 text-muted">No games scheduled at this venue yet</div>
      ) : (
        <>
          <Section title="Live" rows={live} />
          <Section title="Upcoming" rows={upcoming} />
          <Section title="Past" rows={past} />
        </>
      )}
    </div>
  );
}
