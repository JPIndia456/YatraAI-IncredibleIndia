import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}
const client = new Client({ connectionString });

async function check() {
    await client.connect();
    const res = await client.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name LIKE 'yatra_%'
        ORDER BY table_name, ordinal_position;
    `);
    console.table(res.rows);
    await client.end();
}

check();
