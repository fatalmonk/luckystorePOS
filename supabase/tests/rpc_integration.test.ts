import { describe, it, expect, beforeAll } from 'vitest';
import { supabase, runSql } from './test/setup';

describe('Supabase RPC Integration Tests', () => {
  const tenantA = '00000000-0000-0000-0000-000000000001';
  const tenantB = '00000000-0000-0000-0000-000000000002';
  const storeA1 = '11111111-1111-1111-1111-111111111111';
  const storeB1 = '22222222-2222-2222-2222-222222222222';
  const itemA1 = 'e0000000-0000-0000-0000-000000000001'; // Price: 100, Cost: 70
  const itemA2 = 'e0000000-0000-0000-0000-000000000002'; // Price: 200, Cost: 150
  const itemB1 = 'e0000000-0000-0000-0000-000000000003';
  const pmCashA = 'd0000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Seed test data since local DB is empty
    const sql = `
      INSERT INTO tenants (id, name) VALUES ('${tenantA}', 'Tenant A'), ('${tenantB}', 'Tenant B') ON CONFLICT DO NOTHING;
      INSERT INTO stores (id, tenant_id, name) VALUES ('${storeA1}', '${tenantA}', 'Store A1'), ('${storeB1}', '${tenantB}', 'Store B1') ON CONFLICT DO NOTHING;
      INSERT INTO items (id, tenant_id, name, sku, barcode, price, is_active) VALUES ('${itemA1}', '${tenantA}', 'Alpha Product 1', 'SKU-A1', 'BAR-A1', 100, true), ('${itemA2}', '${tenantA}', 'Alpha Product 2', 'SKU-A2', 'BAR-A2', 200, true), ('${itemB1}', '${tenantB}', 'Beta Product 1', 'SKU-B1', 'BAR-B1', 150, true) ON CONFLICT DO NOTHING;
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

    it('should find an item by its legacy SKU', async () => {
      const { data, error } = await supabase.rpc('lookup_item_by_scan', {
        p_barcode: 'SKU-A1',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      const item = Array.isArray(data) ? data[0] : data;
      expect(item.name).toBe('Alpha Product 1');
    });
  });

  describe('search_items_pos', () => {
    it('should filter items by store and query', async () => {
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_query: 'Alpha',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data[0].name).toContain('Alpha');
    });

    it('should return Beta item with 0 stock when queried from storeA1', async () => {
      // itemB1 is only in storeB1, but search_items_pos returns all matching items
      // with stock from the specified store (0 if not stocked there)
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_query: 'Beta',
        p_store_id: storeA1
      });

      expect(error).toBeNull();
      // search_items_pos returns (item_id, name, price, stock)
      const betaItem = data?.find((i: any) => i.name === 'Beta Product 1');
      expect(betaItem).toBeDefined();
      expect(betaItem?.stock).toBe(0);
    });
  });

  describe('resolve_payment_ledger_account', () => {
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



});
