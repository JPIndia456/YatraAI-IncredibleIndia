const pkg = require('pg');
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({
  connectionString
});

const sql = `
-- 4. SYSTEM LOGS (Observability & Debugging)
CREATE TABLE IF NOT EXISTS tourplan_sys_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,                   -- 'WHATSAPP', 'PAYMENT', 'AI', 'MCP'
  level TEXT DEFAULT 'INFO',               -- 'INFO', 'WARN', 'ERROR', 'CRITICAL'
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. IDEMPOTENCY CLAIMS (Prevents duplicate webhook processing)
CREATE TABLE IF NOT EXISTS tourplan_automation_claims (
  claim_id TEXT PRIMARY KEY,               -- msg_id or order_id
  service TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_tourplan_sys_logs_service ON tourplan_sys_logs(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tourplan_automation_claims_exp ON tourplan_automation_claims(processed_at);

-- RLS
ALTER TABLE tourplan_sys_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tourplan_automation_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access logs') THEN
        CREATE POLICY "Service role full access logs" ON tourplan_sys_logs FOR ALL USING (auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access claims') THEN
        CREATE POLICY "Service role full access claims" ON tourplan_automation_claims FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;
`;

async function main() {
  await client.connect();
  console.log("Applying missing tables...");
  await client.query(sql);
  console.log("Done!");
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
