import pkg from 'pg';
const { Client } = pkg;
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}
const client = new Client({ connectionString });

async function applyMigrations() {
  try {
    await client.connect();
    console.log('\n🚀  YatraAI Supabase Migration Runner (Direct PG)');
    console.log('📡  Connected to Supabase PostgreSQL\n');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Applying: ${file}...`);
      const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await client.query(sql);
        console.log(`  ✅ Success`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('already a member')) {
          console.log(`  ⏭️  Skipped (Already exists)`);
        } else {
          console.error(`  ❌ Failed: ${err.message}`);
        }
      }
    }

    console.log('\n✨  All migrations processed.\n');
    await client.end();
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
    process.exit(1);
  }
}

applyMigrations();
