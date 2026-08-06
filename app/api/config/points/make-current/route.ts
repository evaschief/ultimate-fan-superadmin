import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

const CONFIG_KEY = 'scoring_config';

// POST — promote an existing version to isCurrent = true
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { versionId } = await req.json();
  if (!versionId) return NextResponse.json({ error: 'Missing versionId' }, { status: 400 });

  // Fetch existing config
  const { data, error } = await supabase
    .from('admin_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  }

  const versions: object[] = data.value?.versions ?? [];
  const targetExists = versions.some((v: object & { id?: string }) => v.id === versionId);
  if (!targetExists) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const updated = versions.map((v: object & { id?: string }) => ({
    ...v,
    isCurrent: v.id === versionId,
  }));

  const { error: upsertError } = await supabase
    .from('admin_config')
    .upsert({ key: CONFIG_KEY, value: { versions: updated } }, { onConflict: 'key' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
