-- ============================================================
-- YatraAI — Migration 003: WhatsApp, Consents & Price Audit
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE — Add WhatsApp & legal acceptance columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.yatra_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_enabled    BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_phone      TEXT,            -- E.164: +91XXXXXXXXXX
  ADD COLUMN IF NOT EXISTS whatsapp_optin_at   TIMESTAMPTZ,     -- When they opted in
  ADD COLUMN IF NOT EXISTS email               TEXT,            -- explicitly stored (populated by trigger)
  ADD COLUMN IF NOT EXISTS language_code       TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS legal_accepted_at   TIMESTAMPTZ,     -- First acceptance of T&C
  ADD COLUMN IF NOT EXISTS legal_version       TEXT DEFAULT '1.0';  -- Which version of T&C

-- ────────────────────────────────────────────────────────────
-- 2. WHATSAPP PREFERENCES — One row per user (upsertable)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_whatsapp_preferences (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  phone            TEXT        NOT NULL,          -- E.164: +91XXXXXXXXXX
  enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
  opted_in_at      TIMESTAMPTZ DEFAULT NOW(),
  opted_out_at     TIMESTAMPTZ,                   -- NULLable — set when they opt out
  opted_in_source  TEXT        DEFAULT 'login',   -- 'login' | 'profile' | 'booking'
  last_message_at  TIMESTAMPTZ,                   -- Last WA message sent successfully
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (phone)   -- One opt-in record per phone number
);

-- Enable RLS
ALTER TABLE public.yatra_whatsapp_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_pref_select_own"   ON public.yatra_whatsapp_preferences;
DROP POLICY IF EXISTS "wa_pref_insert_own"   ON public.yatra_whatsapp_preferences;
DROP POLICY IF EXISTS "wa_pref_update_own"   ON public.yatra_whatsapp_preferences;
DROP POLICY IF EXISTS "wa_pref_service_all"  ON public.yatra_whatsapp_preferences;

CREATE POLICY "wa_pref_select_own"  ON public.yatra_whatsapp_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wa_pref_insert_own"  ON public.yatra_whatsapp_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wa_pref_update_own"  ON public.yatra_whatsapp_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Backend (service role) can do anything — needed for webhook replies
CREATE POLICY "wa_pref_service_all" ON public.yatra_whatsapp_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 3. WHATSAPP MESSAGE LOG — Delivery audit trail (DPDP compliant)
--    Referenced by /api/whatsapp/send route
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_whatsapp_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone            TEXT        NOT NULL,             -- Recipient E.164 number
  type             TEXT        NOT NULL,             -- 'welcome' | 'booking_confirm' | 'itinerary' | 'price_alert' | 'custom'
  message_preview  TEXT,                             -- First 100 chars (audit, not full message)
  meta_message_id  TEXT,                             -- Meta Cloud API message ID (when live)
  demo             BOOLEAN     DEFAULT FALSE,         -- TRUE when no API keys available
  delivered        BOOLEAN     DEFAULT FALSE,         -- Updated by webhook status callback
  failed           BOOLEAN     DEFAULT FALSE,
  error_text       TEXT,
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Service role only — users don't need to read delivery log
ALTER TABLE public.yatra_whatsapp_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_log_service_all" ON public.yatra_whatsapp_log;

CREATE POLICY "wa_log_service_all" ON public.yatra_whatsapp_log
  FOR ALL USING (auth.role() = 'service_role');

-- Index for debugging
CREATE INDEX IF NOT EXISTS idx_wa_log_phone   ON public.yatra_whatsapp_log (phone);
CREATE INDEX IF NOT EXISTS idx_wa_log_type    ON public.yatra_whatsapp_log (type);
CREATE INDEX IF NOT EXISTS idx_wa_log_sent_at ON public.yatra_whatsapp_log (sent_at DESC);

-- ────────────────────────────────────────────────────────────
-- 4. COOKIE / DATA CONSENTS — DPDP Act 2023 compliance
--    Consent must be recorded with timestamp & version
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_cookie_consents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = pre-auth session
  session_id       TEXT,                         -- Browser fingerprint / anon session
  consent_level    TEXT        NOT NULL          -- 'essential' | 'all'
                   CHECK (consent_level IN ('essential', 'all')),
  policy_version   TEXT        NOT NULL DEFAULT '1.0',
  ip_address       INET,                         -- Stored for DPDP audit (not shown to user)
  user_agent       TEXT,
  withdrawn        BOOLEAN     DEFAULT FALSE,
  withdrawn_at     TIMESTAMPTZ,
  consented_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.yatra_cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_select_own"   ON public.yatra_cookie_consents;
DROP POLICY IF EXISTS "consent_insert_anon"  ON public.yatra_cookie_consents;
DROP POLICY IF EXISTS "consent_service_all"  ON public.yatra_cookie_consents;

-- Authenticated users can read their own consents
CREATE POLICY "consent_select_own" ON public.yatra_cookie_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone (including anon) can INSERT a consent record
CREATE POLICY "consent_insert_anon" ON public.yatra_cookie_consents
  FOR INSERT WITH CHECK (true);

-- Service role full access
CREATE POLICY "consent_service_all" ON public.yatra_cookie_consents
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_consent_user_id ON public.yatra_cookie_consents (user_id);
CREATE INDEX IF NOT EXISTS idx_consent_session  ON public.yatra_cookie_consents (session_id);

-- ────────────────────────────────────────────────────────────
-- 5. PRICE CHECK AUDIT LOG — Track all price verifications
--    Supports price integrity compliance and dispute resolution
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_price_checks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_ref      TEXT,                              -- e.g. YAI-XXXXXX
  origin           TEXT,
  destination      TEXT,
  transport_mode   TEXT,
  tier             TEXT,
  original_price   INTEGER     NOT NULL,              -- Price shown to user (INR paise-level)
  verified_price   INTEGER     NOT NULL,              -- Price returned by live API
  price_changed    BOOLEAN     NOT NULL DEFAULT FALSE,
  change_percent   NUMERIC(5,2),                      -- e.g. +5.20 or -2.50
  change_reason    TEXT,                              -- e.g. 'surge', 'deal', 'stable'
  price_token      TEXT,                              -- Signed token sent to client
  payment_preceded BOOLEAN     DEFAULT FALSE,         -- TRUE if user went ahead with payment
  checked_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.yatra_price_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_checks_select_own"  ON public.yatra_price_checks;
DROP POLICY IF EXISTS "price_checks_insert"       ON public.yatra_price_checks;
DROP POLICY IF EXISTS "price_checks_service_all"  ON public.yatra_price_checks;

CREATE POLICY "price_checks_select_own" ON public.yatra_price_checks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "price_checks_insert" ON public.yatra_price_checks
  FOR INSERT WITH CHECK (true);   -- API route uses service_role key

CREATE POLICY "price_checks_service_all" ON public.yatra_price_checks
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_price_checks_user    ON public.yatra_price_checks (user_id);
CREATE INDEX IF NOT EXISTS idx_price_checks_ref     ON public.yatra_price_checks (booking_ref);
CREATE INDEX IF NOT EXISTS idx_price_checks_checked ON public.yatra_price_checks (checked_at DESC);

-- ────────────────────────────────────────────────────────────
-- 6. LEGAL ACCEPTANCES — Per-user record of T&C acceptance
--    Required for IT Act 2000 & Consumer Protection evidence
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_legal_acceptances (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type    TEXT        NOT NULL               -- 'terms' | 'privacy' | 'disclaimer' | 'refund'
                   CHECK (document_type IN ('terms', 'privacy', 'disclaimer', 'refund')),
  document_version TEXT        NOT NULL DEFAULT '1.0',
  accepted         BOOLEAN     NOT NULL DEFAULT TRUE,
  accepted_at      TIMESTAMPTZ DEFAULT NOW(),
  ip_address       INET,
  user_agent       TEXT
);

ALTER TABLE public.yatra_legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_select_own"   ON public.yatra_legal_acceptances;
DROP POLICY IF EXISTS "legal_insert_anon"  ON public.yatra_legal_acceptances;
DROP POLICY IF EXISTS "legal_service_all"  ON public.yatra_legal_acceptances;

CREATE POLICY "legal_select_own" ON public.yatra_legal_acceptances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "legal_insert_anon" ON public.yatra_legal_acceptances
  FOR INSERT WITH CHECK (true);

CREATE POLICY "legal_service_all" ON public.yatra_legal_acceptances
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_legal_user_id ON public.yatra_legal_acceptances (user_id);

-- ────────────────────────────────────────────────────────────
-- 7. TRIGGER: Auto-update updated_at on whatsapp_preferences
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_wa_pref_updated_at ON public.yatra_whatsapp_preferences;
CREATE TRIGGER set_wa_pref_updated_at
  BEFORE UPDATE ON public.yatra_whatsapp_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 8. FUNCTION: Upsert WhatsApp opt-in (called from API)
--    Usage: SELECT upsert_whatsapp_optin(user_id, phone, true);
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_whatsapp_optin(
  p_user_id   UUID,
  p_phone     TEXT,
  p_enabled   BOOLEAN,
  p_source    TEXT DEFAULT 'login'
)
RETURNS void AS $$
BEGIN
  -- 1. Upsert in dedicated wa_preferences table
  INSERT INTO public.yatra_whatsapp_preferences
    (user_id, phone, enabled, opted_in_at, opted_in_source)
  VALUES
    (p_user_id, p_phone, p_enabled, NOW(), p_source)
  ON CONFLICT (phone) DO UPDATE
    SET enabled         = p_enabled,
        opted_in_at     = CASE WHEN p_enabled THEN NOW() ELSE yatra_whatsapp_preferences.opted_in_at END,
        opted_out_at    = CASE WHEN NOT p_enabled THEN NOW() ELSE NULL END,
        opted_in_source = p_source,
        updated_at      = NOW();

  -- 2. Mirror on profiles for quick reads
  UPDATE public.yatra_profiles
  SET whatsapp_enabled  = p_enabled,
      whatsapp_phone    = p_phone,
      whatsapp_optin_at = CASE WHEN p_enabled THEN NOW() ELSE whatsapp_optin_at END,
      updated_at        = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 9. REALTIME: Enable live subscriptions for new tables
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Add tables to realtime publication (ignore if already added)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.yatra_whatsapp_preferences;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.yatra_whatsapp_log;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ────────────────────────────────────────────────────────────
-- 10. HANDLE NEW USER TRIGGER — Update to include new columns
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.yatra_profiles (
    user_id, full_name, email, avatar_url,
    whatsapp_enabled, language_code,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULL,
    FALSE,
    COALESCE(NEW.raw_user_meta_data->>'language_code', 'en'),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- YatraAI Migration 003 COMPLETE ✅
-- New tables:
--   yatra_whatsapp_preferences  → User WA opt-in records
--   yatra_whatsapp_log          → Delivery audit (DPDP)
--   yatra_cookie_consents       → Cookie consent records
--   yatra_price_checks          → Price verification log
--   yatra_legal_acceptances     → T&C acceptance records
-- Altered tables:
--   yatra_profiles              → +whatsapp_enabled, +whatsapp_phone,
--                                  +whatsapp_optin_at, +email,
--                                  +language_code, +legal_accepted_at
-- ────────────────────────────────────────────────────────────
