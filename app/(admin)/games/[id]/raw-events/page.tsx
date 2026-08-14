import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getGame } from '../GameHeader';
import { GAME_EVENT_COLUMNS, RawEventRow } from '../eventFormat';
import EventTable from '../EventTable';

// Every `game_events` row for this game, unfiltered and in the order written —
// gameplay feed, bet lifecycle, fantasy credits, audit-sheet column mappings
// and claim rows alike. This is the debugging view; the Game Events tab is the
// same table over the gameplay rows only.
async function getRawEvents(gameId: string): Promise<RawEventRow[]> {
  const { data } = await supabase
    .from('game_events')
    .select('*')
    .eq('game_code', gameId)
    .order('created_at', { ascending: true })
    .limit(3000);

  return (data ?? []) as unknown as RawEventRow[];
}

export default async function RawEventsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const events = await getRawEvents(game.id);

  return (
    <div className="p-5 pb-10 max-w-6xl">
      <GameHeader game={game} active="raw-events" />
      <p className="text-secondary text-sm mb-1">
        Every row written to <span className="font-mono">game_events</span> for this game, in
        write order — nothing filtered out.
      </p>
      <p className="text-muted text-xs mb-1">
        One column per column on the table, all {GAME_EVENT_COLUMNS.length} of them, showing the
        stored value exactly. Expand <span className="font-mono">event_data</span> for the full
        payload; use the toggle to drop columns with no value for this game.
      </p>
      {/* Stated once rather than as a column repeating one value down every row —
          game_id and game_code hold the same value on every row in the table. */}
      <p className="text-muted text-xs mb-3 font-mono">game_id / game_code: {game.id}</p>
      <EventTable events={events} withSearch />
    </div>
  );
}
