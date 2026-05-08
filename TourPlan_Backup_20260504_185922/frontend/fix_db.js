const pkg = require('pg');
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
  console.log('✅ Connected');
  
  // 1. Add email column to tourplan_profiles if missing
  await client.query(`ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS email text;`);
  console.log('  - email column checked');

  // 2. Add phone column to tourplan_profiles if missing
  await client.query(`ALTER TABLE tourplan_profiles ADD COLUMN IF NOT EXISTS phone text;`);
  console.log('  - phone column checked');

  // 3. Update the handle_new_user function to be more flexible
  await client.query(`
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
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);
  console.log('  - handle_new_user function updated');

  // 4. Ensure trigger exists
  await client.query(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `);
  console.log('  - Auth trigger reset');

  await client.end();
  console.log('\n🎉 Fix applied!');
}

main().catch(err => {
  console.error('❌ Error applying fix:', err);
  process.exit(1);
});
