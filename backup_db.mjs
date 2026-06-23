import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const DATABASE_URL = "postgresql://postgres.hvmyxyccfnkrbxqbhlnm:mefZes-symvyf-romso3@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
const BACKUP_DIR = "/Users/mac.alvi/Desktop/lucky_store_db_backup";

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  await client.connect();
  console.log("Connected to database pooler (SSL).");

  const tableRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  `);

  const tables = tableRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables in public schema: ${tables.join(', ')}`);

  for (const table of tables) {
    try {
      console.log(`Exporting table: ${table}...`);
      const dataRes = await client.query(`SELECT * FROM public."${table}"`);
      const filePath = path.join(BACKUP_DIR, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(dataRes.rows, null, 2));
      console.log(`Saved ${dataRes.rows.length} rows to ${table}.json`);
    } catch (err) {
      console.error(`Error exporting table ${table}: ${err.message}`);
    }
  }

  await client.end();
  console.log(`\nDatabase Backup Complete. Saved to: ${BACKUP_DIR}`);
}

run().catch(console.error);
