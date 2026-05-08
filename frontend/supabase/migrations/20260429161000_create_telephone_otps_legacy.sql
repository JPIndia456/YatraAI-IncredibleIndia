-- Legacy compatibility migration: telephone_otps
-- Purpose:
--   Keep backward compatibility for historical OTP flows that referenced
--   public.telephone_otps. Current auth flow does not require this table.
--   This migration is intentionally idempotent and non-blocking.

CREATE TABLE IF NOT EXISTS public.telephone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telephone_otps_phone
  ON public.telephone_otps(phone);

CREATE INDEX IF NOT EXISTS idx_telephone_otps_expires_at
  ON public.telephone_otps(expires_at);

ALTER TABLE public.telephone_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can do everything" ON public.telephone_otps;
CREATE POLICY "Service role can do everything"
ON public.telephone_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
