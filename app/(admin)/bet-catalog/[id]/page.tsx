import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BetCatalogEditor, { EditableBet } from './BetCatalogEditor';

export default async function BetCatalogEditPage({ params }: { params: { id: string } }) {
  const { data } = await supabase.from('bet_catalog').select('*').eq('id', params.id).maybeSingle();
  if (!data) notFound();
  const bet = data as EditableBet;
  return <div className="p-5 pb-10 max-w-6xl">
    <Link href={`/bet-catalog?sport=${encodeURIComponent(bet.sport)}`} className="text-sm text-secondary hover:text-gray-900">← Bet Catalogue</Link>
    <div className="mt-4 mb-5"><h1 className="text-lg font-semibold text-gray-900">Edit {bet.bet_name}</h1><p className="text-sm text-secondary mt-1">Changes are saved directly to <span className="font-mono">bet_catalog</span>.</p></div>
    <BetCatalogEditor initialBet={bet} />
  </div>;
}
