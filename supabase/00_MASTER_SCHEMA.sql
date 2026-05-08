-- ============================================================
-- YatraAI — MASTER DATABASE SCHEMA & MIGRATIONS
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE — User metadata & travel preferences
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    preferred_language TEXT DEFAULT 'en',
    language_code TEXT DEFAULT 'en',
    travel_style TEXT DEFAULT 'budget',
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_phone TEXT,
    whatsapp_optin_at TIMESTAMPTZ,
    aadhaar_linked BOOLEAN DEFAULT FALSE,
    total_trips INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}'::jsonb,
    legal_accepted_at TIMESTAMPTZ,
    legal_version TEXT DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. BOOKINGS TABLE — Core travel itineraries
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    booking_type TEXT NOT NULL, -- 'TRAIN', 'FLIGHT', 'BUS', 'TAXI', 'HOTEL'
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount INTEGER NOT NULL, -- In paise (smallest unit)
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    pnr TEXT,
    trip_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_tatkal BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
-- 3. NOTIFICATIONS TABLE — Alerts and updates
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES yatra_bookings(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. PNR STATUS LOGS — History of PNR checks
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_pnr_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES yatra_bookings(id) ON DELETE CASCADE NOT NULL,
    pnr TEXT NOT NULL,
    status TEXT NOT NULL,
    coach TEXT,
    berth TEXT,
    chart_prepared BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 5. AI CHAT HISTORY — Context for the AI Brain
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. WHATSAPP PREFERENCES — Detailed opt-in records
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yatra_whatsapp_preferences (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  phone            TEXT        NOT NULL UNIQUE,
  enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
  opted_in_at      TIMESTAMPTZ DEFAULT NOW(),
  opted_out_at     TIMESTAMPTZ,
  opted_in_source  TEXT        DEFAULT 'login',
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 7. ESSENTIAL FUNCTIONS & TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Function: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on yatra_profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.yatra_profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.yatra_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Update updated_at on yatra_bookings
DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.yatra_bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.yatra_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.yatra_profiles (
    user_id, full_name, email, avatar_url, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: upsert_whatsapp_optin
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
-- 8. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE yatra_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_pnr_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON yatra_profiles;
CREATE POLICY "profiles_select_own" ON yatra_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_update_own" ON yatra_profiles;
CREATE POLICY "profiles_update_own" ON yatra_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Bookings Policies
DROP POLICY IF EXISTS "bookings_select_own" ON yatra_bookings;
CREATE POLICY "bookings_select_own" ON yatra_bookings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "bookings_insert_own" ON yatra_bookings;
CREATE POLICY "bookings_insert_own" ON yatra_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat History Policies
DROP POLICY IF EXISTS "chat_select_own" ON yatra_ai_chat_history;
CREATE POLICY "chat_select_own" ON yatra_ai_chat_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_insert_own" ON yatra_ai_chat_history;
CREATE POLICY "chat_insert_own" ON yatra_ai_chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'yatra_bookings') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE yatra_bookings;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'yatra_notifications') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE yatra_notifications;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'yatra_pnr_status_logs') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE yatra_pnr_status_logs;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
