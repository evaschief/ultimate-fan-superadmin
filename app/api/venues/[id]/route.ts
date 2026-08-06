import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

// PATCH — update an existing venue (locations row). Currently only supports
// updating `timezone` (IANA string, e.g. "America/New_York"), used to show
// game start times in the venue's local time rather than the user's device
// timezone. Extend here if other fields need editing later.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const timezone = (body.timezone ?? '').trim();
  if (!timezone) {
    return NextResponse.json({ error: 'Timezone is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('locations')
    .update({ timezone })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
