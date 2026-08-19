import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { getAdminSession } from '@/lib/session';

const CONFIG_KEY = 'bet_scheduler_config';

function validConfig(config: any) {
  return config?.mode === 'shadow' && Number.isInteger(config.maxOpenBets) && config.maxOpenBets >= 1 && Number.isInteger(config.maxNewBetsPerUpdate) && config.maxNewBetsPerUpdate >= 1 && Number.isFinite(config.pacingIntervalSeconds) && config.pacingIntervalSeconds >= 0 && Number.isFinite(config.durationSeconds?.shortMax) && config.durationSeconds.shortMax >= 1 && Number.isFinite(config.durationSeconds?.mediumMax) && config.durationSeconds.mediumMax > config.durationSeconds.shortMax && ['quarter', 'game'].includes(config.sameTypeCooldown?.scope) && Number.isInteger(config.sameTypeCooldown?.maxOffers) && config.sameTypeCooldown.maxOffers >= 1 && ['base_excitement_rating'].includes(config.ranking?.primary) && typeof config.ranking?.randomTieBreak === 'boolean';
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { config, label = '' } = await request.json();
  if (!validConfig(config)) return NextResponse.json({ error: 'Invalid scheduler configuration.' }, { status: 400 });
  const { data } = await supabase.from('admin_config').select('value').eq('key', CONFIG_KEY).maybeSingle();
  const existing = data?.value?.versions ?? [];
  const versions = [...existing.map((version: any) => ({ ...version, isCurrent: false })), { id: uuidv4(), isCurrent: true, savedBy: session.email, label: String(label).slice(0, 120), createdAt: new Date().toISOString(), config }].slice(-20);
  const { error } = await supabase.from('admin_config').upsert({ key: CONFIG_KEY, value: { versions } }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
