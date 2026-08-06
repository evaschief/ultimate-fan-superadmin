import { supabase } from '@/lib/supabase';
import VenuesClient from './VenuesClient';

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
