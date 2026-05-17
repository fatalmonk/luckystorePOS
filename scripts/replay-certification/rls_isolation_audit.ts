import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load env from .env.certify.staging if available
const envPath = path.resolve(process.cwd(), '.env.certify.staging');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing keys! SERVICE_ROLE_KEY or ANON_KEY not found in environment.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function uuidFromSeed(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function main() {
  const runId = `rls-audit-${Date.now()}`;
  const password = 'AuditPassword123!';
  
  const ids = {
    tenantA: uuidFromSeed(`${runId}:tenantA`),
    tenantO: uuidFromSeed(`${runId}:tenantO`),
    storeA: uuidFromSeed(`${runId}:storeA`),
    storeO: uuidFromSeed(`${runId}:storeO`),
    itemA: uuidFromSeed(`${runId}:itemA`),
    itemO: uuidFromSeed(`${runId}:itemO`),
    emailA: `alpha-${Date.now()}@test.com`,
  };

  console.log(`[RLS_AUDIT] Starting Multi-Tenant Isolation Audit [Run: ${runId}]...`);

  // 1. Setup Data via Service Role
  console.log('[RLS_AUDIT] Setting up Tenant Alpha and Omega...');
  
  const { error: tErr } = await supabaseAdmin.from('tenants').upsert([
    { id: ids.tenantA, name: 'Tenant Alpha' },
    { id: ids.tenantO, name: 'Tenant Omega' }
  ]);
  if (tErr) throw new Error(`Tenant setup failed: ${tErr.message}`);

  const { error: sErr } = await supabaseAdmin.from('stores').upsert([
    { id: ids.storeA, tenant_id: ids.tenantA, name: 'Store Alpha', code: `ALPHA-${runId.slice(-4)}` },
    { id: ids.storeO, tenant_id: ids.tenantO, name: 'Store Omega', code: `OMEGA-${runId.slice(-4)}` }
  ]);
  if (sErr) throw new Error(`Store setup failed: ${sErr.message}`);

  const baseSku = `SKU-${runId.slice(-4)}`;
  const { error: iErr } = await supabaseAdmin.from('items').upsert([
    { id: ids.itemA, tenant_id: ids.tenantA, sku: baseSku + '-A', name: 'Item Alpha', price: 10, cost: 5, active: true },
    { id: ids.itemO, tenant_id: ids.tenantO, sku: baseSku + '-O', name: 'Item Omega', price: 10, cost: 5, active: true }
  ]);
  if (iErr) throw new Error(`Item setup failed: ${iErr.message}`);

  const { error: stErr } = await supabaseAdmin.from('stock_levels').upsert([
    { store_id: ids.storeA, item_id: ids.itemA, qty: 100 },
    { store_id: ids.storeO, item_id: ids.itemO, qty: 500 }
  ]);
  if (stErr) throw new Error(`Stock setup failed: ${stErr.message}`);

  // Create Auth User for Alpha
  console.log(`[RLS_AUDIT] Creating Auth User: ${ids.emailA}`);
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: ids.emailA,
    password: password,
    email_confirm: true,
    user_metadata: { role: 'admin' }
  });

  if (authError) throw new Error(`Auth creation failed: ${authError.message}`);
  const authId = authUser.user.id;

  // Link to public.users
  const { error: linkError } = await supabaseAdmin.from('users').insert({
    auth_id: authId,
    email: ids.emailA,
    name: 'User Alpha',
    role: 'admin',
    tenant_id: ids.tenantA,
    store_id: ids.storeA
  });
  if (linkError) throw new Error(`User linking failed: ${linkError.message}`);

  // 2. Perform Audit as User Alpha
  console.log('[RLS_AUDIT] Authenticating as User Alpha...');
  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const { data: sessionData, error: sessionError } = await clientA.auth.signInWithPassword({
    email: ids.emailA,
    password: password
  });

  if (sessionError) throw new Error(`Sign in failed: ${sessionError.message}`);
  console.log(`[RLS_AUDIT] Signed in successfully.`);

  console.log('[RLS_AUDIT] Running Isolation Checks...');

  // Test A: Store Visibility check
  const { data: stores } = await clientA.from('stores').select('id, name');
  const visibleStoreIds = stores?.map(s => s.id) || [];
  const storePassed = visibleStoreIds.includes(ids.storeA) && !visibleStoreIds.includes(ids.storeO);
  console.log(`- Visible stores count: ${visibleStoreIds.length}`);
  console.log(`[CHECK] Store Isolation: ${storePassed ? '✅ PASSED' : '❌ FAILED'}`);

  // Test B: Item Visibility check
  const { data: items } = await clientA.from('items').select('id, sku');
  const visibleItemIds = items?.map(i => i.id) || [];
  const itemPassed = visibleItemIds.includes(ids.itemA) && !visibleItemIds.includes(ids.itemO);
  console.log(`- Visible items count: ${visibleItemIds.length}`);
  console.log(`[CHECK] Item Isolation: ${itemPassed ? '✅ PASSED' : '❌ FAILED'}`);

  // Test C: Stock Visibility check
  const { data: stock } = await clientA.from('stock_levels').select('*');
  const visibleStockStores = stock?.map(s => s.store_id) || [];
  const stockPassed = visibleStockStores.includes(ids.storeA) && !visibleStockStores.includes(ids.storeO);
  console.log(`- Visible stock levels count: ${visibleStockStores.length}`);
  console.log(`[CHECK] Stock Isolation: ${stockPassed ? '✅ PASSED' : '❌ FAILED'}`);

  // Test D: Mutation check
  console.log('[RLS_AUDIT] Attempting to modify Omega stock...');
  const { data: updateData } = await clientA
    .from('stock_levels')
    .update({ qty: 999 })
    .match({ store_id: ids.storeO, item_id: ids.itemO })
    .select();

  const updatePassed = (!updateData || updateData.length === 0);
  console.log(`[CHECK] Mutation Isolation (Update): ${updatePassed ? '✅ PASSED' : '❌ FAILED'}`);

  // 3. Final Result
  const allPassed = storePassed && itemPassed && stockPassed && updatePassed;
  const report = {
    status: allPassed ? 'VERIFIED' : 'FAILED',
    run_id: runId,
    checks: {
      store_isolation: storePassed ? 'PASSED' : 'FAILED',
      item_isolation: itemPassed ? 'PASSED' : 'FAILED',
      stock_isolation: stockPassed ? 'PASSED' : 'FAILED',
      mutation_isolation: updatePassed ? 'PASSED' : 'FAILED'
    }
  };

  console.log('\n--- RLS ISOLATION AUDIT REPORT ---');
  console.log(JSON.stringify(report, null, 2));

  // Cleanup
  console.log('\n[RLS_AUDIT] Cleaning up test user...');
  await supabaseAdmin.auth.admin.deleteUser(authId);
  
  if (!allPassed) process.exit(1);
}

main().catch(err => {
  console.error('[RLS_AUDIT] CRITICAL_FAILURE:', err);
  process.exit(1);
});
