import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import { GAME_EVENT_COLUMNS, RawEventRow } from '../eventFormat';
import EventTable from '../EventTable';

// This is the actual game_events table, not a filtered gameplay feed. The UI
// separates table columns from display-only payload extracts; it never hides
// a stored event row.
async function getGameEvents(gameId: string): Promise<RawEventRow[]> {
  const { data } = await supabase
    .from('game_events')
    .select('*')
    .eq('game_code', gameId)
    .order('created_at', { ascending: false })
    .limit(3000);

  return (data ?? []) as unknown as RawEventRow[];
}

export default async function GameEventsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const counts = await getEventCounts(game.id);

  const events = await getGameEvents(game.id);

  return (
    <div className="p-5 pb-10">
      <GameHeader game={game} active="events" counts={counts} />
      <p className="text-secondary text-sm mb-1">
        Every row stored in <span className="font-mono">game_events</span>, newest first — provider-derived events, processing claims, fantasy credits, and bet lifecycle rows.
      </p>
      <p className="text-muted text-xs mb-3">
        Every stored <span className="font-mono">game_events</span> column appears on the left; clearly labelled payload-derived reading aids appear on the right. All {GAME_EVENT_COLUMNS.length} columns scroll sideways. Use the toggle to hide stored columns with no value for this game.
      </p>
      <EventTable events={events} />
    </div>
  );
}
