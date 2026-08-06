import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Look up the join_code for this game
  const { data: game } = await supabase
    .from('games')
    .select('join_code, sport')
    .eq('id', id)
    .single();

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.sport !== 'NFL') return NextResponse.json({ error: 'generate-roster is NFL only' }, { status: 400 });

  // Call the Supabase edge function
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-roster`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ game_code: game.join_code }),
  });

  const result = await res.json();
  if (!res.ok) return NextResponse.json(result, { status: res.status });
  return NextResponse.json(result);
}
