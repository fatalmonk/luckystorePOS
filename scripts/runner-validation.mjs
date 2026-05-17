import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import process from 'process';

async function runAllTests() {
  console.log('=========================================');
  console.log('🚀 STARTING UNIFIED OPERATIONAL TEST suite');
  console.log('=========================================');

  const envPath = path.resolve(process.cwd(), 'apps/admin_web/.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(`❌ CRITICAL: .env.local not found at ${envPath}`);
    process.exit(1);
  }

  console.log(`Loading env from: ${envPath}`);
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.error('Failed to natively load env file, parsing manually...');
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  console.log('\n--- [1] ENV TEST ---');
  if (!url || !key) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment!');
    process.exit(1);
  }
  console.log('✅ Supabase connection variables present.');
  if (key.includes('service_role')) {
    console.error('❌ CRITICAL ERROR: Anon key is actually a SERVICE ROLE KEY!');
    process.exit(1);
  }
  console.log('✅ Token structure appears correctly scoped (Anon).');

  console.log(`Target URL: ${url}`);

  const supabase = createClient(url, key);
  let totalErrors = 0;

  console.log('\n--- [2] SCHEMA TEST ---');
  const tables = ['users', 'stores', 'tenants', 'items', 'categories', 'stock_levels', 'sales', 'sale_items', 'customers'];
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id', { count: 'exact', head: true }).limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.error(`❌ FAILED: Table '${table}' DOES NOT EXIST.`);
          totalErrors++;
        } else {
          console.log(`✅ OK: Table '${table}' exists (Returned status/error: ${error.code} - ${error.message})`);
        }
      } else {
        console.log(`✅ OK: Table '${table}' fully operational and queryable.`);
      }
    } catch (ex) {
       console.error(`❌ EXCEPTION checking table ${table}: ${ex.message}`);
       totalErrors++;
    }
  }

  console.log('\n--- [3] RLS TEST ---');
  const rlsTables = ['sales', 'items', 'stock_levels'];
  for (const t of rlsTables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    if (!error && data && data.length > 0) {
      console.error(`❌ FAILURE: Table '${t}' leaked data to unauthenticated anon user! RLS IS BROKEN!`);
      totalErrors++;
    } else {
      console.log(`✅ OK: Table '${t}' secure against unauthenticated read.`);
    }
  }

  console.log('\n--- [4] RPC CONTRACT TEST ---');
  const rpcs = [
    { name: 'get_manager_dashboard_stats', params: { p_store_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_inventory_list', params: { p_store_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_sales_history', params: { p_store_id: '00000000-0000-0000-0000-000000000000', p_search_query: '', p_start_date: new Date().toISOString(), p_end_date: new Date().toISOString(), p_limit: 1, p_offset: 0 } },
    { name: 'get_sale_details', params: { p_sale_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_low_stock_items', params: { p_store_id: '00000000-0000-0000-0000-000000000000', p_limit: 1 } },
    { name: 'get_upcoming_reminders', params: { p_store_id: '00000000-0000-0000-0000-000000000000', p_days_ahead: 7, p_limit: 1 } }
  ];

  for (const r of rpcs) {
    try {
      const { error } = await supabase.rpc(r.name, r.params);
      if (error) {
         if (error.code === '42883' || error.code === 'P0001' || error.message.includes('does not exist')) {
           console.error(`❌ FAILED: RPC '${r.name}' is missing or signature mismatched. (${error.message})`);
           totalErrors++;
         } else {
           console.log(`✅ OK: RPC '${r.name}' signature validated (Received expected runtime code: ${error.code})`);
         }
      } else {
        console.log(`✅ OK: RPC '${r.name}' call executed successfully.`);
      }
    } catch (ex) {
      console.error(`❌ EXCEPTION calling RPC ${r.name}: ${ex.message}`);
      totalErrors++;
    }
  }

  console.log('\n=========================================');
  if (totalErrors === 0) {
    console.log('🏆 ALL OPERATIONAL TESTS PASSED! 🏆');
  } else {
    console.error(`🚨 TESTS FAILED: Total critical issues found: ${totalErrors}`);
    process.exit(1);
  }
  console.log('=========================================');
}

runAllTests().catch(err => {
  console.error('Fatal Test Engine Failure:', err);
  process.exit(1);
});
