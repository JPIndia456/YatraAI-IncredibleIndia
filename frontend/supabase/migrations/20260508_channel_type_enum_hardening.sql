-- YatraAI: User Channels Enum Hardening
-- Date: 2026-05-08
-- Ensure channel_type enum includes all production-required channels.

DO $$
BEGIN
  -- Add 'telegram' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.channel_type'::regtype 
    AND enumlabel = 'telegram'
  ) THEN
    ALTER TYPE public.channel_type ADD VALUE 'telegram';
  END IF;

  -- Add 'email' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.channel_type'::regtype 
    AND enumlabel = 'email'
  ) THEN
  
    ALTER TYPE public.channel_type ADD VALUE 'email';
  END IF;
END $$;
