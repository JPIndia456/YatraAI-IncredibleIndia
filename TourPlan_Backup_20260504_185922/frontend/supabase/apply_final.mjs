import pkg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({ connectionString });

async function run() {
    console.log('🚀 Starting Final Supabase Sync...');
    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        const migrationPath = path.join(__dirname, 'migrations/20260417_final_sync.sql');
        const sql = readFileSync(migrationPath, 'utf8');

        console.log('⏳ Applying 20260417_final_sync.sql...');
        await client.query(sql);
        console.log('✨ Migration applied successfully!');

    } catch (err) {
        console.error('❌ Sync Failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
