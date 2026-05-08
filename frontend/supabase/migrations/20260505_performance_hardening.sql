-- PERFORMANCE & SECURITY HARDENING (2026-05-05)
-- Addressing Supabase Advisor recommendations

-- 1. FIX SEARCH PATHS (Security)
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- 2. CREATE MISSING INDEXES (Performance)
CREATE INDEX IF NOT EXISTS idx_yatra_bookings_user_id ON public.yatra_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_yatra_trip_plans_user_id ON public.yatra_trip_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_yatra_pnr_status_logs_booking_id ON public.yatra_pnr_status_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_yatra_telegram_preferences_user_id ON public.yatra_telegram_preferences (user_id);

-- 3. REMOVE DUPLICATE INDEXES (Performance)
-- yatra_profiles has both yatra_profiles_user_id_uidx and yatra_profiles_user_id_key
DROP INDEX IF EXISTS public.yatra_profiles_user_id_key;

-- 4. OPTIMIZE RLS (Performance)
-- Replacing auth.uid() with (SELECT auth.uid()) prevents unnecessary re-evaluations

-- yatra_profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.yatra_profiles;
CREATE POLICY "Users can manage their own profile" ON public.yatra_profiles
FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.yatra_profiles;
CREATE POLICY "Users can view own profile" ON public.yatra_profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.yatra_profiles;
CREATE POLICY "Users can update own profile" ON public.yatra_profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- yatra_bookings
DROP POLICY IF EXISTS "user_owns_yatra_bookings" ON public.yatra_bookings;
CREATE POLICY "user_owns_yatra_bookings" ON public.yatra_bookings
FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own bookings" ON public.yatra_bookings;
CREATE POLICY "Users can view own bookings" ON public.yatra_bookings
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.yatra_bookings;
CREATE POLICY "Users can insert own bookings" ON public.yatra_bookings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- yatra_trip_plans
DROP POLICY IF EXISTS "Users manage own trip plans" ON public.yatra_trip_plans;
CREATE POLICY "Users manage own trip plans" ON public.yatra_trip_plans
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 5. ENSURE TIMEZONE (Localization)
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';
