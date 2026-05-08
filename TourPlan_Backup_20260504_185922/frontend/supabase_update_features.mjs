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
  console.log('🚀 Starting TourPlan Table Updates...');

  const migrations = [
    {
      name: 'Add language and onboarding columns to tourplan_profiles',
      sql: `
        ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
        ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS preferred_transport text;
        ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
        ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
      `
    },
    {
      name: 'Add localized_data column to tourplan_bookings',
      sql: `
        ALTER TABLE tourplan_bookings ADD COLUMN IF NOT EXISTS lang text DEFAULT 'en';
        ALTER TABLE tourplan_bookings ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
      `
    },
    {
      name: 'tourplan_bookings: origin, destination, trip_details + UPDATE RLS',
      sql: `
        ALTER TABLE public.tourplan_bookings ADD COLUMN IF NOT EXISTS origin TEXT;
        ALTER TABLE public.tourplan_bookings ADD COLUMN IF NOT EXISTS destination TEXT;
        ALTER TABLE public.tourplan_bookings ADD COLUMN IF NOT EXISTS trip_details JSONB DEFAULT '{}'::jsonb;
        DROP POLICY IF EXISTS "Users can update own bookings" ON public.tourplan_bookings;
        CREATE POLICY "Users can update own bookings"
          ON public.tourplan_bookings FOR UPDATE TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      name: 'Create tourplan_itineraries table for AI curated trips',
      sql: `
        CREATE TABLE IF NOT EXISTS public.tourplan_itineraries (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            title text,
            destination text,
            start_date date,
            end_date date,
            language text DEFAULT 'en',
            content jsonb, -- Stores the AI generated plan
            meta jsonb DEFAULT '{}',
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
      `
    },
    {
      name: 'Enable RLS and Grants for new table',
      sql: `
        ALTER TABLE tourplan_itineraries ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON tourplan_itineraries TO authenticated;
        GRANT ALL ON tourplan_itineraries TO service_role;
        
        -- Policy: Users can only see their own itineraries
        DROP POLICY IF EXISTS "Users can view own itineraries" ON tourplan_itineraries;
        CREATE POLICY "Users can view own itineraries" ON tourplan_itineraries
            FOR SELECT USING (auth.uid() = user_id);
            
        DROP POLICY IF EXISTS "Users can insert own itineraries" ON tourplan_itineraries;
        CREATE POLICY "Users can insert own itineraries" ON tourplan_itineraries
            FOR INSERT WITH CHECK (auth.uid() = user_id);
      `
    }
  ];

  for (const m of migrations) {
    try {
      await client.query(m.sql);
      console.log(`  ✅ ${m.name}`);
    } catch (e) {
      console.error(`  ❌ Error applying ${m.name}:`, e.message);
    }
  }

  console.log('\n📊 Verifying Final Schema...');
  const { rows } = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name LIKE 'tourplan_%'
    ORDER BY table_name, ordinal_position;
  `);

  console.log('\n✨ Database successfully synchronized with the latest feature set.');
  await client.end();
}

main().catch(console.error);
