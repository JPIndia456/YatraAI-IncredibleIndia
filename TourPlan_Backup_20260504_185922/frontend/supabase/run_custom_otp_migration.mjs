import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}
const client = new Client({ connectionString });

const sql = `
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

-- RLS Policies
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can manage this table (since we use it from server-side)
DROP POLICY IF EXISTS "Service role can do everything" ON public.email_otps;
CREATE POLICY "Service role can do everything" ON public.email_otps
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions to service_role specifically
GRANT ALL ON public.email_otps TO service_role;
`;

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');
    
    await client.query(sql);
    console.log('✅ Migration applied successfully: email_otps table created.');
    
    await client.end();
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
}

main();
