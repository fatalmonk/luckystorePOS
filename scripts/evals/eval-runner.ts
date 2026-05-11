import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { InvariantVerifier, AuthorityLevel } from './invariant-verifier';

dotenv.config({ path: resolve(__dirname, '../../apps/admin_web/.env.local') });

export class EvalRunner {
  private serviceClient: SupabaseClient;
  private evalUserClient!: SupabaseClient;
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

    await this.evalUserClient.auth.signInWithPassword({ email, password });

    // Seed test data
    const tenantId = crypto.randomUUID();
    const storeId = crypto.randomUUID();
    const productId = crypto.randomUUID();

    await this.serviceClient.from('tenants').insert({ id: tenantId, name: 'Eval Tenant' });
    await this.serviceClient.from('stores').insert({ id: storeId, tenant_id: tenantId, name: 'Eval Store' });
    
    // Assign user to store
    await this.serviceClient.from('user_stores').insert({
      user_id: user.user.id,
      store_id: storeId,
      role: 'manager'
    });

    await this.serviceClient.from('inventory_items').insert({
      id: productId,
      tenant_id: tenantId,
      name: 'Eval Product',
      sku: `EVAL-${Date.now()}`,
      active: true,
      type: 'standard',
      price: 10.00
    });

    this.testTenantId = tenantId;
    this.testStoreId = storeId;
    this.testProductId = productId;

    // Seed initial stock
    await this.serviceClient.rpc('set_inventory_stock', {
      p_tenant_id: this.testTenantId,
      p_store_id: this.testStoreId,
      p_product_id: this.testProductId,
      p_new_quantity: 100,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: crypto.randomUUID()
    });
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

    // First call
    const res1 = await this.evalUserClient.rpc('deduct_stock', req);
    if (!res1.data?.success) throw new Error('First deduct failed');

    // Second call (replay)
    const res2 = await this.evalUserClient.rpc('deduct_stock', req);
    
    if (res1.data.movement_id !== res2.data.movement_id) {
      throw new Error('Duplicate replay returned different movement_id');
    }
    if (res2.data.idempotent_replay !== true) {
      throw new Error('Duplicate replay did not flag as idempotent_replay');
    }

    // Verify stock is 95, not 90
    const { data: stock } = await this.serviceClient
      .from('stock_levels')
      .select('qty')
      .eq('store_id', this.testStoreId)
      .eq('item_id', this.testProductId)
      .single();
      
    if (stock.qty !== 95) throw new Error(`Stock is ${stock.qty}, expected 95`);
    console.log('✅ Replay Idempotency Verified. Authority: TRANSITIONAL (field naming drift active)');
  }

  async runAll() {
    try {
      await this.setup();
      
      await this.testDuplicateReplay();
      // ... other tests omitted for brevity in minimal patch ...
      
      console.log('\n[EVAL] Running Global Invariant Verifier...');
      await this.verifier.runAll();
      
      console.log('\n🎉 EVAL CYCLE COMPLETE.');
    } catch (err) {
      console.error('\n❌ EVAL HARNESS FAILED:', err);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  new EvalRunner().runAll();
}
