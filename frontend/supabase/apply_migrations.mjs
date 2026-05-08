import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load from .env.local
const envPath = path.join(__dirname, '../.env.local');
let env = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
} catch (e) { console.warn("No .env.local found, using process.env"); }

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSql(sql, label) {
  // NOTE: Direct SQL over REST is only possible if you have a custom proxy or specific Supabase setup.
  // Standard Supabase requires using the Dashboard SQL Editor or CLI.
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log(`  ✅  ${label}`);
    return true;
  } else {
    const body = await res.text();
    if (body.includes('already exists')) {
      console.log(`  ⏭️   ${label} — already applied`);
      return true;
    }
    console.error(`  ❌  ${label} — HTTP ${res.status}: ${body.slice(0, 200)}`);
    return false;
  }
}

console.log('\n🚀  YatraAI Dynamic Migration Runner');
console.log(`    Target: ${SUPABASE_URL}\n`);

const migrationsDir = path.join(__dirname, 'migrations');
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
  await executeSql(sql, file);
}

console.log('\n✨  Done. If you see 404s, please copy the SQL from supabase/migrations/ into your Supabase Dashboard SQL Editor.\n');
