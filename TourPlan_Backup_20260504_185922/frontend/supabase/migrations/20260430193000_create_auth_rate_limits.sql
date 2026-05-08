CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_ends_at TIMESTAMPTZ NOT NULL,
  cooldown_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage auth rate limits" ON public.auth_rate_limits;
CREATE POLICY "Service role can manage auth rate limits"
ON public.auth_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

