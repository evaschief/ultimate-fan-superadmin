'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenCatalogBetButton({ gameId, templateId }: { gameId: string; templateId: string }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  async function open() {
    if (!confirm('Open this approved catalog bet now?')) return;
    setOpening(true);
    setError('');
    try {
      const response = await fetch(`/api/games/${gameId}/bets/catalog`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not open the bet.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the bet.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={open} disabled={opening} className="btn-primary text-xs px-2.5 py-1.5">
        {opening ? 'Opening…' : 'Open now'}
      </button>
      {error && <span className="text-xs text-danger max-w-48">{error}</span>}
    </div>
  );
}
