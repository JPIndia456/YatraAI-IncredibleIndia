/**
 * YatraAI — Apply pending SQL migrations to Supabase
 * Uses the Supabase Management API (no CLI auth needed)
 * 
 * Usage: 
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node supabase/push_migrations.mjs
 *   OR set the key in .env.local first
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local');
let envVars = {};
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    envVars[key] = val;
  }
} catch (e) {
  console.warn('Could not read .env.local, using process.env');
  envVars = process.env;
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Validation ───────────────────────────────────────────────────────────────
if (!SERVICE_KEY || SERVICE_KEY.startsWith('REPLACE_')) {
  console.error('\n❌  SUPABASE_SERVICE_ROLE_KEY missing or not set.\n');
  console.error('📋  How to get it:');
  console.error('  1. Open: https://supabase.com/dashboard/project/ogrltimjrrvchqzlddqt/settings/api');
  console.error('  2. Under "Project API keys", copy the secret (service_role) key');
  console.error('  3. Paste into .env.local: SUPABASE_SERVICE_ROLE_KEY=eyJ...\n');
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!PROJECT_REF) {
  console.error('❌  Could not extract project ref from SUPABASE_URL:', SUPABASE_URL);
  process.exit(1);
}

// ── Migration files ───────────────────────────────────────────────────────────
const MIGRATIONS = [
  '20260417_user_channels_auth.sql',
  '20260417_user_channels_hardening.sql',
  '20260418120000_create_email_otps.sql',
  '20260429161000_create_telephone_otps_legacy.sql',
  '20260430193000_create_auth_rate_limits.sql',
  '20260502120000_yatra_bookings_trip_columns_update_rls.sql',
  '20260503100000_yatra_profiles_insert_unique.sql',
  '20260505_performance_hardening.sql',
  '20260508_channel_type_enum_hardening.sql',
  '20260510193000_fix_missing_columns.sql',
];

// ── SQL Executor (Supabase Management REST v1) ────────────────────────────────
async function executeSQL(sql, label) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const body = JSON.stringify({ query: sql });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { message: text }; }

  if (res.ok) {
    console.log(`  ✅  ${label} — applied`);
    return true;
  }

  // Handle "already exists" gracefully
  const msg = json?.message || text || '';
  if (msg.includes('already exists') || msg.includes('duplicate')) {
    console.log(`  ⏭️   ${label} — already applied`);
    return true;
  }

  console.error(`  ❌  ${label} — HTTP ${res.status}: ${msg.slice(0, 200)}`);
  return false;
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log(`\n🚀  YatraAI Migration Runner`);
console.log(`    Project: ${PROJECT_REF}`);
console.log(`    Target:  ${SUPABASE_URL}\n`);

let passed = 0;
for (const file of MIGRATIONS) {
  const filePath = path.join(__dirname, 'migrations', file);
  try {
    const sql = readFileSync(filePath, 'utf8');
    const ok = await executeSQL(sql, file);
    if (ok) passed++;
  } catch (e) {
    console.error(`  ❌  Failed reading ${file}: ${e.message}`);
  }
}

console.log(`\n${passed === MIGRATIONS.length ? '✨' : '⚠️ '}  ${passed}/${MIGRATIONS.length} migrations applied.`);
if (passed === MIGRATIONS.length) {
  console.log(`\n    Tables created:`);
  console.log(`      • yatra_search_cache    (search results, 6h TTL)`);
  console.log(`      • yatra_trip_plans      (saved user itineraries)`);
  console.log(`\n    View in: https://supabase.com/dashboard/project/${PROJECT_REF}/editor\n`);
} else {
  console.log(`\n⚠️  Some migrations failed. You can run the SQL manually in:`);
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
}
