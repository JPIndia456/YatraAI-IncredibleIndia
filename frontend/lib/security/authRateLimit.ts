import { hasServiceKey, supabaseAdmin } from '@/lib/supabaseAdmin';

type LimitResult = {
  ok: boolean;
  retryAfterMs: number;
};

export async function consumePersistentAuthLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  cooldownMs = 0
): Promise<LimitResult | null> {
  if (!hasServiceKey) return null;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data: row, error: selErr } = await supabaseAdmin
    .from('auth_rate_limits')
    .select('id, attempt_count, window_ends_at, cooldown_until')
    .eq('id', key)
    .maybeSingle();

  if (selErr) return null;

  const cooldownUntil = row?.cooldown_until ? Date.parse(row.cooldown_until) : 0;
  if (cooldownUntil > now) {
    return { ok: false, retryAfterMs: cooldownUntil - now };
  }

  const windowEndsAt = row?.window_ends_at ? Date.parse(row.window_ends_at) : 0;
  const windowExpired = !row || !windowEndsAt || now > windowEndsAt;

  if (windowExpired) {
    const nextWindowEndsAt = new Date(now + windowMs).toISOString();
    const nextCooldown = cooldownMs > 0 ? new Date(now + cooldownMs).toISOString() : null;
    const { error: upsertErr } = await supabaseAdmin.from('auth_rate_limits').upsert(
      {
        id: key,
        attempt_count: 1,
        window_ends_at: nextWindowEndsAt,
        cooldown_until: nextCooldown,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
    if (upsertErr) return null;
    return { ok: true, retryAfterMs: 0 };
  }

  if ((row?.attempt_count || 0) >= maxAttempts) {
    return { ok: false, retryAfterMs: Math.max(0, windowEndsAt - now) };
  }

  const nextCooldown = cooldownMs > 0 ? new Date(now + cooldownMs).toISOString() : row?.cooldown_until || null;
  const { error: updateErr } = await supabaseAdmin
    .from('auth_rate_limits')
    .update({
      attempt_count: (row?.attempt_count || 0) + 1,
      cooldown_until: nextCooldown,
      updated_at: nowIso,
    })
    .eq('id', key);

  if (updateErr) return null;
  return { ok: true, retryAfterMs: 0 };
}

