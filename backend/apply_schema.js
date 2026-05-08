const pkg = require('pg');
const fs = require('fs');
const path = require('path');
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to apply schema.');
}

const client = new Client({
  connectionString
});

const sqlPath = path.join(__dirname, '../supabase/00_MASTER_SCHEMA.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  console.log("Connecting to database...");
  await client.connect();
  console.log("Connected! Applying master schema...");
  try {
    await client.query(sql);
    console.log("Master schema applied successfully!");
  } catch (error) {
    console.error("Error applying schema:", error.message);
  } finally {
    await client.end();
  }
}

main();
