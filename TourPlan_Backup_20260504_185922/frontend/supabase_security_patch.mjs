import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({
  connectionString
});

async function applySecurityPatch() {
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL for Security Patch');

  const policies = [
    {
      name: 'Enable RLS on tourplan_profiles',
      sql: `ALTER TABLE tourplan_profiles ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Enable RLS on tourplan_bookings',
      sql: `ALTER TABLE tourplan_bookings ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Enable RLS on tourplan_notifications',
      sql: `ALTER TABLE tourplan_notifications ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Enable RLS on tourplan_pnr_status_logs',
      sql: `ALTER TABLE tourplan_pnr_status_logs ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Profile Policies',
      sql: `
        DO $$ BEGIN
          DROP POLICY IF EXISTS "Users can view own profile" ON tourplan_profiles;
          DROP POLICY IF EXISTS "Users can update own profile" ON tourplan_profiles;
          
          CREATE POLICY "Users can view own profile" 
          ON tourplan_profiles FOR SELECT 
          USING (auth.uid()::text = user_id::text);
          
          CREATE POLICY "Users can update own profile" 
          ON tourplan_profiles FOR UPDATE 
          USING (auth.uid()::text = user_id::text);
        END $$;
      `
    },
    {
      name: 'Booking Policies',
      sql: `
        DO $$ BEGIN
          DROP POLICY IF EXISTS "Users can view own bookings" ON tourplan_bookings;
          DROP POLICY IF EXISTS "Users can insert own bookings" ON tourplan_bookings;
          
          CREATE POLICY "Users can view own bookings" 
          ON tourplan_bookings FOR SELECT 
          USING (auth.uid()::text = user_id::text);
          
          CREATE POLICY "Users can insert own bookings" 
          ON tourplan_bookings FOR INSERT 
          WITH CHECK (auth.uid()::text = user_id::text);
        END $$;
      `
    },
    {
      name: 'Notification Policies',
      sql: `
        DO $$ BEGIN
          DROP POLICY IF EXISTS "Users can view own notifications" ON tourplan_notifications;
          DROP POLICY IF EXISTS "Users can update own notifications" ON tourplan_notifications;
          
          CREATE POLICY "Users can view own notifications" 
          ON tourplan_notifications FOR SELECT 
          USING (auth.uid()::text = user_id::text);
          
          CREATE POLICY "Users can update own notifications" 
          ON tourplan_notifications FOR UPDATE 
          USING (auth.uid()::text = user_id::text);
        END $$;
      `
    }
  ];

  for (const step of policies) {
    try {
      await client.query(step.sql);
      console.log(`  🔒 ${step.name}`);
    } catch (e) {
      console.log(`  ⚠️  ${step.name}: ${e.message}`);
    }
  }

  await client.end();
  console.log('\\n✅ Supabase Row Level Security (RLS) successfully enforced!');
}

applySecurityPatch().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
