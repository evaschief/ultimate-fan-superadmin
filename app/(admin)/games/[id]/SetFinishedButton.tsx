'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetFinishedButton({ gameId, currentStatus }: { gameId: string; currentStatus: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg]     = useState('');
  const router = useRouter();

  if (currentStatus === 'ended') {
    return <span className="text-xs text-muted border border-border px-3 py-1.5 rounded">Ended</span>;
  }

  async function handleClick() {
    if (!confirm('Mark this game as finished? This will set status → ended and expire any open bets.')) return;
    setState('loading');
    setMsg('');
    try {
      const res  = await fetch(`/api/games/${gameId}/finish`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMsg(data.error ?? 'Unknown error');
      } else {
        setState('done');
        setMsg('Game marked as finished');
        router.refresh();
      }
    } catch (e: any) {
      setState('error');
      setMsg(e.message);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={state === 'loading' || state === 'done'}
        className="text-xs px-3 py-1.5 whitespace-nowrap border border-danger/40 text-danger rounded hover:bg-danger/5 transition-colors disabled:opacity-50"
      >
        {state === 'loading' ? 'Finishing…' : state === 'done' ? '✓ Finished' : 'Set as Finished'}
      </button>
      {msg && (
        <span className={`text-xs ${state === 'error' ? 'text-danger' : 'text-secondary'}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
