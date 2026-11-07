import { describe, it, expect, vi } from 'vitest';
import { SupabaseProductAdapter } from './SupabaseProductAdapter';
import { createProductId } from '../types';
import type { BrandParser, EmojiResolver } from '../types';

const fakeBrandParser: BrandParser = {
  parse: (name: string) => {
    if (name.toLowerCase().includes('nestle') || name.toLowerCase().includes('nescafe')) return 'Nestle';
    return undefined;
  },
};

const fakeEmojiResolver: EmojiResolver = {
  resolve: () => '☕',
};

function createMockSupabase(overrides?: {
  itemsRow?: any;
  itemsError?: any;
  rpcRows?: any[];
  rpcError?: any;
  /** Rows returned by resolve_storefront_item_prefix_v1 */
  resolverRows?: Array<{ item_id: string }>;
  /** Error returned by resolve_storefront_item_prefix_v1 */
  resolverError?: { message: string } | null;
  stockQty?: number;
  stockReserved?: number;
  onlineReserved?: number;
  stockRow?: any;
  v2Rows?: any[];
  v2Error?: { message: string } | null;
  categories?: any[];
}) {
  const categories = overrides?.categories ?? [
    { id: 'cat-1', name: 'Tea & Coffee', slug: 'tea-and-coffee', emoji: '☕', parent_id: null, display_order: 1, active: true },
  ];

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => Promise.resolve({ data: categories, error: null })),
    maybeSingle: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve({
        data: {
          qty: overrides?.stockQty ?? 5,
          reserved: overrides?.stockReserved ?? 0,
          qty_reserved_online: overrides?.onlineReserved ?? 0,
        },
        error: null,
      });
    }),
  };

  const client: any = {
    from: vi.fn((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: categories, error: null }),
        };
      }
      if (table === 'stock_levels') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: overrides?.stockRow !== undefined ? overrides.stockRow : {
              qty: overrides?.stockQty ?? 2,
              reserved: overrides?.stockReserved ?? 0,
              qty_reserved_online: overrides?.onlineReserved ?? 0,
            },
            error: null,
          }),
        };
      }
      if (table === 'items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: overrides?.itemsRow !== undefined ? overrides.itemsRow : null,
            error: overrides?.itemsError !== undefined ? overrides.itemsError : null,
          }),
        };
      }
      return mockQueryBuilder;
    }),
    rpc: vi.fn((rpcName: string) => {
      if (rpcName === 'search_storefront_catalog_v2') {
        return Promise.resolve({ data: overrides?.v2Rows ?? [], error: overrides?.v2Error ?? null });
      }
      if (rpcName === 'resolve_storefront_item_prefix_v1') {
        return Promise.resolve({
          data: overrides?.resolverRows ?? [],
          error: overrides?.resolverError ?? null,
        });
      }
      // Legacy RPCs — should not be called by the new getByIdPrefix.
      if (rpcName === 'search_storefront_catalog' || rpcName === 'search_items_pos') {
        return Promise.resolve({
          data: overrides?.rpcRows ?? [],
          error: overrides?.rpcError ?? null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };

  return client;
}

describe('SupabaseProductAdapter', () => {
  it('passes an exact offset through to storefront catalogue search', async () => {
    const supabase = createMockSupabase();
    const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

    await adapter.search({ limit: 100, page: 2, offset: 250 });

    expect(supabase.rpc).toHaveBeenCalledWith('search_storefront_catalog_v2', expect.objectContaining({
      p_limit: 101,
      p_offset: 250,
    }));
  });

  describe('getById', () => {
    it('retrieves full product projection including database description', async () => {
      const mockItem = {
        id: 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4',
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        mrp: 546.25,
        category_id: 'cat-1',
        description: 'Start your morning with the rich taste and irresistible aroma of Nescafe Classic.',
        image_url: 'https://images.luckystore1947.com/products/TC-NCF-GEN-90G.webp',
        created_at: '2026-05-06T09:51:43.974Z',
        brand: 'Nestle',
      };

      const supabase = createMockSupabase({ itemsRow: mockItem, stockQty: 7 });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4'));

      expect(product).not.toBeNull();
      expect(product?.id).toBe('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      expect(product?.name).toBe('Nescafe Classic 90g Jar');
      expect(product?.description).toBe('Start your morning with the rich taste and irresistible aroma of Nescafe Classic.');
      expect(product?.category).toBe('Tea & Coffee');
      expect(product?.stock).toBe(7);
      expect(product?.brand).toBe('Nestle');
    });

    it('returns empty string description when database column is null', async () => {
      const mockItem = {
        id: '169e4ac0-80cf-4dc7-8266-f8cad832eb9b',
        name: 'Savoy Ekdom Aam',
        price: 48,
        category_id: 'cat-1',
        description: null,
      };

      const supabase = createMockSupabase({ itemsRow: mockItem });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId('169e4ac0-80cf-4dc7-8266-f8cad832eb9b'));

      expect(product).not.toBeNull();
      expect(product?.description).toBe('');
    });

    it('subtracts POS and online reservations from direct stock reads', async () => {
      const supabase = createMockSupabase({
        itemsRow: {
          id: '169e4ac0-80cf-4dc7-8266-f8cad832eb9b',
          name: 'Savoy Ekdom Aam',
          price: 48,
          category_id: 'cat-1',
          description: null,
        },
        stockQty: 7,
        stockReserved: 4,
        onlineReserved: 3,
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId('169e4ac0-80cf-4dc7-8266-f8cad832eb9b'));

      expect(product?.stock).toBe(0);
    });

    it('uses an exact item selector when the direct stock read has no row', async () => {
      const itemId = '169e4ac0-80cf-4dc7-8266-f8cad832eb9b';
      const supabase = createMockSupabase({
        itemsRow: {
          id: itemId,
          name: 'Savoy Ekdom Aam',
          price: 48,
          category_id: 'cat-1',
          description: null,
        },
        stockRow: null,
        v2Rows: [{ id: itemId, name: 'Savoy Ekdom Aam', price: 48, mrp: 48, sellable_qty: 4 }],
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId(itemId));

      expect(product?.stock).toBe(4);
      expect(supabase.rpc).toHaveBeenCalledWith('search_storefront_catalog_v2', {
        p_store_id: expect.any(String),
        p_query: '',
        p_category_id: null,
        p_item_ids: [itemId],
        p_limit: 1,
        p_offset: 0,
      });
    });

    it('keeps the product available with zero stock when the stock projection RPC fails', async () => {
      const itemId = '169e4ac0-80cf-4dc7-8266-f8cad832eb9b';
      const supabase = createMockSupabase({
        itemsRow: {
          id: itemId,
          name: 'Savoy Ekdom Aam',
          price: 48,
          category_id: 'cat-1',
          description: null,
        },
        stockRow: null,
        v2Error: { message: 'temporary RPC failure' },
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId(itemId));

      expect(product?.id).toBe(itemId);
      expect(product?.stock).toBe(0);
    });

    it('returns null when product is not found or inactive', async () => {
      const supabase = createMockSupabase({ itemsRow: null });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId('00000000-0000-0000-0000-000000000000'));
      expect(product).toBeNull();
    });
  });

  // ─── getByIdPrefix — bounded resolver implementation ──────────────────────

  describe('getByIdPrefix', () => {
    // ── Input validation: no upstream request for invalid input ───────────
    it('rejects prefix shorter than 4 characters without any RPC call', async () => {
      const supabase = createMockSupabase();
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('ae')).toBeNull();
      expect(await adapter.getByIdPrefix('aef')).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('rejects empty prefix without any RPC call', async () => {
      const supabase = createMockSupabase();
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('')).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('rejects prefix longer than 32 hex characters without any RPC call', async () => {
      const supabase = createMockSupabase();
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      // 33 hex chars
      expect(await adapter.getByIdPrefix('ae09a3ef5f2c4f148a9ca66c63e028b4f')).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('rejects malformed input containing non-hex characters without any RPC call', async () => {
      const supabase = createMockSupabase();
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('ae--')).toBeNull();
      expect(await adapter.getByIdPrefix('zzzz')).toBeNull();
      expect(await adapter.getByIdPrefix('ae09-zz-a3ef')).toBeNull();
      expect(await adapter.getByIdPrefix('ab!cd')).toBeNull();
      expect(await adapter.getByIdPrefix('ae09\na3ef')).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('rejects arbitrary embedded hyphens (not canonical UUID)', async () => {
      const supabase = createMockSupabase();
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('ae09-a3ef')).toBeNull();
      expect(await adapter.getByIdPrefix('ae-09-a3-ef')).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('accepts full canonical 8-4-4-4-12 UUID input', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const dbRow = {
        id: fullUuid,
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        category_id: 'cat-1',
        description: 'Rich taste.',
        brand: 'Nestle',
      };
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: dbRow,
        stockQty: 3,
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');

      expect(product).not.toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_storefront_item_prefix_v1', {
        p_store_id: expect.any(String),
        p_prefix: 'ae09a3ef5f2c4f148a9ca66c63e028b4',
      });
    });

    it('accepts uppercase prefix (normalized to lowercase before RPC)', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const dbRow = {
        id: fullUuid,
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        category_id: 'cat-1',
        description: 'Rich taste.',
        brand: 'Nestle',
      };
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: dbRow,
        stockQty: 3,
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('AE09A3EF');

      expect(product).not.toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_storefront_item_prefix_v1', {
        p_store_id: expect.any(String),
        p_prefix: 'ae09a3ef',
      });
    });

    it('accepts prefix with surrounding whitespace (trimmed before RPC)', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const dbRow = {
        id: fullUuid,
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        category_id: 'cat-1',
        description: '',
        brand: 'Nestle',
      };
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: dbRow,
        stockQty: 1,
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('  ae09a3ef  ');

      expect(product).not.toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_storefront_item_prefix_v1', {
        p_store_id: expect.any(String),
        p_prefix: 'ae09a3ef',
      });
    });

    it('accepts a full 32-hex (unhyphenated UUID) prefix', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const full32 = 'ae09a3ef5f2c4f148a9ca66c63e028b4';
      const dbRow = {
        id: fullUuid,
        name: 'Product',
        price: 100,
        category_id: 'cat-1',
        description: '',
      };
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: dbRow,
        stockQty: 1,
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix(full32);

      expect(product).not.toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_storefront_item_prefix_v1', {
        p_store_id: expect.any(String),
        p_prefix: full32,
      });
    });

    // ── Identity and ambiguity ────────────────────────────────────────────

    it('returns null when prefix matches zero items', async () => {
      const supabase = createMockSupabase({ resolverRows: [] });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('deadbeef')).toBeNull();
    });

    it('resolves a unique 8-char prefix and delegates to getById for full projection', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const dbRow = {
        id: fullUuid,
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        mrp: 546.25,
        category_id: 'cat-1',
        description: 'Start your morning with the rich taste and irresistible aroma of Nescafe Classic.',
        brand: 'Nestle',
      };

      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: dbRow,
        stockQty: 2,
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('ae09a3ef');

      expect(product).not.toBeNull();
      expect(product?.id).toBe(fullUuid);
      expect(product?.description).toBe('Start your morning with the rich taste and irresistible aroma of Nescafe Classic.');
      expect(product?.stock).toBe(2);
      expect(product?.category).toBe('Tea & Coffee');
      // Resolver called once; getById (via items table) also called
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_storefront_item_prefix_v1', {
        p_store_id: expect.any(String),
        p_prefix: 'ae09a3ef',
      });
      // No search_storefront_catalog calls allowed
      expect(supabase.rpc).not.toHaveBeenCalledWith('search_storefront_catalog', expect.anything());
    });

    it('returns null when prefix matches two items (ambiguous)', async () => {
      const supabase = createMockSupabase({
        resolverRows: [
          { item_id: 'ae09a3ef-1111-4f14-8a9c-a66c63e028b4' },
          { item_id: 'ae09a3ef-2222-4f14-8a9c-a66c63e028b4' },
        ],
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('ae09a3ef')).toBeNull();
      // getById must NOT be called for ambiguous results
      expect(supabase.from).not.toHaveBeenCalledWith('items');
    });

    it('returns null for ambiguous collision that would have been beyond row 500 in the old scan', async () => {
      // Simulates a prefix that only resolves to 2 candidates — previously only
      // detectable after scanning multiple 500-row pages.
      const supabase = createMockSupabase({
        resolverRows: [
          { item_id: '0000ffff-aaaa-4000-8000-000000000001' },
          { item_id: '0000ffff-aaaa-4000-8000-000000000002' },
        ],
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('0000ffff')).toBeNull();
    });

    it('handles UUID lower boundary prefix "0000"', async () => {
      const uuid = '00000000-0000-4000-8000-000000000001';
      const dbRow = { id: uuid, name: 'Zero Product', price: 10, category_id: 'cat-1', description: '' };
      const supabase = createMockSupabase({ resolverRows: [{ item_id: uuid }], itemsRow: dbRow });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('0000')).not.toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('resolve_storefront_item_prefix_v1', {
        p_store_id: expect.any(String),
        p_prefix: '0000',
      });
    });

    it('handles UUID upper boundary prefix "ffff"', async () => {
      const uuid = 'ffff0000-0000-4000-8000-000000000001';
      const dbRow = { id: uuid, name: 'FF Product', price: 10, category_id: 'cat-1', description: '' };
      const supabase = createMockSupabase({ resolverRows: [{ item_id: uuid }], itemsRow: dbRow });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('ffff')).not.toBeNull();
    });

    it('throws when the resolver RPC returns an error (no silent fallback)', async () => {
      const supabase = createMockSupabase({
        resolverError: { message: 'DB connection lost' },
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      await expect(adapter.getByIdPrefix('ae09a3ef')).rejects.toThrow('getByIdPrefix resolver RPC failed');
      // Critically: no search_storefront_catalog fallback
      expect(supabase.rpc).not.toHaveBeenCalledWith('search_storefront_catalog', expect.anything());
    });

    it('returns null when the resolver returns an invalid (non-UUID) item_id', async () => {
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: 'not-a-uuid' }],
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      expect(await adapter.getByIdPrefix('ae09a3ef')).toBeNull();
      // getById must not be called with invalid input
      expect(supabase.from).not.toHaveBeenCalledWith('items');
    });

    it('never calls search_storefront_catalog on a valid prefix', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: { id: fullUuid, name: 'Product', price: 10, category_id: 'cat-1', description: '' },
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      await adapter.getByIdPrefix('ae09a3ef');

      expect(supabase.rpc).not.toHaveBeenCalledWith('search_storefront_catalog', expect.anything());
    });

    it('calls the resolver exactly once per lookup (no pagination loop)', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const supabase = createMockSupabase({
        resolverRows: [{ item_id: fullUuid }],
        itemsRow: { id: fullUuid, name: 'Product', price: 10, category_id: 'cat-1', description: '' },
      });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      await adapter.getByIdPrefix('ae09a3ef');

      const resolverCalls = (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls.filter(
        (args: any[]) => args[0] === 'resolve_storefront_item_prefix_v1',
      );
      expect(resolverCalls).toHaveLength(1);
    });
  });

  describe('getCategories bounded cache', () => {
    function createDeferredCategoriesMock() {
      let resolveCategories: (v: { data: any[]; error: any }) => void = () => {};
      const categories = [
        { id: 'cat-1', name: 'Tea & Coffee', slug: 'tea-and-coffee', emoji: '☕', parent_id: null, display_order: 1, active: true },
      ];
      const orderCalls: number[] = [];
      const client: any = {
        from: vi.fn((table: string) => {
          if (table === 'categories') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn(() => {
                orderCalls.push(Date.now());
                return new Promise((res) => { resolveCategories = res; });
              }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
        }),
        rpc: vi.fn(),
      };
      return {
        client,
        categories,
        orderCallCount: () => orderCalls.length,
        settle: (result?: { data?: any[]; error?: any }) =>
          resolveCategories({ data: result?.data ?? categories, error: result?.error ?? null }),
      };
    }

    it('serves warm reads from cache without a second PostgREST call (cold→warm)', async () => {
      const mock = createDeferredCategoriesMock();
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 60_000,
      });

      const first = adapter.getCategories();
      mock.settle();
      const cold = await first;

      const warm = await adapter.getCategories();
      expect(mock.orderCallCount()).toBe(1);
      expect(warm).toEqual(cold);
    });

    it('coalesces concurrent cold requests into a single RPC', async () => {
      const mock = createDeferredCategoriesMock();
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 60_000,
      });

      const [a, b, c] = [adapter.getCategories(), adapter.getCategories(), adapter.getCategories()];
      mock.settle();
      const results = await Promise.all([a, b, c]);

      expect(mock.orderCallCount()).toBe(1);
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    it('refetches after the TTL expires', async () => {
      const mock = createDeferredCategoriesMock();
      let clock = 1_000_000;
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 500,
        now: () => clock,
      });

      const first = adapter.getCategories();
      mock.settle();
      await first;
      expect(mock.orderCallCount()).toBe(1);

      clock += 501;
      const second = adapter.getCategories();
      mock.settle();
      await second;
      expect(mock.orderCallCount()).toBe(2);
    });

    it('does not cache failures and recovers on the next call', async () => {
      const mock = createDeferredCategoriesMock();
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 60_000,
      });

      const failing = adapter.getCategories();
      mock.settle({ error: { message: 'network down' } });
      await expect(failing).rejects.toThrow('Failed to fetch categories');

      // Recovery: next call retries and succeeds, and the result is cached.
      const retry = adapter.getCategories();
      mock.settle();
      const recovered = await retry;
      expect(mock.orderCallCount()).toBe(2);
      expect(recovered).toHaveLength(1);

      await adapter.getCategories();
      expect(mock.orderCallCount()).toBe(2);
    });

    it('keeps caches isolated between adapter instances (store boundary)', async () => {
      const mock = createDeferredCategoriesMock();
      const adapterA = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, 'store-a', {
        categoriesTtlMs: 60_000,
      });
      const adapterB = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, 'store-b', {
        categoriesTtlMs: 60_000,
      });

      const first = adapterA.getCategories();
      mock.settle();
      await first;

      const second = adapterB.getCategories();
      mock.settle();
      await second;

      expect(mock.orderCallCount()).toBe(2);
    });

    it('invalidateCategoriesCache clears the warm cache and a pending fetch does not recommit stale data', async () => {
      const mock = createDeferredCategoriesMock();
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 60_000,
      });

      // Warm the cache.
      const warm = adapter.getCategories();
      mock.settle();
      await warm;
      expect(mock.orderCallCount()).toBe(1);

      // Start a fetch after expiry-like invalidation, then invalidate mid-flight.
      adapter.invalidateCategoriesCache();
      const pending = adapter.getCategories();
      expect(mock.orderCallCount()).toBe(2); // fresh read started, not joined stale slot
      adapter.invalidateCategoriesCache(); // admin update lands while fetch pending
      mock.settle();
      // Waiting caller still receives the resolved value.
      await expect(pending).resolves.toBeDefined();

      // The stale in-flight result must not have repopulated the cache.
      const afterInvalidate = adapter.getCategories();
      mock.settle();
      await afterInvalidate;
      expect(mock.orderCallCount()).toBe(3);
    });

    it('never serves from cache with categoriesTtlMs 0 (enableCache: false path)', async () => {
      const mock = createDeferredCategoriesMock();
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 0,
      });

      const first = adapter.getCategories();
      mock.settle();
      await first;

      const second = adapter.getCategories();
      mock.settle();
      await second;

      expect(mock.orderCallCount()).toBe(2);
    });

    it('invalidateCategoriesCache on a warm cache forces the next call to refetch', async () => {
      const mock = createDeferredCategoriesMock();
      const adapter = new SupabaseProductAdapter(mock.client, fakeBrandParser, fakeEmojiResolver, undefined, {
        categoriesTtlMs: 60_000,
      });

      const warm = adapter.getCategories();
      mock.settle();
      await warm;
      await adapter.getCategories();
      expect(mock.orderCallCount()).toBe(1); // warm hit

      adapter.invalidateCategoriesCache();
      const refetch = adapter.getCategories();
      mock.settle();
      await refetch;
      expect(mock.orderCallCount()).toBe(2);
    });
  });
});
