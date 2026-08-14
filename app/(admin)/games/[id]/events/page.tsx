import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getEventCounts, getGame } from '../GameHeader';
import { GAME_EVENT_COLUMNS, RawEventRow, isGameplayEvent } from '../eventFormat';
import EventTable from '../EventTable';

// Gameplay feed only — bet lifecycle, fantasy credits and audit/claim
// bookkeeping are stripped out here (see APP_EVENT_TYPES) and live on the Raw
// Events tab instead, which shows every row untouched.
//
// Selects * because this view renders one column per database column.
async function getGameplayEvents(gameId: string): Promise<RawEventRow[]> {
  const { data } = await supabase
    .from('game_events')
    .select('*')
    .eq('game_code', gameId)
    .order('created_at', { ascending: false })
    .limit(3000);

  return ((data ?? []) as unknown as RawEventRow[]).filter(isGameplayEvent);
}

export default async function GameEventsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const counts = await getEventCounts(game.id);

  const events = await getGameplayEvents(game.id);

  return (
    <div className="p-5 pb-10 max-w-6xl">
      <GameHeader game={game} active="events" counts={counts} />
      <p className="text-secondary text-sm mb-1">
        What happened on the field, newest first — scoring plays, stat lines, period boundaries.
        Bet and fantasy-scoring rows are on the Raw Events tab.
      </p>
      <p className="text-muted text-xs mb-3">
        One column per column on <span className="font-mono">game_events</span>, all{' '}
        {GAME_EVENT_COLUMNS.length} of them, scrolling sideways. Most of the play-by-play
        columns are unwritten — use the toggle to drop the ones with no value for this game.
      </p>
      <EventTable events={events} />
    </div>
  );
}
