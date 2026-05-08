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
  const tables = ['yatra_profiles', 'yatra_tour_guide_sessions', 'yatra_bookings', 'yatra_profiles'];
  
  for (const table of tables) {
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '${table}'
      );
    `);
    console.log(`Table ${table} exists: ${res.rows[0].exists}`);
  }
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
