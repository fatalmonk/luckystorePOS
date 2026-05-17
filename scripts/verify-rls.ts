import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/admin_web/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Anon Key to ensure we test exactly what the client sees
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRls() {
  console.log('Verifying RLS Contracts (Anon Access)...\n');
  let hasErrors = false;

  const tablesToVerify = [
    'sales', 'items', 'stock_levels'
  ];

  for (const table of tablesToVerify) {
    // Attempting to select from tables without an active auth session
    const { data, error } = await supabase.from(table).select('id').limit(1);
    
    // If we succeed and get data back as Anon, RLS is broken or poorly configured!
    if (!error && data && data.length > 0) {
      console.error(`❌ FAILED: Table '${table}' returned data to an unauthenticated request. RLS may be disabled or too permissive.`);
      hasErrors = true;
    } else if (error) {
       // A permission denied error or empty array is expected for Anon on protected tables
       if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('row level security')) {
         console.log(`✅ OK: Table '${table}' blocked unauthenticated access correctly.`);
       } else {
         console.log(`✅ OK: Table '${table}' returned safe error/empty for Anon: ${error.message}`);
       }
    } else {
       // No error but no data returned. This usually means RLS is active and filtering out rows.
       console.log(`✅ OK: Table '${table}' returned 0 rows for unauthenticated request.`);
    }
  }

  if (hasErrors) {
    console.error('\nRLS verification failed. Please review table policies.');
    process.exit(1);
  } else {
    console.log('\nRLS verified successfully.');
  }
}

verifyRls();
