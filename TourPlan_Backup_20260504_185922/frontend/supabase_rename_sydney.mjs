import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({
  connectionString
});

async function main() {
  await client.connect();
  console.log('✅ Connected to Sydney Supabase PostgreSQL');
  console.log('🚀 Starting Rebranding Migration: YatraAI -> TourPlan');

  const sql = `
-- 1. DROP EXISTING TRIGGERS & FUNCTIONS (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.mark_notification_read(UUID);
-- DROP TRIGGER IF EXISTS set_bookings_updated_at ON yatra_bookings;
DROP FUNCTION IF EXISTS public.update_updated_at();

-- 2. RENAME EXISTING TABLES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_profiles') THEN
        ALTER TABLE yatra_profiles RENAME TO tourplan_profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_bookings') THEN
        ALTER TABLE yatra_bookings RENAME TO tourplan_bookings;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_pnr_status_logs') THEN
        ALTER TABLE yatra_pnr_status_logs RENAME TO tourplan_pnr_status_logs;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_notifications') THEN
        ALTER TABLE yatra_notifications RENAME TO tourplan_notifications;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_whatsapp_log') THEN
        ALTER TABLE yatra_whatsapp_log RENAME TO tourplan_whatsapp_log;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_ai_chat_history') THEN
        ALTER TABLE yatra_ai_chat_history RENAME TO tourplan_ai_chat_history;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_whatsapp_preferences') THEN
        ALTER TABLE yatra_whatsapp_preferences RENAME TO tourplan_whatsapp_preferences;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_price_checks') THEN
        ALTER TABLE yatra_price_checks RENAME TO tourplan_price_checks;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_cookie_consents') THEN
        ALTER TABLE yatra_cookie_consents RENAME TO tourplan_cookie_consents;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_legal_acceptances') THEN
        ALTER TABLE yatra_legal_acceptances RENAME TO tourplan_legal_acceptances;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_search_cache') THEN
        ALTER TABLE yatra_search_cache RENAME TO tourplan_search_cache;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yatra_trip_plans') THEN
        ALTER TABLE yatra_trip_plans RENAME TO tourplan_trip_plans;
    END IF;
END $$;

-- Fix user_id column types if they are text
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Dynamically drop all policies on tourplan_ tables to avoid dependency errors
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename LIKE 'tourplan_%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;

    -- Clean up invalid mock data that prevents UUID conversion
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tourplan_bookings' AND column_name = 'user_id' AND data_type = 'text') THEN
        EXECUTE 'DELETE FROM tourplan_bookings WHERE user_id = ''mock_user_123''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tourplan_profiles' AND column_name = 'user_id' AND data_type = 'text') THEN
        EXECUTE 'DELETE FROM tourplan_profiles WHERE user_id = ''mock_user_123''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tourplan_notifications' AND column_name = 'user_id' AND data_type = 'text') THEN
        EXECUTE 'DELETE FROM tourplan_notifications WHERE user_id = ''mock_user_123''';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tourplan_profiles' AND column_name = 'user_id' AND data_type = 'text') THEN
        ALTER TABLE tourplan_profiles ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tourplan_bookings' AND column_name = 'user_id' AND data_type = 'text') THEN
        ALTER TABLE tourplan_bookings ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tourplan_notifications' AND column_name = 'user_id' AND data_type = 'text') THEN
        ALTER TABLE tourplan_notifications ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    END IF;
END $$;



-- 3. CREATE NEW TABLES (if missing)
CREATE TABLE IF NOT EXISTS public.tourplan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    aadhaar_linked BOOLEAN DEFAULT false,
    preferred_language TEXT DEFAULT 'en',
    travel_style TEXT,
    avatar_url TEXT,
    whatsapp_enabled BOOLEAN DEFAULT false,
    whatsapp_phone TEXT,
    whatsapp_optin_at TIMESTAMPTZ,
    language_code TEXT DEFAULT 'en',
    legal_accepted_at TIMESTAMPTZ,
    legal_version TEXT,
    total_trips INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourplan_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_type TEXT NOT NULL DEFAULT 'TRAIN',
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    pnr TEXT,
    trip_data JSONB NOT NULL DEFAULT '{}',
    is_tatkal BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourplan_pnr_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    pnr TEXT NOT NULL,
    status TEXT NOT NULL,
    coach TEXT,
    berth TEXT,
    chart_prepared BOOLEAN DEFAULT false,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourplan_whatsapp_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    opted_in_at TIMESTAMPTZ DEFAULT now(),
    opted_out_at TIMESTAMPTZ,
    opted_in_source TEXT DEFAULT 'web_onboarding',
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourplan_ai_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourplan_trip_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    nights INTEGER DEFAULT 1,
    tier_label TEXT NOT NULL,
    total_estimate TEXT NOT NULL,
    total_amount NUMERIC DEFAULT 0,
    transport JSONB DEFAULT '{}',
    hotel JSONB DEFAULT '{}',
    local_transport JSONB DEFAULT '{}',
    full_plan JSONB DEFAULT '{}',
    tier_comparison JSONB DEFAULT '{}',
    status TEXT DEFAULT 'saved',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourplan_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    mode TEXT NOT NULL,
    origin TEXT,
    destination TEXT NOT NULL,
    travel_date DATE,
    results JSONB NOT NULL,
    result_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'api',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. NEW FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_tourplan_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tourplan_profiles (user_id, full_name, email, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), NEW.phone, 'Explorer'),
    NEW.email,
    NEW.phone,
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_tourplan_user();

CREATE OR REPLACE FUNCTION public.update_tourplan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tourplan_profiles_updated_at ON tourplan_profiles;
CREATE TRIGGER set_tourplan_profiles_updated_at
BEFORE UPDATE ON tourplan_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_tourplan_timestamp();

DROP TRIGGER IF EXISTS set_tourplan_bookings_updated_at ON tourplan_bookings;
CREATE TRIGGER set_tourplan_bookings_updated_at
BEFORE UPDATE ON tourplan_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_tourplan_timestamp();

-- 5. RLS POLICIES
ALTER TABLE tourplan_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON tourplan_profiles;
CREATE POLICY "Users can view own profile" ON tourplan_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id::uuid);
DROP POLICY IF EXISTS "Users can update own profile" ON tourplan_profiles;
CREATE POLICY "Users can update own profile" ON tourplan_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id::uuid);

ALTER TABLE tourplan_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own bookings" ON tourplan_bookings;
CREATE POLICY "Users can view own bookings" ON tourplan_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id::uuid);
DROP POLICY IF EXISTS "Users can insert own bookings" ON tourplan_bookings;
CREATE POLICY "Users can insert own bookings" ON tourplan_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id::uuid);

ALTER TABLE tourplan_ai_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own chat" ON tourplan_ai_chat_history;
CREATE POLICY "Users manage own chat" ON tourplan_ai_chat_history FOR ALL TO authenticated USING (auth.uid() = user_id::uuid);

ALTER TABLE tourplan_trip_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own trip plans" ON tourplan_trip_plans;
CREATE POLICY "Users manage own trip plans" ON tourplan_trip_plans FOR ALL TO authenticated USING (auth.uid() = user_id::uuid);

-- 6. REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tourplan_pnr_status_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tourplan_pnr_status_logs;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tourplan_ai_chat_history') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tourplan_ai_chat_history;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Fallback
END $$;
  `;

  try {
    await client.query(sql);
    console.log('✅ Successfully renamed tables and updated functions for TourPlan branding in Sydney project.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }

  const { rows } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'tourplan_%'
    ORDER BY table_name;
  `);

  console.log('\n📊 TourPlan Tables Confirmed:');
  rows.forEach(r => console.log(`  - ${r.table_name}`));

  await client.end();
}

main();
