import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';
import { ScoringConfig } from '@/types';

const CONFIG_KEY = 'scoring_config';

// GET — list the last 20 config versions
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('admin_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const versions = data?.value?.versions ?? [];
  // Return last 20, newest first
  const sorted = [...versions].reverse().slice(0, 20);
  return NextResponse.json({ versions: sorted });
}

// POST — save a new config version, mark it as current
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const config: ScoringConfig = body.config;
  const label: string = body.label ?? '';

  if (!config?.hockey || !config?.football || !config?.betMultipliers || !config?.betWindowSeconds) {
    return NextResponse.json({ error: 'Invalid config shape' }, { status: 400 });
  }

  // Fetch existing versions
  const { data: existing } = await supabase
    .from('admin_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .single();

  const prevVersions: object[] = existing?.value?.versions ?? [];

  // Mark all existing as not current
  const updatedPrev = prevVersions.map((v: object) => ({ ...v, isCurrent: false }));

  const newId = uuidv4();
  const newVersion = {
    id: newId,
    isCurrent: true,
    savedBy: session.email,
    label,
    createdAt: new Date().toISOString(),
    config,
  };

  // Keep last 20 (append new, trim to 20)
  const allVersions = [...updatedPrev, newVersion].slice(-20);

  const { error } = await supabase
    .from('admin_config')
    .upsert({ key: CONFIG_KEY, value: { versions: allVersions } }, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: newId, ok: true });
}
