'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  venueName: string | null;
  hasPassword: boolean;
  createdAt: string | null;
}

function AddSuperadminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch {
      setError('Network error — try again');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Add Superadmin</h2>
          <button onClick={onClose} className="text-muted hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@clickspace.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Name</label>
            <input
              type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Optional — defaults to the email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Password</label>
            <input
              type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Confirm password</label>
            <input
              type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat the password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p className="text-xs text-muted">
            Full access to this console — every venue, game and player. The password is
            hashed by the database and cannot be read back afterwards, so share it with the
            person directly.
          </p>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Superadmin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.uid}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Network error — try again');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Change Password</h2>
          <button onClick={onClose} className="text-muted hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="px-5 py-6 space-y-3">
            <p className="text-sm text-gray-900">
              Password updated for <span className="font-medium">{user.email || user.uid}</span>.
            </p>
            <p className="text-xs text-muted">
              Share the new password with them directly — it&apos;s hashed by the database and
              can&apos;t be read back. Any session they already have stays signed in until it
              expires; only revoking the account ends it immediately.
            </p>
            <button
              onClick={onClose}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 py-4 space-y-3">
            <p className="text-xs text-secondary">
              Setting a new password for <span className="font-medium text-gray-900">{user.email || user.uid}</span>
              {' '}({user.role}).
            </p>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">New password</label>
              <input
                type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Confirm new password</label>
              <input
                type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <p className="text-xs text-muted">
              The old password is replaced immediately. Existing sessions are not signed out.
            </p>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button" onClick={onClose}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-secondary hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function RevokeButton({ user, onRevoked }: { user: AdminUser; onRevoked: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/users/${user.uid}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not revoke');
      setLoading(false);
      setConfirming(false);
      return;
    }
    onRevoked();
  }

  if (error) {
    return (
      <span className="flex items-center gap-2 justify-end">
        <span className="text-xs text-danger">{error}</span>
        <button onClick={() => setError(null)} className="text-xs text-muted hover:text-gray-900">Dismiss</button>
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 justify-end">
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="text-xs text-danger font-semibold hover:underline disabled:opacity-50"
        >
          {loading ? 'Revoking…' : 'Confirm'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-muted hover:text-gray-900">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-muted hover:text-danger transition-colors"
    >
      Revoke
    </button>
  );
}

export default function UsersClient({ users, envEmails }: { users: AdminUser[]; envEmails: string[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [changingFor, setChangingFor] = useState<AdminUser | null>(null);
  const [rows, setRows] = useState(users);

  const superadmins = rows.filter(u => u.role === 'superadmin');
  const venueAdmins = rows.filter(u => u.role === 'admin');
  const passwordless = rows.filter(u => !u.hasPassword);

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Users</h1>
          <p className="text-secondary text-sm mt-1">
            {superadmins.length} superadmin{superadmins.length === 1 ? '' : 's'} · {venueAdmins.length} venue admin{venueAdmins.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 text-white text-xl leading-none hover:bg-gray-800 transition-colors"
          title="Add superadmin"
        >
          +
        </button>
      </div>

      {passwordless.length > 0 && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
          <p className="text-sm text-danger font-medium">
            {passwordless.length} account{passwordless.length === 1 ? '' : 's'} with no password set
          </p>
          <p className="text-xs text-secondary mt-1">
            These cannot sign in, and until a password is set anyone who knows the uid can
            claim the account. Revoke and recreate them: {passwordless.map(u => u.email || u.uid).join(', ')}
          </p>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Email</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Venue</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Login</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Added</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted">No admin accounts found</td></tr>
            ) : (
              rows.map((u, i) => (
                <tr key={u.uid} className={i % 2 === 0 ? 'bg-white border-b border-border' : 'bg-gray-50/50 border-b border-border'}>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {u.email || <span className="text-muted italic">no email</span>}
                    {envEmails.includes(u.email.toLowerCase()) && (
                      <span className="ml-2 text-xs bg-gray-100 text-muted border border-border px-1.5 py-0.5 rounded">ENV</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-secondary">{u.displayName || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={
                      u.role === 'superadmin'
                        ? 'text-xs bg-amber-dim text-amber border border-amber-border px-2 py-0.5 rounded-full font-semibold'
                        : 'text-xs bg-gray-100 text-muted border border-border px-2 py-0.5 rounded-full font-semibold'
                    }>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-secondary">{u.venueName ?? <span className="text-muted">all venues</span>}</td>
                  <td className="px-3 py-2">
                    {u.hasPassword ? (
                      <span className="text-xs bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-semibold">Password set</span>
                    ) : (
                      <span className="text-xs bg-danger/5 text-danger border border-danger/30 px-2 py-0.5 rounded-full font-semibold">No password</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-secondary">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => setChangingFor(u)}
                        className="text-xs text-secondary hover:text-amber transition-colors whitespace-nowrap"
                      >
                        Change password
                      </button>
                      {u.role === 'superadmin' ? (
                        <RevokeButton
                          user={u}
                          onRevoked={() => setRows(prev => prev.filter(r => r.uid !== u.uid))}
                        />
                      ) : (
                        <span className="text-xs text-muted whitespace-nowrap">venue-managed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-3 max-w-2xl">
        Superadmins sign in with the email and password set here, verified against the
        database. Accounts tagged ENV can also sign in with the shared
        <span className="font-mono"> ADMIN_PASSWORD</span> from the environment, which no
        password change here affects. Changing a password replaces it immediately but does
        not sign out sessions that are already open — to cut off access right now, revoke
        the account.
      </p>

      {showAdd && (
        <AddSuperadminModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); router.refresh(); }}
        />
      )}

      {changingFor && (
        <ChangePasswordModal
          user={changingFor}
          onClose={() => { setChangingFor(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
