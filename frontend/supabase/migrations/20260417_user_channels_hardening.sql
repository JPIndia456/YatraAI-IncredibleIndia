-- YatraAI: User Channels Hardening (Validation + Uniqueness + Audit)
-- Date: 2026-04-17
-- Depends on: 20260417_user_channels_auth.sql

-- 1) Enforce E.164 format for phone-based channels
-- Applies to channel_type phone_sms and whatsapp.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_user_channels_e164_format'
      AND conrelid = 'public.user_channels'::regclass
  ) THEN
    ALTER TABLE public.user_channels
      ADD CONSTRAINT chk_user_channels_e164_format
      CHECK (
        channel_type NOT IN ('phone_sms', 'whatsapp')
        OR channel_address ~ '^\+[1-9][0-9]{7,14}$'
      );
  END IF;
END $$;

-- 2) Prevent one verified active WhatsApp number from linking to multiple users
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_channels_unique_whatsapp_verified
  ON public.user_channels (channel_type, channel_address)
  WHERE channel_type = 'whatsapp' AND is_verified = true AND status = 'active';

-- 3) Verification attempts audit table
CREATE TABLE IF NOT EXISTS public.user_channel_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  channel_type public.channel_type NOT NULL,
  channel_address TEXT NOT NULL,

  provider TEXT, -- e.g. whatsapp_cloud_api, etc.
  challenge_type TEXT NOT NULL DEFAULT 'otp' CHECK (challenge_type IN ('otp', 'magic_link', 'challenge_message')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'sent', 'verified', 'failed', 'expired')),
  error_code TEXT,
  error_message TEXT,

  request_ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucva_user_created
  ON public.user_channel_verification_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ucva_type_address_created
  ON public.user_channel_verification_attempts (channel_type, channel_address, created_at DESC);

-- 4) RLS for audit table
ALTER TABLE public.user_channel_verification_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own verification attempts" ON public.user_channel_verification_attempts;
CREATE POLICY "Users can read own verification attempts"
ON public.user_channel_verification_attempts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage verification attempts" ON public.user_channel_verification_attempts;
CREATE POLICY "Service role can manage verification attempts"
ON public.user_channel_verification_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
