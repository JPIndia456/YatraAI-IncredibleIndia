-- Yatra web app: itinerary booking inserts use booking_type TRIP + origin/destination.
-- Payment / confirmation updates trip_data + trip_details — requires UPDATE RLS.

ALTER TABLE public.yatra_bookings
  ADD COLUMN IF NOT EXISTS origin TEXT;

ALTER TABLE public.yatra_bookings
  ADD COLUMN IF NOT EXISTS destination TEXT;

ALTER TABLE public.yatra_bookings
  ADD COLUMN IF NOT EXISTS trip_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.yatra_bookings.origin IS 'Trip origin city (studio / planner)';
COMMENT ON COLUMN public.yatra_bookings.destination IS 'Trip destination city';
COMMENT ON COLUMN public.yatra_bookings.booking_type IS 'TRAIN | FLIGHT | BUS | TAXI | HOTEL | TRIP (multi-leg itinerary package)';

-- Allow authenticated users to update their own booking rows (PNR, status, trip_payload).
DROP POLICY IF EXISTS "Users can update own bookings" ON public.yatra_bookings;
CREATE POLICY "Users can update own bookings"
  ON public.yatra_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
