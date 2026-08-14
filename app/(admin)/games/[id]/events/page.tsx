import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameHeader, { getGame } from '../GameHeader';
import { RAW_EVENT_COLUMNS, RawEvent, isGameplayEvent } from '../eventFormat';
import GameEventsClient from './GameEventsClient';

// Gameplay feed only — bet lifecycle, fantasy credits and audit/claim
// bookkeeping are stripped out here (see APP_EVENT_TYPES) and live on the Raw
// Events tab instead, which shows every row untouched.
async function getGameplayEvents(gameId: string): Promise<RawEvent[]> {
  const { data } = await supabase
    .from('game_events')
    .select(RAW_EVENT_COLUMNS)
    .eq('game_code', gameId)
    .order('created_at', { ascending: true })
    .limit(3000);

  return ((data ?? []) as unknown as RawEvent[]).filter(isGameplayEvent);
}

export default async function GameEventsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);
  if (!game) notFound();

  const events = await getGameplayEvents(game.id);

  return (
    <div className="p-5 pb-10 max-w-6xl">
      <GameHeader game={game} active="events" />
      <p className="text-secondary text-sm mb-1">
        What happened on the field, in order — scoring plays, stat lines, period
        boundaries. Bet and fantasy-scoring rows are on the Raw Events tab.
      </p>
      {/* The table's flat play-by-play columns exist but nothing writes to them,
          so these columns are derived from event_data instead. Worth saying out
          loud: comparing this view against the column list in Supabase is
          otherwise baffling. */}
      <p className="text-muted text-xs mb-3">
        Columns are read out of <span className="font-mono">event_data</span>. The table&apos;s
        flat play-by-play columns (<span className="font-mono">period</span>,{' '}
        <span className="font-mono">clock</span>, <span className="font-mono">team</span>,{' '}
        <span className="font-mono">play_text</span>, <span className="font-mono">home_score</span>…)
        are empty on every row. Raw Events shows the stored row in full.
      </p>
      <GameEventsClient events={events} />
    </div>
  );
}
