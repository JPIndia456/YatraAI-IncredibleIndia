import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabaseAdmin';

type ChannelRow = {
  user_id: string;
  channel_type: 'email' | 'phone_sms';
  channel_address: string;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
  status: 'active' | 'pending';
  metadata: Record<string, unknown>;
};

function extractBearerToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

function normalizePhone(phone: string) {
  const compact = phone.replace(/\s+/g, '');
  return compact.startsWith('+') ? compact : `+${compact}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: userError?.message || 'Unauthorized' }, { status: 401 });
    }

    const user = userData.user;
    const rows: ChannelRow[] = [];

    if (user.email) {
      rows.push({
        user_id: user.id,
        channel_type: 'email',
        channel_address: user.email.trim().toLowerCase(),
        is_primary: true,
        is_verified: Boolean(user.email_confirmed_at),
        verified_at: user.email_confirmed_at ?? null,
        status: user.email_confirmed_at ? 'active' : 'pending',
        metadata: { source: 'auth_sync' },
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, synced: 0 });
    }

    const db = getServerClient(token);
    const { error: upsertError } = await db
      .from('user_channels')
      .upsert(rows, { onConflict: 'user_id,channel_type,channel_address' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, synced: rows.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, 'Sync failed') }, { status: 500 });
  }
}
