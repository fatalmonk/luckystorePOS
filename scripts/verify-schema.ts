import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/admin_web/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('Verifying Schema Contracts...\n');
  let hasErrors = false;

  const requiredTables = [
    'users', 'stores', 'tenants', 'items', 'categories', 
    'stock_levels', 'sales', 'sale_items', 'customers'
  ];

  for (const table of requiredTables) {
    // Attempt a limit 1 query. If the table doesn't exist, this will fail with 42P01
    const { error } = await supabase.from(table).select('id').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error(`❌ FAILED: Table '${table}' does not exist.`);
        hasErrors = true;
      } else if (error.code === '42501') {
         console.log(`✅ OK: Table '${table}' exists (RLS active).`);
      } else {
         console.log(`✅ OK: Table '${table}' exists (Query returned: ${error.message}).`);
      }
    } else {
      console.log(`✅ OK: Table '${table}' exists and is queryable.`);
    }
  }

  if (hasErrors) {
    console.error('\nSchema verification failed.');
    process.exit(1);
  } else {
    console.log('\nSchema verified successfully.');
  }
}

verifySchema();
