/**
 * YatraAI — Run both pending migrations against the remote Supabase project.
 * Uses the service role key via the REST API.
 * Run: node supabase/run_migrations.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ogrltimjrrvchqzlddqt.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('\n❌  SUPABASE_SERVICE_ROLE_KEY is not set.\n');
  console.error('Add it to .env.local or run:\n  SUPABASE_SERVICE_ROLE_KEY=eyJ... node supabase/run_migrations.mjs\n');
  process.exit(1);
}

const migrations = [
  '20260414_yatra_search_cache.sql',
  '20260414_yatra_trip_plans.sql',
];

async function runSQL(sql, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  // Try direct SQL execution via pg endpoint
  const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgRes.ok) {
    console.log(`✅  ${label} — applied successfully`);
    return true;
  } else {
    const err = await pgRes.text();
    console.warn(`⚠️   ${label} — ${pgRes.status}: ${err.slice(0, 200)}`);
    return false;
  }
}

console.log('\n🚀  YatraAI Migration Runner\n');
console.log(`📡  Target: ${SUPABASE_URL}\n`);

for (const file of migrations) {
  const filePath = path.join(__dirname, 'migrations', file);
  try {
    const sql = readFileSync(filePath, 'utf8');
    await runSQL(sql, file);
  } catch (e) {
    console.error(`❌  Failed to read ${file}:`, e.message);
  }
}

console.log('\n✨  Migration run complete. Check your Supabase Dashboard → Table Editor.\n');
