import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), 'apps/admin_web/.env.local') });

export enum AuthorityLevel {
  AUTHORITATIVE = 'AUTHORITATIVE',
  CONDITIONALLY_AUTHORITATIVE = 'CONDITIONALLY_AUTHORITATIVE',
  TRANSITIONAL = 'TRANSITIONAL',
  COMPATIBILITY_LAYER = 'COMPATIBILITY_LAYER',
  NON_AUTHORITATIVE = 'NON_AUTHORITATIVE',
  UNVERIFIED = 'UNVERIFIED'
}

export interface VerificationResult {
  invariant: string;
  success: boolean;
  authority: AuthorityLevel;
  anomalies: number;
  driftReported?: string[];
}

export class InvariantVerifier {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    if (!key) throw new Error('Missing Supabase Key for verifier');
    
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  /**
   * Verify SUM(quantity_delta) == current_qty for every product/store
   * Rigor Upgrade: Also checks Latest Ledger Entry vs Current Qty
   */
  async verifyLedgerSums(): Promise<VerificationResult> {
    console.log('[EVAL] Verifying ledger sums and sequence authority...');
    
    // Get all stock levels
    const { data: stocks, error: stockErr } = await this.supabase
      .from('stock_levels')
      .select('store_id, item_id, qty_on_hand');
      
    if (stockErr) throw stockErr;
    
    let anomalies = 0;
    let totalChecks = 0;
    const drifts: string[] = [];
    let overallAuthority = AuthorityLevel.AUTHORITATIVE;

    for (const stock of stocks || []) {
      totalChecks++;
      
      // Lineage is now unified: item_id is used universally across both tables.

      const { data: movements, error: movErr } = await this.supabase
        .from('inventory_movements')
        .select('quantity_delta, new_quantity, operation_id')
        .eq('store_id', stock.store_id)
        .eq('item_id', stock.item_id)
        .order('created_at', { ascending: false });
        
      if (movErr) throw movErr;
      
      const ledgerSum = movements?.reduce((acc, row) => acc + (row.quantity_delta || 0), 0) || 0;
      const latestQuantity = movements && movements.length > 0 ? movements[0].new_quantity : 0;
      
      // Check 1: Delta Sum matches current state
      if (ledgerSum !== stock.qty_on_hand) {
        console.error(`❌ Ledger Mismatch! Store: ${stock.store_id}, Item: ${stock.item_id}. Delta sum: ${ledgerSum}, Current qty: ${stock.qty_on_hand}`);
        anomalies++;
      }

      // Check 2: Latest Ledger state matches current state (Authority check)
      if (latestQuantity !== stock.qty_on_hand && movements && movements.length > 0) {
        console.error(`❌ Authority Drift! Store: ${stock.store_id}, Item: ${stock.item_id}. Latest Row qty: ${latestQuantity}, Cache table qty: ${stock.qty_on_hand}`);
        anomalies++;
        drifts.push(`Cache Inconsistency at Store ${stock.store_id} / Item ${stock.item_id}`);
      }
    }
    
    return {
      invariant: 'Ledger Sum & Sequence Authority',
      success: anomalies === 0,
      authority: overallAuthority,
      anomalies,
      driftReported: [...new Set(drifts)]
    };
  }

  /**
   * Verify previous_quantity + quantity_delta == new_quantity across all rows
   */
  async verifyAppendOnlyMath(): Promise<VerificationResult> {
    console.log('[EVAL] Verifying sequential math inside inventory_movements...');
    
    const { data: movements, error } = await this.supabase
      .from('inventory_movements')
      .select('id, store_id, item_id, previous_quantity, quantity_delta, new_quantity')
      .order('item_id', { ascending: true });
      
    if (error) throw error;
    
    let anomalies = 0;
    const drifts: string[] = [];

    for (const mov of movements || []) {
      if (mov.previous_quantity + mov.quantity_delta !== mov.new_quantity) {
        console.error(`❌ Math Anomaly! Row ${mov.id}: ${mov.previous_quantity} + ${mov.quantity_delta} != ${mov.new_quantity}`);
        anomalies++;
      }
    }
    
    return {
      invariant: 'Append-Only Math Integrity',
      success: anomalies === 0,
      authority: AuthorityLevel.AUTHORITATIVE, // Internal math check is authoritative over its own schema context
      anomalies
    };
  }

  async runAll() {
    const results = [
      await this.verifyLedgerSums(),
      await this.verifyAppendOnlyMath()
    ];

    console.log('\n--- INVARIANT VERIFICATION SUMMARY ---');
    for (const res of results) {
      const statusIcon = res.success ? '✅' : '❌';
      console.log(`${statusIcon} Invariant: ${res.invariant}`);
      console.log(`   Authority: ${res.authority}`);
      console.log(`   Success: ${res.success}`);
      if (res.driftReported?.length) {
        console.log(`   Drift Detected:`);
        res.driftReported.forEach(d => console.log(`     - ${d}`));
      }
    }

    if (results.some(r => !r.success)) {
        throw new Error('Invariant verification failed.');
    }
  }
}
