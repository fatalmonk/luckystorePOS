import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { supabase, runSql } from './test/setup';
import { v4 as uuidv4 } from 'uuid';

describe('Supabase RPC Integration Tests', () => {
  const tenantA = '00000000-0000-0000-0000-000000000001';
  const tenantB = '00000000-0000-0000-0000-000000000002';
  const storeA1 = '11111111-1111-1111-1111-111111111111';
  const storeB1 = '22222222-2222-2222-2222-222222222222';
  const itemA1 = 'item0000-0000-0000-0000-000000000001'; // Price: 100, Cost: 70
  const itemA2 = 'item0000-0000-0000-0000-000000000002'; // Price: 200, Cost: 150
  const itemB1 = 'item0000-0000-0000-0000-000000000003';
  const accountCashA = 'a0000000-0000-0000-0000-000000000004';
  const pmCashA = 'pm000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Usually we would run 'supabase db reset' here if we had CLI access from vitest,
    // but the plan says the CI will do it. For local runs, we rely on the seed.
  });

  describe('lookup_item_by_scan', () => {
    it('should find an item by barcode', async () => {
      const { data, error } = await supabase.rpc('lookup_item_by_scan', {
        p_scan_value: 'BAR-A1',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      expect(data.name).toBe('Alpha Product 1');
      expect(data.sku).toBe('SKU-A1');
      expect(data.price).toBe(100);
    });

    it('should return null for non-existent barcode', async () => {
      const { data, error } = await supabase.rpc('lookup_item_by_scan', {
        p_scan_value: 'BAR-MISSING',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('search_items_pos', () => {
    it('should filter items by store and query', async () => {
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_store_id: storeA1,
        p_query: 'Alpha'
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data[0].name).toContain('Alpha');
    });

    it('should not return items from another store if they dont exist there', async () => {
      // itemB1 is only in storeB1
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_store_id: storeA1,
        p_query: 'Beta'
      });

      expect(error).toBeNull();
      // Even if item exists in public.items, it might not be in search if it filters by stock_levels?
      // Actually, search_items_pos does a LEFT JOIN on stock_levels, but it filters by items.active.
      // So it will show up with qty_on_hand: 0.
      const betaItem = data?.find((i: any) => i.name === 'Beta Product 1');
      expect(betaItem?.qty_on_hand).toBe(0);
    });
  });

  describe('resolve_payment_ledger_account', () => {
    it('should map cash payment to 1000_CASH account', async () => {
      const { data, error } = await supabase.rpc('resolve_payment_ledger_account', {
        p_store_id: storeA1,
        p_payment_method_id: pmCashA
      });

      expect(error).toBeNull();
      // la000000-0000-0000-0000-000000000001 is 1000_CASH in seed.sql
      expect(data).toBe('la000000-0000-0000-0000-000000000001');
    });
  });

  describe('record_sale', () => {
    const generateKey = () => `test-sale-${Date.now()}-${uuidv4()}`;

    it('should successfully record a sale and update stock/ledger', async () => {
      const idempotencyKey = generateKey();
      const saleData = {
        p_idempotency_key: idempotencyKey,
        p_tenant_id: tenantA,
        p_store_id: storeA1,
        p_items: [
          { item_id: itemA1, quantity: 2, unit_price: 100.00 }
        ],
        p_payments: [
          { account_id: accountCashA, amount: 200.00, party_id: null }
        ],
        p_notes: 'Test sale'
      };

      const { data, error } = await supabase.rpc('record_sale', saleData);

      expect(error).toBeNull();
      expect(data.status).toBe('success');
      expect(data.total_revenue).toBe(200);

      // Verify stock movement
      const movements = await runSql(
        'SELECT * FROM stock_movements WHERE reference_id = $1',
        [data.batch_id]
      );
      expect(movements).toHaveLength(1);
      expect(parseFloat(movements[0].quantity_change)).toBe(-2);

      // Verify ledger entries
      const entries = await runSql(
        'SELECT * FROM ledger_entries WHERE journal_batch_id = $1',
        [data.batch_id]
      );
      // Revenue (Credit 200), Cash (Debit 200), COGS (Debit 140), Inventory (Credit 140)
      expect(entries).toHaveLength(4);
      
      const revenue = entries.find((e: any) => parseFloat(e.credit_amount) === 200);
      expect(revenue).toBeDefined();
    });

    it('should reject duplicate idempotency keys and return same response', async () => {
      const idempotencyKey = generateKey();
      const saleData = {
        p_idempotency_key: idempotencyKey,
        p_tenant_id: tenantA,
        p_store_id: storeA1,
        p_items: [{ item_id: itemA1, quantity: 1, unit_price: 100.00 }],
        p_payments: [{ account_id: accountCashA, amount: 100.00, party_id: null }]
      };

      const res1 = await supabase.rpc('record_sale', saleData);
      const res2 = await supabase.rpc('record_sale', saleData);

      expect(res1.data.batch_id).toBe(res2.data.batch_id);
      expect(res2.data.status).toBe('success');
    });

    it('should fail if total revenue does not match total payments', async () => {
      const saleData = {
        p_idempotency_key: generateKey(),
        p_tenant_id: tenantA,
        p_store_id: storeA1,
        p_items: [{ item_id: itemA1, quantity: 1, unit_price: 100.00 }],
        p_payments: [{ account_id: accountCashA, amount: 90.00, party_id: null }]
      };

      const { data, error } = await supabase.rpc('record_sale', saleData);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('does not match total payments');
    });
  });

  describe('void_sale', () => {
    it('should void a sale and restore stock', async () => {
      // We need a sale first. Since record_sale and void_sale use different systems 
      // (one uses sales table, other uses journal_batches), this might be tricky.
      // Wait, void_sale (20260423) expects a row in public.sales.
      // record_sale (20260426) inserts into journal_batches, NOT public.sales.
      // This confirms my suspicion that they are currently DISCONNECTED systems.
      
      // I'll insert a legacy sale manually to test void_sale.
      const saleId = uuidv4();
      const saleNumber = `SALE-VOID-${Date.now()}`;
      
      await runSql(`
        INSERT INTO public.sales (id, sale_number, store_id, cashier_id, status, total_amount)
        VALUES ($1, $2, $3, $4, 'completed', 100)
      `, [saleId, saleNumber, storeA1, 'u1111111-1111-1111-1111-111111111111']);
      
      await runSql(`
        INSERT INTO public.sale_items (sale_id, item_id, qty, unit_price, line_total)
        VALUES ($1, $2, 1, 100, 100)
      `, [saleId, itemA1]);

      // Current stock level is 50. Let's record a movement that "sold" it.
      await runSql(`
        UPDATE public.stock_levels SET qty = qty - 1 WHERE store_id = $1 AND item_id = $2
      `, [storeA1, itemA1]);

      const { data, error } = await supabase.rpc('void_sale', {
        p_sale_id: saleId,
        p_reason: 'Testing void'
      });

      expect(error).toBeNull();
      expect(data.status).toBe('voided');

      // Check stock restored
      const stock = await runSql(
        'SELECT qty FROM public.stock_levels WHERE store_id = $1 AND item_id = $2',
        [storeA1, itemA1]
      );
      expect(stock[0].qty).toBe(50); // 50 - 1 + 1 = 50
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow Tenant B to record sale for Tenant A', async () => {
      const saleData = {
        p_idempotency_key: `iso-test-${Date.now()}`,
        p_tenant_id: tenantA, // Recording for Tenant A
        p_store_id: storeA1,
        p_items: [{ item_id: itemA1, quantity: 1, unit_price: 100.00 }],
        p_payments: [{ account_id: accountCashA, amount: 100.00, party_id: null }]
      };

      // We call RPC with service_role, but we can check if it respects p_tenant_id.
      // Actually, record_sale takes p_tenant_id as an argument and uses it to find accounts.
      // If we pass Tenant B but Store A1, it should fail because Store A1 doesn't belong to Tenant B.
      
      const { data, error } = await supabase.rpc('record_sale', {
        ...saleData,
        p_tenant_id: tenantB // Pass Tenant B
      });

      // It should fail because it won't find the accounts for Tenant B with names 'Sales Revenue' etc.
      // Or if it does, the store_id check in migrations might fail.
      expect(error).not.toBeNull();
    });
  });
});
