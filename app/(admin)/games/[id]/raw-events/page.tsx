import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getGame } from '../GameHeader';
import { RAW_EVENT_COLUMNS, RawEvent } from '../eventFormat';
import RawEventsClient from './RawEventsClient';

// Every `game_events` row for this game, unfiltered and in the order written —
// gameplay feed, bet lifecycle, fantasy credits, audit-sheet column mappings
// and claim rows alike. This is the debugging view; the Game Events tab is the
// readable subset.
async function getRawEvents(gameId: string): Promise<RawEvent[]> {
  const { data } = await supabase
    .from('game_events')
    .select(RAW_EVENT_COLUMNS)
    .eq('game_code', gameId)
    .order('created_at', { ascending: true })
    .limit(3000);

  return (data ?? []) as unknown as RawEvent[];
}

export default async function RawEventsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const events = await getRawEvents(game.id);

  return (
    <div className="p-5 pb-10 max-w-6xl">
      <GameHeader game={game} active="raw-events" />
      <p className="text-secondary text-sm mb-3">
        Every row written to <span className="font-mono text-xs">game_events</span> for
        this game, in write order. Expand a payload to see the full{' '}
        <span className="font-mono text-xs">event_data</span> JSON.
      </p>
      <RawEventsClient events={events} />
    </div>
  );
}
