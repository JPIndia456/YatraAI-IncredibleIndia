'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type CheckResult = {
  name: string;
  ok: boolean;
  status: number | 'n/a';
  details: string;
};

export default function TestPage() {
  const { user, session, loading } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const authSummary = useMemo(() => {
    if (loading) return 'Checking auth session...';
    if (!user) return 'Not signed in';
    return `Signed in as ${user.email || user.id}`;
  }, [loading, user]);

  async function runChecks() {
    setRunning(true);
    const out: CheckResult[] = [];

    try {
      // 1) Health check should be reachable
      const health = await fetch('/api/sys/health');
      const healthPayload = await health.json().catch(() => ({}));
      out.push({
        name: 'System Health API',
        ok: health.ok,
        status: health.status,
        details: health.ok
          ? `DB=${healthPayload?.services?.db ?? 'unknown'}, AI=${healthPayload?.services?.ai ?? 'unknown'}`
          : `Failed: ${JSON.stringify(healthPayload)}`,
      });
    } catch (err: any) {
      out.push({
        name: 'System Health API',
        ok: false,
        status: 'n/a',
        details: err?.message || 'Network error',
      });
    }

    try {
      // 2) Protected trips endpoint behavior
      const trips = await fetch('/api/trips/save');
      const tripsPayload = await trips.json().catch(() => ({}));
      const expectOk = Boolean(user);
      const pass = expectOk ? trips.ok : trips.status === 401;

      out.push({
        name: 'Trips API Auth Guard',
        ok: pass,
        status: trips.status,
        details: expectOk
          ? `Expected authenticated success; got status ${trips.status}`
          : `Expected 401 unauthenticated; got status ${trips.status} (${tripsPayload?.error || 'no error message'})`,
      });
    } catch (err: any) {
      out.push({
        name: 'Trips API Auth Guard',
        ok: false,
        status: 'n/a',
        details: err?.message || 'Network error',
      });
    }

    try {
      // 3) Booking endpoint validation should reject missing fields
      const booking = await fetch('/api/booking/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({}),
      });
      const bookingPayload = await booking.json().catch(() => ({}));
      out.push({
        name: 'Booking API Validation',
        ok: booking.status === 400 || booking.status === 401,
        status: booking.status,
        details: bookingPayload?.error || 'Expected 400/401 for empty payload',
      });
    } catch (err: any) {
      out.push({
        name: 'Booking API Validation',
        ok: false,
        status: 'n/a',
        details: err?.message || 'Network error',
      });
    }

    setResults(out);
    setLastRunAt(new Date().toISOString());
    setRunning(false);
  }

  const passed = results.filter((r) => r.ok).length;

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Minimal Test Page</h1>
        <p className="text-zinc-300 text-sm">
          Use this for quick smoke verification after deploys.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-zinc-300">
            <span className="font-semibold text-white">Auth:</span> {authSummary}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Last run: {lastRunAt || 'Never'}
          </p>
        </div>

        <button
          onClick={runChecks}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-semibold disabled:opacity-60"
        >
          {running ? 'Running checks...' : 'Run Smoke Checks'}
        </button>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold">
            Result: {passed}/{results.length} checks passed
          </p>
          <div className="mt-3 space-y-2">
            {results.length === 0 && (
              <p className="text-sm text-zinc-400">No checks run yet.</p>
            )}
            {results.map((r) => (
              <div key={r.name} className="text-sm border border-white/10 rounded-md p-3">
                <p>
                  {r.ok ? 'PASS' : 'FAIL'} - <span className="font-semibold">{r.name}</span> ({String(r.status)})
                </p>
                <p className="text-zinc-300 mt-1">{r.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
