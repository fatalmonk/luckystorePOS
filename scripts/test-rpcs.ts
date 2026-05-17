import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load local env for testing
dotenv.config({ path: path.resolve(process.cwd(), 'apps/admin_web/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpcs() {
  console.log('Testing RPC Contracts...\n');
  let hasErrors = false;

  const rpcsToTest = [
    { name: 'get_manager_dashboard_stats', params: { p_store_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_inventory_list', params: { p_store_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_sales_history', params: { p_store_id: '00000000-0000-0000-0000-000000000000', p_search_query: '', p_start_date: new Date().toISOString(), p_end_date: new Date().toISOString(), p_limit: 10, p_offset: 0 } },
    { name: 'get_sale_details', params: { p_sale_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_low_stock_items', params: { p_store_id: '00000000-0000-0000-0000-000000000000', p_limit: 10 } },
    { name: 'get_upcoming_reminders', params: { p_store_id: '00000000-0000-0000-0000-000000000000', p_days_ahead: 7, p_limit: 5 } }
  ];

  for (const rpc of rpcsToTest) {
    try {
      const { error } = await supabase.rpc(rpc.name, rpc.params);
      
      // We expect an auth error or empty result, but NOT a "function does not exist" or "permission denied" error.
      // If it's a 42883 (function does not exist) or 42501 (permission denied), it's a contract failure.
      if (error) {
        if (error.code === '42883' || error.code === '42501' || error.message.includes('does not exist')) {
          console.error(`❌ FAILED: ${rpc.name} - ${error.message} (Code: ${error.code})`);
          hasErrors = true;
        } else {
          console.log(`✅ OK (Expected runtime error): ${rpc.name} - ${error.message}`);
        }
      } else {
        console.log(`✅ OK: ${rpc.name}`);
      }
    } catch (err: any) {
      console.error(`❌ FAILED: ${rpc.name} - ${err.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\nRPC contract tests failed.');
    process.exit(1);
  } else {
    console.log('\nAll RPC contracts verified successfully.');
  }
}

testRpcs();
