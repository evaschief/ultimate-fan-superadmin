'use client';

import { useState } from 'react';

export default function GenerateRosterButton({ gameId }: { gameId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function handleClick() {
    setState('loading');
    setMsg('');
    try {
      const res = await fetch(`/api/games/${gameId}/generate-roster`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMsg(data.error ?? 'Unknown error');
      } else {
        setState('done');
        const dkNote = data.dkMatched > 0
          ? `${data.dkMatched} from DK, ${data.tierFallback} tier-based`
          : (data.dkError ? 'DK slate not found — used tier-based fallback' : 'Done');
        setMsg(`${data.playerCount} players saved. ${dkNote}`);
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
        disabled={state === 'loading'}
        className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap disabled:opacity-50"
      >
        {state === 'loading' ? 'Generating…' : state === 'done' ? '✓ Roster Generated' : 'Generate Roster'}
      </button>
      {msg && (
        <span className={`text-xs ${state === 'error' ? 'text-danger' : 'text-secondary'}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
