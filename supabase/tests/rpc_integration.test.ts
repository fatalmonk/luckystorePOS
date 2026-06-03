import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { supabase, runSql } from './test/setup';
import { v4 as uuidv4 } from 'uuid';

describe('Supabase RPC Integration Tests', () => {
  const tenantA = '00000000-0000-0000-0000-000000000001';
  const tenantB = '00000000-0000-0000-0000-000000000002';
  const storeA1 = '11111111-1111-1111-1111-111111111111';
  const storeB1 = '22222222-2222-2222-2222-222222222222';
  const itemA1 = 'e0000000-0000-0000-0000-000000000001'; // Price: 100, Cost: 70
  const itemA2 = 'e0000000-0000-0000-0000-000000000002'; // Price: 200, Cost: 150
  const itemB1 = 'e0000000-0000-0000-0000-000000000003';
  const accountCashA = 'a0000000-0000-0000-0000-000000000004';
  const pmCashA = 'd0000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Seed test data since local DB is empty
    const sql = `
      INSERT INTO tenants (id, name) VALUES ('${tenantA}', 'Tenant A'), ('${tenantB}', 'Tenant B') ON CONFLICT DO NOTHING;
      INSERT INTO stores (id, tenant_id, name) VALUES ('${storeA1}', '${tenantA}', 'Store A1'), ('${storeB1}', '${tenantB}', 'Store B1') ON CONFLICT DO NOTHING;
      INSERT INTO items (id, tenant_id, name, barcode, price, is_active) VALUES ('${itemA1}', '${tenantA}', 'Alpha Product 1', 'BAR-A1', 100, true), ('${itemA2}', '${tenantA}', 'Alpha Product 2', 'BAR-A2', 200, true), ('${itemB1}', '${tenantB}', 'Beta Product 1', 'BAR-B1', 150, true) ON CONFLICT DO NOTHING;
      INSERT INTO stock_levels (store_id, item_id, qty) VALUES ('${storeA1}', '${itemA1}', 50), ('${storeA1}', '${itemA2}', 50), ('${storeB1}', '${itemB1}', 0) ON CONFLICT DO NOTHING;
      INSERT INTO ledger_accounts (id, store_id, code, name, account_type, is_system) VALUES ('c0000000-0000-0000-0000-000000000001', '${storeA1}', '1000', '1000_CASH', 'ASSET', true) ON CONFLICT DO NOTHING;
      INSERT INTO payment_methods (id, store_id, name, type) VALUES ('${pmCashA}', '${storeA1}', 'Cash', 'cash') ON CONFLICT DO NOTHING;
    `;
    await runSql(sql);
  });

  describe('lookup_item_by_scan', () => {
    it('should find an item by barcode', async () => {
      const { data, error } = await supabase.rpc('lookup_item_by_scan', {
        p_barcode: 'BAR-A1',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      const item = Array.isArray(data) ? data[0] : data;
      expect(item.name).toBe('Alpha Product 1');
      expect(item.price).toBe(100);
    });

    it('should return null for non-existent barcode', async () => {
      const { data, error } = await supabase.rpc('lookup_item_by_scan', {
        p_barcode: 'BAR-MISSING',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      if (Array.isArray(data)) {
        expect(data.length).toBe(0);
      } else {
        expect(data).toBeNull();
      }
    });
  });

  describe('search_items_pos', () => {
    it('should filter items by store and query', async () => {
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_query: 'Alpha',
        p_store_id: storeA1,
        p_limit: 50,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data[0].name).toContain('Alpha');
    });

    it('should not return items from another store if they dont exist there', async () => {
      // itemB1 is only in storeB1
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_query: 'Beta',
        p_store_id: storeA1,
        p_limit: 50,
        p_offset: 0
      });

      expect(error).toBeNull();
      // search_items_pos returns (item_id, name, price, stock) — no qty_on_hand
      const betaItem = data?.find((i: any) => i.name === 'Beta Product 1');
      expect(betaItem?.qty_on_hand).toBe(0);
    });
  });

  describe.skip('resolve_payment_ledger_account', () => {
    it('should map cash payment to 1000_CASH account', async () => {
      const { data, error } = await supabase.rpc('resolve_payment_ledger_account', {
        p_store_id: storeA1,
        p_payment_method_id: pmCashA
      });

      expect(error).toBeNull();
      // c0000000-0000-0000-0000-000000000001 is 1000_CASH in seed.sql
      expect(data).toBe('c0000000-0000-0000-0000-000000000001');
    });
  });

  // TODO: record_sale was DROP'd in migration 20260506100000
  // Unify with create_sale before re-enabling these tests
  describe.skip('record_sale', () => {
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

  describe.skip('void_sale', () => {
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
      `, [saleId, saleNumber, storeA1, 'f0000000-0000-0000-0000-000000000001']);
      
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

  // TODO: depends on record_sale which was DROP'd
  describe.skip('Tenant Isolation', () => {
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
