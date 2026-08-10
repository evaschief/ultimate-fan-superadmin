import { supabase } from '@/lib/supabase';
import VenuesClient from './VenuesClient';

// BUG FIX: this list page had no dynamic-rendering directive, so Next.js
// could serve it from a stale static/cached snapshot after a deploy —
// meaning a venue row that was later deleted/recreated (getting a new id)
// could still show up here linking to its OLD id. Clicking through then
// hit the detail page's force-fetch (which already had `dynamic =
// 'force-dynamic'`), found no row for that stale id, and 404'd — even
// though the venue genuinely exists under its current id. Forcing dynamic
// rendering here too keeps this list always in sync with the live table.
export const dynamic = 'force-dynamic';

interface Venue {
  id: string;
  name: string;
  city: string;
  venue_code: string | null;
  is_active: boolean;
  created_at: string | null;
  gamesCount: number;
}

async function getVenues(): Promise<Venue[]> {
  try {
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, city, venue_code, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error || !locations) return [];

    const { data: games } = await supabase
      .from('games')
      .select('location_id')
      .not('location_id', 'is', null);

    const countByLocation: Record<string, number> = {};
    for (const g of games ?? []) {
      if (g.location_id) countByLocation[g.location_id] = (countByLocation[g.location_id] ?? 0) + 1;
    }

    return locations.map(l => ({
      ...l,
      gamesCount: countByLocation[l.id] ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function VenuesPage() {
  const venues = await getVenues();
  return <VenuesClient venues={venues} />;
}
