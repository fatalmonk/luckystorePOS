const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const projectRoot = path.resolve(__dirname, '../../');
const adminWebPath = path.join(projectRoot, 'apps/admin_web');
const nodeModulesPath = path.join(adminWebPath, 'node_modules');

// Load direct from admin node modules
const { createClient } = require(path.join(nodeModulesPath, '@supabase/supabase-js'));

// Local import
const { InvariantVerifier } = require('./invariant-verifier.cjs');

// Configure env manually
function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, 'utf8');
  text.split(/\r?\n/).forEach(line => {
    const row = line.trim();
    if (!row || row.startsWith('#')) return;
    const idx = row.indexOf('=');
    if (idx > 0) {
      const k = row.substring(0, idx).trim();
      let v = row.substring(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[k] = process.env[k] || v;
    }
  });
}
loadEnv(path.join(adminWebPath, '.env.local'));
loadEnv(path.join(projectRoot, '.env.local'));

class EvalRunner {
  constructor() {
    const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var');

    this.serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    this.verifier = new InvariantVerifier();
  }

  async setup() {
    console.log('Setting up Eval Harness...');
    const email = `eval-runner-${Date.now()}@test.com`;
    const password = 'eval-password-123';
    
    const { data: user, error: userErr } = await this.serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });
    if (userErr) throw userErr;

    const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    
    this.evalUserClient = createClient(url, anonKey, {
      auth: { persistSession: false }
    });

    const signInRes = await this.evalUserClient.auth.signInWithPassword({ email, password });
    if (signInRes.error) throw signInRes.error;

    // Create clean, deterministic test entities via service role
    const tenantId = crypto.randomUUID();
    const storeId = crypto.randomUUID();
    const productId = crypto.randomUUID();

    console.log(`Seeding: Tenant=${tenantId}, Store=${storeId}`);
    const insTenant = await this.serviceClient.from('tenants').insert({ id: tenantId, name: 'Eval Tenant' });
    if (insTenant.error) throw insTenant.error;

    const insStore = await this.serviceClient.from('stores').insert({ id: storeId, tenant_id: tenantId, name: 'Eval Store' });
    if (insStore.error) throw insStore.error;
    
    const insUsr = await this.serviceClient.from('user_stores').insert({
      user_id: user.user.id,
      store_id: storeId,
      role: 'manager'
    });
    if (insUsr.error) throw insUsr.error;

    const insProd = await this.serviceClient.from('inventory_items').insert({
      id: productId,
      tenant_id: tenantId,
      name: 'Eval Product JS',
      sku: `EVALJS-${Date.now()}`,
      active: true,
      type: 'standard',
      price: 10.00
    });
    if (insProd.error) throw insProd.error;

    this.testTenantId = tenantId;
    this.testStoreId = storeId;
    this.testProductId = productId;
    this.testUserId = user.user.id;

    // Initial high availability inventory seeding
    const setInv = await this.serviceClient.rpc('set_inventory_stock', {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_product_id: this.testProductId,
      p_new_quantity: 100,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: crypto.randomUUID()
    });
    if (setInv.error) throw setInv.error;
  }

  async cleanup() {
    console.log('\nInitiating harness cleanup...');
    try {
      // Wipe records cascade via test tenant reference
      if (this.testTenantId) {
        await this.serviceClient.from('inventory_movements').delete().eq('tenant_id', this.testTenantId);
        await this.serviceClient.from('stock_levels').delete().eq('store_id', this.testStoreId);
        await this.serviceClient.from('inventory_items').delete().eq('tenant_id', this.testTenantId);
        await this.serviceClient.from('user_stores').delete().eq('store_id', this.testStoreId);
        await this.serviceClient.from('stores').delete().eq('id', this.testStoreId);
        await this.serviceClient.from('tenants').delete().eq('id', this.testTenantId);
        console.log('✅ Entity cascade deletion successful.');
      }
      if (this.testUserId) {
        await this.serviceClient.auth.admin.deleteUser(this.testUserId);
        console.log('✅ Test runtime user purged.');
      }
    } catch (e) {
      console.warn('⚠️ Cleanup warned:', e.message);
    }
  }

  async testDuplicateReplay() {
    console.log('\n--- 1. DUPLICATE REPLAY TEST ---');
    const opId = crypto.randomUUID();
    const req = {
      p_store_id: this.testStoreId,
      p_product_id: this.testProductId,
      p_quantity: 5,
      p_operation_id: opId
    };

    const res1 = await this.evalUserClient.rpc('deduct_stock', req);
    if (res1.error || !res1.data?.success) {
      throw new Error('First deduct failed: ' + JSON.stringify(res1.error || res1.data));
    }

    const res2 = await this.evalUserClient.rpc('deduct_stock', req);
    
    if (res1.data.movement_id !== res2.data.movement_id) {
      throw new Error('Duplicate replay did not return exact same movement ID');
    }
    if (res2.data.idempotent_replay !== true) {
      throw new Error('Response metadata did not flag idempotent_replay context');
    }

    const { data: stock } = await this.serviceClient
      .from('stock_levels')
      .select('qty')
      .eq('store_id', this.testStoreId)
      .eq('item_id', this.testProductId)
      .single();
      
    if (stock.qty !== 95) throw new Error(`Stock quantity corrupted. Expected 95, got ${stock.qty}`);
    console.log('✅ PASS: Deduplication successfully intercepted identical operation_id replay.');
  }

  async testStaleDeviceConflict() {
    console.log('\n--- 4. STALE DEVICE CONFLICT TEST ---');
    const opId = crypto.randomUUID();

    // Real DB: 95 units
    // Stale Device assumes 50 units
    const req = {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_product_id: this.testProductId,
      p_quantity_delta: -10,
      p_movement_type: 'sale',
      p_reference_type: 'sale',
      p_operation_id: opId,
      p_expected_quantity: 50
    };

    const res = await this.evalUserClient.rpc('adjust_inventory_stock', req);
    
    if (!res.data || res.data.conflict !== true) {
      throw new Error(`Failed assertion: Expected conflict=true but got ${JSON.stringify(res.data)}`);
    }
    if (res.data.actual_quantity !== 95) {
       throw new Error(`Bad verification state: Actual quantity should report 95, reported ${res.data.actual_quantity}`);
    }
    console.log('✅ PASS: Detected drift between expected_quantity(50) and actual_quantity(95).');
  }

  async testSerializationCollision() {
    console.log('\n--- 2. SERIALIZATION COLLISION TEST ---');
    
    // Reset stock explicitly to 5 units
    await this.serviceClient.rpc('set_inventory_stock', {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_product_id: this.testProductId,
      p_new_quantity: 5,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: crypto.randomUUID()
    });

    // Concurrency triggers
    const fire = () => this.evalUserClient.rpc('deduct_stock', {
      p_store_id: this.testStoreId,
      p_product_id: this.testProductId,
      p_quantity: 5,
      p_operation_id: crypto.randomUUID()
    });

    console.log('Firing simultaneous Race Condition RPC payloads...');
    const results = await Promise.all([ fire(), fire() ]);

    let totalSuccess = 0;
    let totalInsufficient = 0;
    
    results.forEach(res => {
      if (res.data && res.data.success) totalSuccess++;
      if (res.data && res.data.error && res.data.error.code === 'INSUFFICIENT_STOCK') totalInsufficient++;
    });

    console.log(`Outcome Metrics -> Allowed: ${totalSuccess}, Rejected: ${totalInsufficient}`);

    if (totalSuccess > 1) {
      throw new Error('RACE CONDITION DETECTED: Serialization allowed over-allocation (> 1 success for limit of 1)');
    }

    const { data: finalStock } = await this.serviceClient
      .from('stock_levels')
      .select('qty')
      .eq('store_id', this.testStoreId)
      .eq('item_id', this.testProductId)
      .single();

    if (finalStock.qty < 0) {
      throw new Error('INVARIANT BREACH: Atomic subtraction breached below zero constraint.');
    }

    console.log('✅ PASS: System serialize-enforced critical section. Quantity validated >= 0.');
  }

  async runAll() {
    try {
      await this.setup();
      await this.testDuplicateReplay();
      await this.testSerializationCollision();
      await this.testStaleDeviceConflict();
      
      console.log('\nExecuting Invariant Engine Audit...');
      await this.verifier.runAll();
      
      console.log('\n✅ COMPLETED: ALL DISTRIBUTED EVALUATORS SUCCESSFUL.');
    } catch (err) {
      console.error('\n❌ FAILURE IN CRITICAL RECOVERY EVAL PATHS:');
      console.error(err);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

const runner = new EvalRunner();
runner.runAll();
