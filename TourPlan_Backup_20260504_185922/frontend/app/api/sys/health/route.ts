import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.SYS_DEBUG_SECRET;
  if (!secret) return false;
  return req.headers.get('x-sys-debug-secret') === secret;
}

/**
 * System Health Check API
 * Monitors core dependencies: Supabase, Bhashini, MCP Servers
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const status: {
    timestamp: string;
    services: { db: string; auth: string; ai: string };
    latency?: { db: string };
    checks?: Record<string, string>;
    diagnostics?: Record<string, string>;
  } = {
    timestamp: new Date().toISOString(),
    services: {
      db: 'checking',
      auth: 'checking',
      ai: 'checking'
    },
    checks: {},
    diagnostics: {}
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

    const urlRefMatch = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
    status.checks = {
      supabase_url_format: urlRefMatch ? 'OK' : 'INVALID',
      anon_key_present: anon && !anon.startsWith('REPLACE_') ? 'OK' : 'MISSING_OR_PLACEHOLDER',
      service_key_present: service && !service.startsWith('REPLACE_') ? 'OK' : 'MISSING_OR_PLACEHOLDER',
    };

    if (!urlRefMatch) {
      status.services.db = 'ERROR';
      status.diagnostics = {
        ...(status.diagnostics ?? {}),
        db_error: 'NEXT_PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co',
      };
      return NextResponse.json(status, { status: 503 });
    }

    // Decode key ref to detect mismatched project keys quickly.
    const decodeRef = (jwt: string) => {
      try {
        const part = jwt.split('.')[1];
        if (!part) return null;
        const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
        return typeof payload?.ref === 'string' ? payload.ref : null;
      } catch {
        return null;
      }
    };

    const urlRef = urlRefMatch[1];
    const anonRef = decodeRef(anon);
    const serviceRef = decodeRef(service);
    status.checks = {
      ...(status.checks ?? {}),
      anon_key_ref_match: anonRef === urlRef ? 'OK' : 'MISMATCH',
      service_key_ref_match: serviceRef === urlRef ? 'OK' : 'MISMATCH',
    };

    // 1. Supabase Check
    const startTime = Date.now();
    const { error } = await supabaseAdmin.from('tourplan_profiles').select('count', { count: 'exact', head: true });
    status.services.db = error ? 'ERROR' : 'OK';
    status.latency = { db: `${Date.now() - startTime}ms` };
    if (error) {
      status.diagnostics = {
        ...(status.diagnostics ?? {}),
        db_error: error.message,
      };
    }

    // 2. Gemini API Check (Quick check if key is loaded)
    status.services.ai = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('REPLACE_') ? 'OK' : 'MISSING_KEY';

    return NextResponse.json(status, { status: error ? 503 : 200 });
  } catch (err: unknown) {
    return NextResponse.json({ 
      status: 'CRITICAL',
      error: err instanceof Error ? err.message : 'Unknown health check failure',
      timestamp: status.timestamp 
    }, { status: 500 });
  }
}
