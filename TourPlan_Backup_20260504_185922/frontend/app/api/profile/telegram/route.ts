import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin, hasServiceKey } from '@/lib/supabaseAdmin';
import { normalizeTelegramContact } from '@/lib/normalizeTelegramContact';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Trusted server upsert for Telegram fields when browser RLS blocks INSERT on tourplan_profiles.
 * Requires logged-in session cookies + SUPABASE_SERVICE_ROLE_KEY.
 */
export async function POST(req: Request) {
  try {
    if (!hasServiceKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Server is missing SUPABASE_SERVICE_ROLE_KEY. Apply the SQL migration for tourplan_profiles INSERT + unique(user_id), or add the service role key.',
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const rawId = typeof body.telegram_id === 'string' ? body.telegram_id : '';
    const normalized = normalizeTelegramContact(rawId);
    if (normalized.length < 3) {
      return NextResponse.json({ ok: false, error: 'Invalid telegram_id' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName =
      typeof meta?.full_name === 'string'
        ? meta.full_name
        : typeof meta?.name === 'string'
          ? meta.name
          : null;

    const { data, error } = await supabaseAdmin
      .from('tourplan_profiles')
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          telegram_id: normalized,
          telegram_enabled: true,
          telegram_optin_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id' },
      )
      .select('id');

    if (error) {
      console.warn('[profile/telegram] admin upsert', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ids: data?.map((r) => r.id) ?? [] });
  } catch (err: unknown) {
    console.error('[profile/telegram]', err);
    return NextResponse.json({ ok: false, error: errorMessage(err, 'Unexpected error') }, { status: 500 });
  }
}
