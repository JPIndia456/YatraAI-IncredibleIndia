-- ═══════════════════════════════════════════════════════════════
-- YatraAI Schema Sync — run in Supabase SQL editor for project ogrltimjrrvchqzlddqt
-- ═══════════════════════════════════════════════════════════════

-- ── 1. RLS on search cache (critical security fix) ──────────────
ALTER TABLE public.yatra_search_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read search cache" ON public.yatra_search_cache;
DROP POLICY IF EXISTS "Service role manages cache"   ON public.yatra_search_cache;
CREATE POLICY "Anyone can read search cache" ON public.yatra_search_cache
  FOR SELECT USING (true);
CREATE POLICY "Service role manages cache" ON public.yatra_search_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ── 2. Add missing columns to yatra_profiles ────────────────────
ALTER TABLE public.yatra_profiles
  ADD COLUMN IF NOT EXISTS persona           text,
  ADD COLUMN IF NOT EXISTS gender            text,
  ADD COLUMN IF NOT EXISTS likes             jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dislikes          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS telegram_id       text,
  ADD COLUMN IF NOT EXISTS telegram_enabled  boolean DEFAULT false;

-- ── 3. Fix tour_guide_sessions.party_size → jsonb ───────────────
ALTER TABLE public.yatra_tour_guide_sessions
  ADD COLUMN IF NOT EXISTS discovered_tours      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_tour         jsonb,
  ADD COLUMN IF NOT EXISTS conversation_summary  text,
  ADD COLUMN IF NOT EXISTS last_active_at        timestamptz DEFAULT now();

-- party_size: only run if it's still integer type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'yatra_tour_guide_sessions'
      AND column_name = 'party_size'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.yatra_tour_guide_sessions
      ALTER COLUMN party_size TYPE jsonb
      USING jsonb_build_object('adults', party_size, 'kids', 0);
  END IF;
END $$;

-- ── 4. yatra_sys_logs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_sys_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level      text NOT NULL DEFAULT 'info',
  category   text,
  message    text NOT NULL,
  meta       jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.yatra_sys_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages sys logs" ON public.yatra_sys_logs;
CREATE POLICY "Service role manages sys logs" ON public.yatra_sys_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. yatra_price_checks ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_price_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  route         text NOT NULL,
  mode          text NOT NULL DEFAULT 'flight',
  target_price  integer,
  last_price    integer,
  alerted       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE public.yatra_price_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own price checks" ON public.yatra_price_checks;
CREATE POLICY "Users manage own price checks" ON public.yatra_price_checks
  FOR ALL USING (auth.uid() = user_id);

-- ── 6. yatra_automation_claims ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_automation_claims (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_key   text NOT NULL UNIQUE,
  worker_id   text,
  claimed_at  timestamptz DEFAULT now(),
  expires_at  timestamptz
);
ALTER TABLE public.yatra_automation_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages claims" ON public.yatra_automation_claims;
CREATE POLICY "Service role manages claims" ON public.yatra_automation_claims
  FOR ALL USING (auth.role() = 'service_role');

-- ── 7. Auto updated_at trigger ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_profiles') THEN
    CREATE TRIGGER set_updated_at_profiles
      BEFORE UPDATE ON public.yatra_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_price_checks') THEN
    CREATE TRIGGER set_updated_at_price_checks
      BEFORE UPDATE ON public.yatra_price_checks
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
