'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 10_000;

/** Refreshes the current game page while its game is live and being watched. */
export default function LiveGameRefresh({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== 'live') return;

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };

    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [router, status]);

  if (status !== 'live') return null;
  return <span className="text-xs text-muted">Auto-refreshing every 10s</span>;
}
