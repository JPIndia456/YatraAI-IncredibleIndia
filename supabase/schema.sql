-- YATRA TRAVEL APP - COMPLETE SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE yatra_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT UNIQUE,
    aadhaar_linked BOOLEAN DEFAULT FALSE,
    preferred_language TEXT DEFAULT 'en',
    travel_style TEXT DEFAULT 'budget',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE yatra_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    booking_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount INTEGER NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    pnr TEXT,
    trip_data JSONB NOT NULL,
    is_tatkal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE TABLE yatra_pnr_status_logs (
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

CREATE TABLE yatra_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES yatra_bookings(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE yatra_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_pnr_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE yatra_notifications ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE yatra_bookings, yatra_pnr_status_logs, yatra_notifications;

CREATE POLICY "user_owns_bookings" ON yatra_bookings FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_owns_notifications" ON yatra_notifications FOR ALL TO authenticated USING (user_id = auth.uid());
