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
exports.InvariantVerifier = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
// Load env vars
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../../.env.local') });
class InvariantVerifier {
    constructor() {
        const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        if (!key)
            throw new Error('Missing Supabase Key for verifier');
        this.supabase = (0, supabase_js_1.createClient)(url, key, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
    }
    /**
     * Verify SUM(quantity_delta) == current_qty for every product/store
     */
    async verifyLedgerSums() {
        console.log('Verifying ledger sums across all stock levels...');
        // Get all stock levels
        const { data: stocks, error: stockErr } = await this.supabase
            .from('stock_levels')
            .select('store_id, item_id, qty');
        if (stockErr)
            throw stockErr;
        let anomalies = 0;
        for (const stock of stocks || []) {
            const { data: movements, error: movErr } = await this.supabase
                .from('inventory_movements')
                .select('quantity_delta')
                .eq('store_id', stock.store_id)
                .eq('product_id', stock.item_id);
            if (movErr)
                throw movErr;
            const ledgerSum = movements?.reduce((acc, row) => acc + (row.quantity_delta || 0), 0) || 0;
            if (ledgerSum !== stock.qty) {
                console.error(`❌ Ledger Mismatch! Store: ${stock.store_id}, Item: ${stock.item_id}. Ledger sum: ${ledgerSum}, Current qty: ${stock.qty}`);
                anomalies++;
            }
        }
        if (anomalies === 0) {
            console.log('✅ All stock levels perfectly match their ledger sums.');
        }
        else {
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
        if (error)
            throw error;
        let anomalies = 0;
        for (const mov of movements || []) {
            if (mov.previous_quantity + mov.quantity_delta !== mov.new_quantity) {
                console.error(`❌ Math Anomaly! Row ${mov.id}: ${mov.previous_quantity} + ${mov.quantity_delta} != ${mov.new_quantity}`);
                anomalies++;
            }
        }
        if (anomalies === 0) {
            console.log('✅ All ledger rows contain perfectly valid delta math.');
        }
        else {
            throw new Error(`Found ${anomalies} anomalies where delta math was incorrect.`);
        }
    }
    async runAll() {
        await this.verifyLedgerSums();
        await this.verifyAppendOnlyMath();
    }
}
exports.InvariantVerifier = InvariantVerifier;
