import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getGame } from '../GameHeader';
import { RawEventRow } from '../eventFormat';
import RawEventsClient from './RawEventsClient';

// Every `game_events` row for this game, unfiltered and in the order written —
// gameplay feed, bet lifecycle, fantasy credits, audit-sheet column mappings
// and claim rows alike. This is the debugging view; the Game Events tab is the
// readable subset.
//
// Selects * rather than a column list so an expanded row shows exactly what is
// stored, every column included. The table has 36 of them: the 6 core ones
// (id, game_id, event_type, event_data, event_id, created_at) plus game_code,
// bet_id, winning_option, and the flat play-by-play set added by
// 035_game_events_bdl_columns.sql.
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
        Every row written to <span className="font-mono text-xs">game_events</span> for
        this game, in write order. Expand a payload to see the full row exactly as stored,
        every column included.
      </p>
      {/* Answers "which game is this?" once, rather than repeating a column whose
          value is identical on every row. game_id and game_code hold the same
          value on all rows in the table. */}
      <p className="text-muted text-xs mb-3 font-mono">
        game_id / game_code: {game.id}
      </p>
      <RawEventsClient events={events} />
    </div>
  );
}
