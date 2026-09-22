import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { Client } from 'pg';
import { resolve } from 'path';

// Load .env.test if it exists, otherwise fall back to environment variables
config({ path: resolve(__dirname, '../.env.test') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const dbUrl = process.env.DATABASE_URL!;
const testProjectRef = process.env.SUPABASE_TEST_PROJECT_REF;
const disposableProjectRef = 'grxxenvdhfwzafzyykgo';

if (!supabaseUrl || !supabaseServiceKey || !dbUrl) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL must be set in .env.test');
}

if (testProjectRef !== disposableProjectRef) {
  throw new Error(`SUPABASE_TEST_PROJECT_REF must be ${disposableProjectRef}`);
}

const apiHost = new URL(supabaseUrl).hostname;
const databaseUser = decodeURIComponent(new URL(dbUrl).username);

if (!apiHost.startsWith(`${disposableProjectRef}.`) || databaseUser !== `postgres.${disposableProjectRef}`) {
  throw new Error('Supabase integration tests require the authorized disposable project; local and production targets are rejected');
}

import ws from 'ws';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
});

export const runSql = async (sql: string, params: any[] = []) => {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
};
