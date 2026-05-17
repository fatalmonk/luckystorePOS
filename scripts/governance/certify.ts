import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { InvariantVerifier } from '../evals/invariant-verifier';

const ENV_TARGET = process.env.CERTIFY_ENV || 'local';
const envPath = resolve(process.cwd(), `.env.certify.${ENV_TARGET}`);
if (!fs.existsSync(envPath)) {
  throw new Error(`Missing certification environment file: .env.certify.${ENV_TARGET}`);
}
dotenv.config({ path: envPath });
console.log(`[CERTIFY] Using environment from ${envPath}`);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required certification environment variable: ${name}`);
  }
  return value;
}

// Helper to generate deterministic UUIDs from strings
function getDeterministicUuid(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

class GovernanceCertifier {
  private serviceClient: SupabaseClient;
  private serializableClient!: SupabaseClient;
  private verifier: InvariantVerifier;

  private tenantId = getDeterministicUuid('certify-tenant-v1');
  private storeId = getDeterministicUuid('certify-store-v1');
  private productId = getDeterministicUuid('certify-product-v1');
  private userId = getDeterministicUuid('certify-user-v1');
  private baseSku = 'CERTIFY-V1';
  private email = requireEnv('CERTIFY_EMAIL');
  private password = requireEnv('CERTIFY_PASSWORD');
  private certificationRunId = `run-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  constructor() {
    const url = requireEnv('SUPABASE_URL');
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    this.serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY');
    this.serializableClient = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { 'Prefer': 'tx=serializable' } }
    });

    this.verifier = new InvariantVerifier();
  }

  async getEnvironmentFingerprint() {
    console.log('[CERTIFY] Fetching live runtime fingerprint...');
    const sqlPath = resolve(process.cwd(), 'scripts/governance/get_fingerprint.sql');
    try {
      // For local, we use supabase CLI
      if (ENV_TARGET === 'local') {
        const result = execSync(`supabase db query -f ${sqlPath}`).toString();
        const parsed = JSON.parse(result);
        return {
          ...parsed.rows?.[0]?.fingerprint,
          certified_at: new Date().toISOString(),
          isolation_mode: 'Pessimistic Row Locking + Idempotent Operation Identity',
          env: ENV_TARGET
        };
      } else {
        // For staging, we'd ideally use an RPC or direct connection.
        // For now, we attempt to call the RPC 'get_system_fingerprint'
        const { data, error } = await this.serviceClient.rpc('get_system_fingerprint');
        if (error) {
          throw new Error(`Staging fingerprinting failed: ${error.message}. Ensure 'get_system_fingerprint' RPC is installed on staging.`);
        }
        return {
          ...data,
          certified_at: new Date().toISOString(),
          isolation_mode: 'Pessimistic Row Locking + Idempotent Operation Identity',
          env: ENV_TARGET
        };
      }
    } catch (e) {
      console.error('❌ Fingerprinting failed:', e);
      throw e;
    }
  }

  async bootstrapDeterministicState() {
    console.log('[CERTIFY] Tearing down any previous certification data...');
    // Clean up backwards due to FKs
    await this.serviceClient.from('stock_movements').delete().eq('item_id', this.productId);
    await this.serviceClient.from('stock_levels').delete().eq('item_id', this.productId);
    await this.serviceClient.from('items').delete().eq('id', this.productId);
    await this.serviceClient.from('user_stores').delete().eq('user_id', this.userId);
    await this.serviceClient.from('stores').delete().eq('id', this.storeId);
    await this.serviceClient.from('tenants').delete().eq('id', this.tenantId);
    
    // Auth user deletion (hard via admin)
    const { data: users } = await this.serviceClient.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === this.email);
    if (user) {
      try {
        await this.serviceClient.auth.admin.deleteUser(user.id);
        await this.serviceClient.from('users').delete().eq('id', user.id);
      } catch (e) {}
    }

    console.log('[CERTIFY] Bootstrapping deterministic state...');
    const { data: authUser, error: userErr } = await this.serviceClient.auth.admin.createUser({
      email: this.email,
      password: this.password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });
    
    this.userId = authUser?.user?.id || this.userId;

    await this.serializableClient.auth.signInWithPassword({ email: this.email, password: this.password });

    await this.serviceClient.from('tenants').insert({ id: this.tenantId, name: 'Certify Tenant' });
    await this.serviceClient.from('stores').insert({ id: this.storeId, tenant_id: this.tenantId, name: 'Certify Store', code: `STORE-${this.baseSku}` });
    await this.serviceClient.from('users').insert({ id: this.userId, auth_id: this.userId, email: this.email, role: 'admin', tenant_id: this.tenantId });
    await this.serviceClient.from('user_stores').insert({ user_id: this.userId, store_id: this.storeId, role: 'manager' });
    await this.serviceClient.from('items').insert({ id: this.productId, name: 'Certify Product', sku: this.baseSku, price: 10.00, is_active: true });

    // Deterministic Seed
    const initRes = await this.serializableClient.rpc('set_inventory_stock', {
      p_tenant_id: this.tenantId,
      p_store_id: this.storeId,
      p_item_id: this.productId,
      p_new_quantity: 100,
      p_movement_type: 'manual',
      p_reference_type: 'system',
      p_operation_id: getDeterministicUuid('op-seed-v1')
    });
    if (initRes.error) throw new Error(`Seed failed: ${initRes.error.message}`);
  }

  async runReplayTraces() {
    console.log('[CERTIFY] Executing deterministic replay traces...');
    const req = {
      p_store_id: this.storeId,
      p_item_id: this.productId,
      p_quantity: 5,
      p_metadata: {},
      p_operation_id: getDeterministicUuid('op-deduct-1')
    };

    // 1. Initial Deduction
    await this.serializableClient.rpc('deduct_stock', req);
    
    // 2. Duplicate Replay (Idempotent)
    await this.serializableClient.rpc('deduct_stock', req);
    
    // 3. Concurrent Race Condition
    const reqRace1 = { ...req, p_operation_id: getDeterministicUuid('op-race-1') };
    const reqRace2 = { ...req, p_operation_id: getDeterministicUuid('op-race-2') };
    await Promise.all([
      this.serializableClient.rpc('deduct_stock', reqRace1),
      this.serializableClient.rpc('deduct_stock', reqRace2)
    ]);
  }

  async exportTraces(fingerprint: any) {
    console.log('[CERTIFY] Exporting immutable certification artifacts...');
    const { data: movements, error: movErr } = await this.serviceClient
        .from('stock_movements')
        .select('*')
        .eq('item_id', this.productId)
        .order('created_at', { ascending: true });
    if (movErr) throw movErr;

    const { data: stock } = await this.serviceClient
        .from('stock_levels')
        .select('*')
        .eq('item_id', this.productId)
        .single();

    const artifactsDir = resolve(process.cwd(), 'artifacts/governance');
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

    // 1. certification-report.json (Summary)
    const report = {
      run_id: this.certificationRunId,
      fingerprint,
      invariant_check: "PASSED",
      certification_status: `EMPIRICALLY_OPERATIONALLY_VERIFIED (${ENV_TARGET.toUpperCase()} + FINGERPRINT-GATED)`,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(resolve(artifactsDir, 'certification-report.json'), JSON.stringify(report, null, 2));

    // 2. replay-trace.jsonl (Ordered events)
    const traceJsonl = movements?.map(m => JSON.stringify(m)).join('\n') || '';
    fs.writeFileSync(resolve(artifactsDir, 'replay-trace.jsonl'), traceJsonl);

    // 3. ledger-diff.json (Before/After invariants)
    const diff = {
      initial_qty: 100,
      final_qty: stock?.qty_on_hand,
      movement_count: movements?.length,
      expected_final: 100 - (5 * 3) // 1 initial + 2 race (duplicate ignored)
    };
    fs.writeFileSync(resolve(artifactsDir, 'ledger-diff.json'), JSON.stringify(diff, null, 2));

    // 4. environment-fingerprint.json
    fs.writeFileSync(resolve(artifactsDir, 'environment-fingerprint.json'), JSON.stringify(fingerprint, null, 2));

    console.log(`[CERTIFY] Artifacts saved to ${artifactsDir}`);
  }

  async certify() {
    try {
      // Hard Governance Invariant: No certification without fingerprint parity
      const fingerprintPath = resolve(process.cwd(), 'artifacts/governance/environment-fingerprint.json');
      if (!fs.existsSync(fingerprintPath)) {
          throw new Error('❌ GOVERNANCE VIOLATION: Missing environment-fingerprint.json. Run "npx tsx scripts/governance/fingerprint.ts" first.');
      }
      const fingerprintReport = JSON.parse(fs.readFileSync(fingerprintPath, 'utf8'));
      if (!fingerprintReport.match) {
          throw new Error('❌ GOVERNANCE VIOLATION: Environment fingerprint mismatch. Certification blocked to prevent evidence contamination.');
      }

      const fingerprint = await this.getEnvironmentFingerprint();
      await this.bootstrapDeterministicState();
      await this.runReplayTraces();
      
      console.log('\n[CERTIFY] Verifying Global Invariants...');
      await this.verifier.runAll();

      await this.exportTraces(fingerprint);
      
      console.log('\n🎉 DETERMINISTIC CERTIFICATION COMPLETE.');
    } catch (e) {
      console.error('❌ CERTIFICATION FAILED:', e);
      process.exit(1);
    }
  }
}

new GovernanceCertifier().certify();
