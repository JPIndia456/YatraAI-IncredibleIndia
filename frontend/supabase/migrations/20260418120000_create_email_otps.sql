-- Migration to create email_otps table for custom OTP flow
CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);

-- RLS Policies (Optional but good practice)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can manage this table (since we use it from server-side)
CREATE POLICY "Service role can do everything" ON public.email_otps
    USING (auth.jwt() ->> 'role' = 'service_role');
