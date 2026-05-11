const path = require('path');
const fs = require('fs');
const projectRoot = path.resolve(__dirname, '../../');
const adminWebPath = path.join(projectRoot, 'apps/admin_web');
const nodeModulesPath = path.join(adminWebPath, 'node_modules');

// Dynamically load dependencies from the subproject's node_modules
const { createClient } = require(path.join(nodeModulesPath, '@supabase/supabase-js'));

// Load env vars manually
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

class InvariantVerifier {
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
   */
  async verifyLedgerSums() {
    console.log('Verifying ledger sums across all stock levels...');
    
    const { data: stocks, error: stockErr } = await this.supabase
      .from('stock_levels')
      .select('store_id, item_id, qty');
      
    if (stockErr) throw stockErr;
    
    let anomalies = 0;
    
    for (const stock of stocks || []) {
      const { data: movements, error: movErr } = await this.supabase
        .from('inventory_movements')
        .select('quantity_delta')
        .eq('store_id', stock.store_id)
        .eq('product_id', stock.item_id);
        
      if (movErr) throw movErr;
      
      const ledgerSum = movements?.reduce((acc, row) => acc + (row.quantity_delta || 0), 0) || 0;
      
      if (ledgerSum !== stock.qty) {
        console.error(`❌ Ledger Mismatch! Store: ${stock.store_id}, Item: ${stock.item_id}. Ledger sum: ${ledgerSum}, Current qty: ${stock.qty}`);
        anomalies++;
      }
    }
    
    if (anomalies === 0) {
      console.log('✅ All stock levels perfectly match their ledger sums.');
    } else {
      throw new Error(`Found ${anomalies} anomalies where ledger sum does not match current stock.`);
    }
  }

  /**
   * Verify previous_quantity + quantity_delta == new_quantity across all rows
   */
  async verifyAppendOnlyMath() {
    console.log('Verifying sequential math inside inventory_movements...');
    
    const { data: movements, error } = await this.supabase
      .from('inventory_movements')
      .select('id, previous_quantity, quantity_delta, new_quantity');
      
    if (error) throw error;
    
    let anomalies = 0;
    
    for (const mov of movements || []) {
      if (Number(mov.previous_quantity) + Number(mov.quantity_delta) !== Number(mov.new_quantity)) {
        console.error(`❌ Math Anomaly! Row ${mov.id}: ${mov.previous_quantity} + ${mov.quantity_delta} != ${mov.new_quantity}`);
        anomalies++;
      }
    }
    
    if (anomalies === 0) {
      console.log('✅ All ledger rows contain perfectly valid delta math.');
    } else {
      throw new Error(`Found ${anomalies} anomalies where delta math was incorrect.`);
    }
  }

  async runAll() {
    await this.verifyLedgerSums();
    await this.verifyAppendOnlyMath();
  }
}

module.exports = { InvariantVerifier };
