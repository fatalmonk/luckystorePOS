import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { InvariantVerifier, AuthorityLevel } from './invariant-verifier';

dotenv.config({ path: resolve(process.cwd(), 'apps/admin_web/.env.local') });

export class EvalRunner {
  private serviceClient: SupabaseClient;
  private evalUserClient!: SupabaseClient;
  private serializableClient!: SupabaseClient;
  private verifier: InvariantVerifier;

  private testTenantId!: string;
  private testStoreId!: string;
  private testProductId!: string;

  constructor() {
    const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

    this.serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    this.verifier = new InvariantVerifier();
  }

  async setup() {
    console.log('[EVAL] Setting up Eval Harness...');
    // Create test user
    const email = `eval-runner-${Date.now()}@test.com`;
    const password = 'eval-password-123';
    
    const { data: authUser, error: userErr } = await this.serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });
    if (userErr) throw userErr;

    const userId = authUser.user.id; // We force public userId to equal this to bridge local RLS/FK differences.

    const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    
    this.evalUserClient = createClient(url, anonKey, {
      auth: { persistSession: false }
    });

    this.serializableClient = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { 'Prefer': 'tx=serializable' } }
    });

    const { error: signInErr } = await this.evalUserClient.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    
    // Auth state is required for the serializable client as well
    await this.serializableClient.auth.signInWithPassword({ email, password });

    // Seed test data IDs
    const tenantId = crypto.randomUUID();
    const storeId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const baseSku = `EVAL-${Date.now()}`;

    // 1. Tenant
    const tenRes = await this.serviceClient.from('tenants').insert({ id: tenantId, name: 'Eval Tenant' });
    if (tenRes.error) throw tenRes.error;

    // 2. Store
    const storeRes = await this.serviceClient.from('stores').insert({ 
      id: storeId, 
      tenant_id: tenantId, 
      name: 'Eval Store',
      code: `STORE-${baseSku}`
    });
    if (storeRes.error) throw storeRes.error;
    
    // 3. Public User
    const userRes = await this.serviceClient.from('users').insert({
      id: userId,
      auth_id: userId,
      email: email,
      role: 'admin',
      tenant_id: tenantId
    });
    if (userRes.error) throw userRes.error;

    // 4. Assign user to store
    const usRes = await this.serviceClient.from('user_stores').insert({
      user_id: userId,
      store_id: storeId,
      role: 'manager'
    });
    if (usRes.error) throw usRes.error;

    // 5. SEED AUTHORITATIVE ITEM TABLE
    const itemRes = await this.serviceClient.from('items').insert({
      id: productId,
      name: 'Eval Product',
      sku: baseSku,
      price: 10.00,
      is_active: true
    });
    if (itemRes.error) throw itemRes.error;

    this.testTenantId = tenantId;
    this.testStoreId = storeId;
    this.testProductId = productId;

    // Explicitly seed initial stock via authoritative ledger RPC
    const initRes = await this.serializableClient.rpc('set_inventory_stock', {
      p_tenant_id: tenantId,
      p_store_id: storeId,
      p_item_id: productId,
      p_new_quantity: 100,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: crypto.randomUUID()
    });
    if (initRes.error) throw new Error(`Failed to initialize seed stock: ${initRes.error.message}`);
  }

  async testDuplicateReplay() {
    console.log('\n--- 1. DUPLICATE REPLAY TEST ---');
    const opId = crypto.randomUUID();
    
    const req = {
      p_store_id: this.testStoreId,
      p_item_id: this.testProductId,
      p_quantity: 5,
      p_metadata: {},
      p_operation_id: opId
    };

    // First call
    const res1 = await this.serializableClient.rpc('deduct_stock', req);
    if (!res1.data?.success) {
      console.error('[FAILURE] First deduct RPC returned:', res1);
      throw new Error('First deduct failed');
    }

    // Second call (replay)
    const res2 = await this.serializableClient.rpc('deduct_stock', req);
    
    if (res1.data.movement_id !== res2.data.movement_id) {
      throw new Error('Duplicate replay returned different movement_id');
    }
    if (res2.data.idempotent_replay !== true) {
      throw new Error('Duplicate replay did not flag as idempotent_replay');
    }

    // Verify stock is 95, not 90
    const { data: stock } = await this.serviceClient
      .from('stock_levels')
      .select('qty_on_hand')
      .eq('store_id', this.testStoreId)
      .eq('item_id', this.testProductId)
      .single();
      
    if (!stock) throw new Error('Stock level record not found');
    if (stock.qty_on_hand !== 95) throw new Error(`Stock is ${stock.qty_on_hand}, expected 95`);
    console.log('✅ Replay Idempotency Verified. Authority: TRANSITIONAL (field naming drift active)');
  }

  async testStaleDeviceConflict() {
    console.log('\n--- 4. STALE DEVICE CONFLICT TEST ---');
    // Reset stock to 95 so expected assertions remain stable
    await this.evalUserClient.rpc('set_inventory_stock', {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_item_id: this.testProductId,
      p_new_quantity: 95,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: crypto.randomUUID()
    });

    const opId = crypto.randomUUID();

    // Device assumes stock is 50, but actual stock is 95
    const req = {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_item_id: this.testProductId,
      p_quantity_delta: -10,
      p_movement_type: 'sale',
      p_reference_type: 'sale',
      p_operation_id: opId,
      p_expected_quantity: 50 // Stale assumption!
    };

    const res = await this.evalUserClient.rpc('adjust_inventory_stock', req);
    
    if (res.data?.success !== false || res.data?.conflict !== true) {
      throw new Error('Did not detect stale device conflict');
    }
    
    if (res.data.actual_quantity !== 95) {
      throw new Error('Conflict response missing actual_quantity');
    }

    console.log('✅ Stale device correctly detected and rejected.');
  }

  async testSerializationCollision() {
    console.log('\n--- 2. SERIALIZATION COLLISION TEST ---');
    
    // Set stock to 5
    const setRes = await this.evalUserClient.rpc('set_inventory_stock', {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_item_id: this.testProductId,
      p_new_quantity: 5,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: crypto.randomUUID()
    });
    if (setRes.error) {
      console.error('[SETUP FAILURE] set_inventory_stock failed:', setRes.error);
      throw new Error(`Failed to reset stock for serialization test: ${setRes.error.message}`);
    }

    // Fire 2 concurrent deductions of 5 each
    const req1 = {
      p_store_id: this.testStoreId,
      p_item_id: this.testProductId,
      p_quantity: 5,
      p_metadata: {},
      p_operation_id: crypto.randomUUID()
    };
    
    const req2 = {
      p_store_id: this.testStoreId,
      p_item_id: this.testProductId,
      p_quantity: 5,
      p_metadata: {},
      p_operation_id: crypto.randomUUID()
    };

    console.log('Firing concurrent transactions...');
    const results = await Promise.all([
      this.serializableClient.rpc('deduct_stock', req1),
      this.serializableClient.rpc('deduct_stock', req2)
    ]);

    let successCount = 0;
    let insufficientCount = 0;
    let errorCount = 0;

    for (const res of results) {
      if (res.error) {
        errorCount++;
      } else if (res.data?.success) {
        successCount++;
      } else if (res.data?.error?.code === 'INSUFFICIENT_STOCK') {
        insufficientCount++;
      }
    }

    console.log(`Results -> Success: ${successCount}, Insufficient: ${insufficientCount}, Error: ${errorCount}`);

    if (successCount > 1) {
      throw new Error('Serialization collision failed: Allowed both concurrent deductions of 5 to pass on a stock of 5');
    }

    const { data: stock } = await this.serviceClient
      .from('stock_levels')
      .select('qty_on_hand')
      .eq('store_id', this.testStoreId)
      .eq('item_id', this.testProductId)
      .single();

    if (!stock) throw new Error('Stock level not found for verification');
    if (stock.qty_on_hand < 0) {
      throw new Error('Stock went negative during concurrent transaction!');
    }

    console.log('✅ Concurrent transactions correctly serialized and prevented negative stock.');
  }

  async runAll() {
    try {
      await this.setup();
      
      await this.testDuplicateReplay();
      await this.testSerializationCollision();
      await this.testStaleDeviceConflict();
      
      console.log('\n[EVAL] Running Global Invariant Verifier...');
      await this.verifier.runAll();
      
      console.log('\n🎉 EVAL CYCLE COMPLETE.');
    } catch (err) {
      console.error('\n❌ EVAL HARNESS FAILED:', err);
      process.exit(1);
    }
  }
}

// Run unconditionally
new EvalRunner().runAll();
