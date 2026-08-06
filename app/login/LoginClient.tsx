'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EmailSignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Sign-in failed');
      }

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <p className="text-xl font-bold text-gray-900">Ultimate Fan</p>
        <p className="text-xs text-gray-500 mt-1">Admin Console</p>
      </div>

      <div className="card space-y-4">
        <h1 className="text-lg font-semibold text-primary">Sign in</h1>
        <p className="text-secondary text-sm">
          Access is restricted to authorized admin accounts.
        </p>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-sm text-secondary mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-amber-DEFAULT"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-amber-DEFAULT"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-3"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : null}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense>
      <EmailSignInForm />
    </Suspense>
  );
}
