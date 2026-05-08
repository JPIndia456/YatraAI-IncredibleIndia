-- 1. FIX tourplan_bookings
ALTER TABLE public.tourplan_bookings RENAME COLUMN trip_data TO trip_details;
ALTER TABLE public.tourplan_bookings RENAME COLUMN total_amount TO total_price;

-- 2. ENABLE RLS
ALTER TABLE public.tourplan_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourplan_tour_guide_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourplan_trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yatra_ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_channels ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES (Allow users to see/edit their own data)
DO $$ 
BEGIN
    -- tourplan_bookings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own bookings') THEN
        CREATE POLICY "Users can manage their own bookings" ON public.tourplan_bookings
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- tourplan_tour_guide_sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own sessions') THEN
        CREATE POLICY "Users can manage their own sessions" ON public.tourplan_tour_guide_sessions
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- tourplan_trip_plans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own plans') THEN
        CREATE POLICY "Users can manage their own plans" ON public.tourplan_trip_plans
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- yatra_ai_memory
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own memory') THEN
        CREATE POLICY "Users can manage their own memory" ON public.yatra_ai_memory
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. GRANT ACCESS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
