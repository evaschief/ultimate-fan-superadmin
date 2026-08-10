import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// BUG FIX: Next.js patches the global `fetch` to cache responses by
// default, and that caching happens independently of a page's own
// `dynamic = 'force-dynamic'` setting — it was silently caching Supabase's
// underlying REST calls (confirmed via Vercel's "Using cache" log line on
// the venues/[id] request), so a query that should have returned a fresh
// result kept serving back an old empty response indefinitely. Passing a
// custom fetch that always sets `cache: 'no-store'` makes every Supabase
// request in this app genuinely live.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

export const supabase = createClient(url, key, {
  global: { fetch: noStoreFetch },
});
export const supabaseAdmin = supabase;
