-- tourplan_profiles: allow first-row upsert from the app + stable ON CONFLICT (user_id)
-- Run via Supabase CLI or paste into SQL Editor.

-- One profile row per auth user (required for PostgREST upsert onConflict=user_id)
CREATE UNIQUE INDEX IF NOT EXISTS tourplan_profiles_user_id_uidx ON public.tourplan_profiles (user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.tourplan_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.tourplan_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);
