-- YatraAI: User Channels for Phone + WhatsApp Identity
-- Date: 2026-04-17
-- Purpose:
--   1) Store verified communication channels per user
--   2) Support future WhatsApp linking on top of phone auth
--   3) Enforce RLS and single primary channel per type

-- 1) Enum for channel type (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
    CREATE TYPE public.channel_type AS ENUM ('phone_sms', 'whatsapp');
  END IF;
END $$;

-- 2) User channels table
CREATE TABLE IF NOT EXISTS public.user_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  channel_type public.channel_type NOT NULL,
  channel_address TEXT NOT NULL, -- E.164 for phone-based channels

  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, channel_type, channel_address)
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_user_channels_user_id
  ON public.user_channels (user_id);

CREATE INDEX IF NOT EXISTS idx_user_channels_type_address
  ON public.user_channels (channel_type, channel_address);

-- Optional business rule (keep commented unless required):
-- one active verified WhatsApp number can only belong to one account
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_user_channels_unique_whatsapp_verified
--   ON public.user_channels (channel_type, channel_address)
--   WHERE channel_type = 'whatsapp' AND is_verified = true AND status = 'active';

-- 4) updated_at trigger function (dedicated name to avoid collisions)
CREATE OR REPLACE FUNCTION public.set_user_channels_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_channels_updated_at ON public.user_channels;
CREATE TRIGGER trg_user_channels_updated_at
BEFORE UPDATE ON public.user_channels
FOR EACH ROW
EXECUTE FUNCTION public.set_user_channels_updated_at();

-- 5) Single primary channel per (user_id, channel_type)
CREATE OR REPLACE FUNCTION public.ensure_single_primary_user_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.user_channels
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND channel_type = NEW.channel_type
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_channels_single_primary ON public.user_channels;
CREATE TRIGGER trg_user_channels_single_primary
BEFORE INSERT OR UPDATE ON public.user_channels
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_user_channel();

-- 6) RLS
ALTER TABLE public.user_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own channels" ON public.user_channels;
CREATE POLICY "Users can read own channels"
ON public.user_channels
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own channels" ON public.user_channels;
CREATE POLICY "Users can insert own channels"
ON public.user_channels
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own channels" ON public.user_channels;
CREATE POLICY "Users can update own channels"
ON public.user_channels
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own channels" ON public.user_channels;
CREATE POLICY "Users can delete own channels"
ON public.user_channels
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
