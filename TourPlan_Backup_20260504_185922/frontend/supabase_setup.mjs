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
  console.log('✅ Connected to Supabase PostgreSQL');

  const steps = [
    {
      name: 'Create tourplan_profiles',
      sql: `
        CREATE TABLE IF NOT EXISTS tourplan_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE NOT NULL,
          full_name TEXT,
          email TEXT,
          phone TEXT,
          aadhaar_linked BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'Create tourplan_bookings',
      sql: `
        CREATE TABLE IF NOT EXISTS tourplan_bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          trip_details JSONB NOT NULL,
          status TEXT DEFAULT 'pending',
          total_price NUMERIC,
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          confirmed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'Create tourplan_whatsapp_log',
      sql: `
        CREATE TABLE IF NOT EXISTS tourplan_whatsapp_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          wa_id TEXT NOT NULL,
          user_id UUID,
          input TEXT NOT NULL,
          output TEXT NOT NULL,
          intent_english TEXT,
          msg_id TEXT,
          status TEXT DEFAULT 'sent',
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'Create tourplan_sys_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS tourplan_sys_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service TEXT NOT NULL,
          level TEXT DEFAULT 'INFO',
          message TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'Create tourplan_automation_claims',
      sql: `
        CREATE TABLE IF NOT EXISTS tourplan_automation_claims (
          claim_id TEXT PRIMARY KEY,
          service TEXT NOT NULL,
          processed_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'Create tourplan_notifications',
      sql: `
        CREATE TABLE IF NOT EXISTS tourplan_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'Core Indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_tourplan_bookings_user ON tourplan_bookings(user_id);
        CREATE INDEX IF NOT EXISTS idx_tourplan_sys_logs_service ON tourplan_sys_logs(service, created_at DESC);
      `
    },
    {
      name: 'Add profile columns',
      sql: `
        ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS email text;
        ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS phone text;
      `
    },
    {
      name: 'Auto-profile trigger function',
      sql: `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.tourplan_profiles (user_id, full_name, email, phone, created_at, updated_at)
          VALUES (
            NEW.id,
            COALESCE(
              NEW.raw_user_meta_data->>'full_name', 
              split_part(NEW.email, '@', 1), 
              NEW.phone,
              'Traveler'
            ),
            NEW.email,
            NEW.phone,
            NOW(), NOW()
          )
          ON CONFLICT (user_id) DO NOTHING;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },

    {
      name: 'Drop old auth trigger',
      sql: `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`
    },
    {
      name: 'Auth signup trigger',
      sql: `
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `
    },
    {
      name: 'mark_notification_read RPC',
      sql: `
        CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
        RETURNS void AS $$
        BEGIN
          UPDATE tourplan_notifications
          SET read = true, read_at = NOW()
          WHERE id = notification_id
            AND user_id::text = auth.uid()::text;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'updated_at trigger function',
      sql: `
        CREATE OR REPLACE FUNCTION public.update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'bookings updated_at trigger',
      sql: `
        DROP TRIGGER IF EXISTS set_bookings_updated_at ON tourplan_bookings;
        CREATE TRIGGER set_bookings_updated_at
        BEFORE UPDATE ON tourplan_bookings
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
      `
    },
    {
      name: 'Storage bucket for avatars',
      sql: `
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
        ON CONFLICT (id) DO NOTHING;
      `
    },
    {
      name: 'Enable Realtime on tourplan_notifications',
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE tourplan_notifications;`
    },
    {
      name: 'Enable Realtime on tourplan_bookings',
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE tourplan_bookings;`
    },
    {
      name: 'Enable Realtime on tourplan_pnr_status_logs',
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE tourplan_pnr_status_logs;`
    },
    {
      name: 'Grant permissions to anon/authenticated/service_role',
      sql: `
        GRANT ALL ON tourplan_profiles TO anon, authenticated, service_role;
        GRANT ALL ON tourplan_bookings TO anon, authenticated, service_role;
        GRANT ALL ON tourplan_notifications TO anon, authenticated, service_role;
        GRANT ALL ON tourplan_pnr_status_logs TO anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
        GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;
      `
    }

  ];

  for (const step of steps) {
    try {
      await client.query(step.sql);
      console.log(`  ✅ ${step.name}`);
    } catch (e) {
      const msg = e.message;
      // Some errors are ok (already exists, etc)
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('already member')) {
        console.log(`  ⏭️  ${step.name} (already applied)`);
      } else {
        console.log(`  ⚠️  ${step.name}: ${msg.slice(0, 120)}`);
      }
    }
  }

  // Verify tables are visible
  const { rows } = await client.query(`
    SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as col_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' AND table_name LIKE 'tourplan_%'
    ORDER BY table_name;
  `);
  console.log('\n📊 TourPlan tables in Supabase:');
  rows.forEach(r => console.log(`  - ${r.table_name} (${r.col_count} columns)`));

  await client.end();
  console.log('\n🎉 All Supabase features applied successfully!');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
