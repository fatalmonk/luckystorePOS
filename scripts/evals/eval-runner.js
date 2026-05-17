"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvalRunner = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
const invariant_verifier_1 = require("./invariant-verifier");
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../../apps/admin_web/.env.local') });
class EvalRunner {
    constructor() {
        const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!serviceKey)
            throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
        this.serviceClient = (0, supabase_js_1.createClient)(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        this.verifier = new invariant_verifier_1.InvariantVerifier();
    }
    async setup() {
        console.log('Setting up Eval Harness...');
        // Create test user
        const email = `eval-runner-${Date.now()}@test.com`;
        const password = 'eval-password-123';
        const { data: user, error: userErr } = await this.serviceClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'admin' }
        });
        if (userErr)
            throw userErr;
        const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
        this.evalUserClient = (0, supabase_js_1.createClient)(url, anonKey, {
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
        if (!res1.data?.success)
            throw new Error('First deduct failed');
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
        if (stock.qty !== 95)
            throw new Error(`Stock is ${stock.qty}, expected 95`);
        console.log('✅ Duplicate replay rejected successfully. Stock correctly updated once.');
    }
    async testStaleDeviceConflict() {
        console.log('\n--- 4. STALE DEVICE CONFLICT TEST ---');
        const opId = crypto.randomUUID();
        // Device assumes stock is 50, but actual stock is 95
        const req = {
            p_tenant_id: this.testTenantId,
            p_store_id: this.testStoreId,
            p_product_id: this.testProductId,
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
        await this.serviceClient.rpc('set_inventory_stock', {
            p_tenant_id: this.testTenantId,
            p_store_id: this.testStoreId,
            p_product_id: this.testProductId,
            p_new_quantity: 5,
            p_movement_type: 'manual',
            p_reference_type: 'system',
            p_operation_id: crypto.randomUUID()
        });
        // Fire 2 concurrent deductions of 5 each
        const req1 = {
            p_store_id: this.testStoreId,
            p_product_id: this.testProductId,
            p_quantity: 5,
            p_operation_id: crypto.randomUUID()
        };
        const req2 = {
            p_store_id: this.testStoreId,
            p_product_id: this.testProductId,
            p_quantity: 5,
            p_operation_id: crypto.randomUUID()
        };
        console.log('Firing concurrent transactions...');
        const results = await Promise.all([
            this.evalUserClient.rpc('deduct_stock', req1),
            this.evalUserClient.rpc('deduct_stock', req2)
        ]);
        let successCount = 0;
        let insufficientCount = 0;
        let errorCount = 0;
        for (const res of results) {
            if (res.error) {
                errorCount++;
            }
            else if (res.data?.success) {
                successCount++;
            }
            else if (res.data?.error?.code === 'INSUFFICIENT_STOCK') {
                insufficientCount++;
            }
        }
        console.log(`Results -> Success: ${successCount}, Insufficient: ${insufficientCount}, Error: ${errorCount}`);
        if (successCount > 1) {
            throw new Error('Serialization collision failed: Allowed both concurrent deductions of 5 to pass on a stock of 5');
        }
        const { data: stock } = await this.serviceClient
            .from('stock_levels')
            .select('qty')
            .eq('store_id', this.testStoreId)
            .eq('item_id', this.testProductId)
            .single();
        if (stock.qty < 0) {
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
            console.log('\nRunning Global Invariant Verifier...');
            await this.verifier.runAll();
            console.log('\n🎉 ALL DISTRIBUTED EVALS PASSED.');
        }
        catch (err) {
            console.error('\n❌ EVAL HARNESS FAILED:', err);
            process.exit(1);
        }
    }
}
exports.EvalRunner = EvalRunner;
// Run if called directly
if (require.main === module) {
    new EvalRunner().runAll();
}
