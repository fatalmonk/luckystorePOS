import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    console.log('Connecting to Neon database...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT 1 as result');
    console.log('Query result:', res.rows);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
