-- =============================================
-- YatraAI Supabase: RLS + Triggers + Functions
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. ENABLE ROW LEVEL SECURITY on all tables
ALTER TABLE yatra_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_pnr_status_logs ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies if any exist
DROP POLICY IF EXISTS "Allow all" ON yatra_profiles;
DROP POLICY IF EXISTS "Allow all" ON yatra_bookings;
DROP POLICY IF EXISTS "Allow all" ON yatra_notifications;
DROP POLICY IF EXISTS "Allow all" ON yatra_pnr_status_logs;

-- =============================================
-- 2. PROFILES: users can only read/update their own profile
-- =============================================
CREATE POLICY "profiles_select_own" ON yatra_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON yatra_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON yatra_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypasses RLS (for backend worker)
CREATE POLICY "profiles_service_role_all" ON yatra_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 3. BOOKINGS: users can only see/create their own
-- =============================================
CREATE POLICY "bookings_select_own" ON yatra_bookings
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "bookings_insert_own" ON yatra_bookings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "bookings_update_own" ON yatra_bookings
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "bookings_service_role_all" ON yatra_bookings
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 4. NOTIFICATIONS: users see only their own
-- =============================================
CREATE POLICY "notifications_select_own" ON yatra_notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "notifications_update_own" ON yatra_notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "notifications_service_role_all" ON yatra_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 5. PNR LOGS: users see logs for their bookings
-- =============================================
CREATE POLICY "pnr_logs_select_own" ON yatra_pnr_status_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM yatra_bookings b
      WHERE b.id = yatra_pnr_status_logs.booking_id
        AND b.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "pnr_logs_service_role_all" ON yatra_pnr_status_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 6. TRIGGER: Auto-create yatra_profiles on user signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.yatra_profiles (user_id, full_name, email, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. TRIGGER: Auto-update updated_at timestamps
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bookings_updated_at ON yatra_bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON yatra_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 8. FUNCTION: Mark notification as read
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE yatra_notifications
  SET read = true, read_at = NOW()
  WHERE id = notification_id
    AND user_id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. Add missing columns if they don't exist
-- =============================================
ALTER TABLE yatra_notifications
  ADD COLUMN IF NOT EXISTS read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

ALTER TABLE yatra_bookings
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

ALTER TABLE yatra_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS total_trips integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- =============================================
-- 10. STORAGE BUCKET for profile pictures
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload/read their own avatar
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 11. AI CHAT HISTORY: Store persistent brain context
-- =============================================
CREATE TABLE IF NOT EXISTS public.yatra_ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.yatra_ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_select_own" ON yatra_ai_chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_insert_own" ON yatra_ai_chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 12. AUTOMATION: Sync total trips in profiles
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_profile_trips()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'PAID' OR NEW.status = 'UPCOMING') AND (OLD.status != 'PAID' AND OLD.status != 'UPCOMING') THEN
    UPDATE yatra_profiles
    SET total_trips = total_trips + 1
    WHERE user_id::text = NEW.user_id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_booking_confirmed ON yatra_bookings;
CREATE TRIGGER on_booking_confirmed
  AFTER UPDATE OF status ON yatra_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_trips();

-- =============================================
-- Done! Expanded YatraAI Supabase Automation.
-- =============================================
