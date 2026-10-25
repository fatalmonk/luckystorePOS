import { describe, it, expect, vi } from 'vitest';
import { searchStorefrontProducts } from './searchProducts';

describe('searchStorefrontProducts', () => {
  it('requests pages beyond the RPC row cap with a direct offset', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      item_id: `item-${index}`, name: `Product ${index}`, price: 10, qty_on_hand: 2,
    }));
    const rpc = vi.fn((_name: string, params: { p_offset: number; p_limit: number }) =>
      Promise.resolve({ data: rows.slice(params.p_offset, params.p_offset + params.p_limit), error: null }));
    const { products, hasMore } = await searchStorefrontProducts({
      limit: 100, page: 10, supabaseClient: {
        rpc,
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
        })),
      } as any,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('search_storefront_catalog_v2', expect.objectContaining({
      p_offset: 1000,
      p_limit: 101,
    }));
    expect(products.map(p => p.id)).toEqual(['item-1000']);
    expect(hasMore).toBe(false);
  });

  it('uses sellable stock instead of physical on-hand quantity', async () => {
    const { products } = await searchStorefrontProducts({
      limit: 10,
      supabaseClient: {
        rpc: vi.fn(() => Promise.resolve({
          data: [{ id: 'reserved-item', name: 'Reserved item', price: 10, qty_on_hand: 8, sellable_qty: 0 }],
          error: null,
        })),
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
        })),
      } as any,
    });

    expect(products).toHaveLength(1);
    expect(products[0].stock).toBe(0);
  });

  it('matches published Bengali translations prior to pagination and merges items with correct mrp and stock mapping', async () => {
    const mockTranslations = [
      {
        item_id: 'item-bn-1',
        name: 'তাজা খাঁটি দুধ ১ লিটার',
        description: 'ফার্ম ফ্রেশ তরল দুধ',
        search_terms: ['dudh', 'milk', 'taza dudh'],
      },
    ];

    const mockPosRpcResults = [
      {
        item_id: 'item-en-1',
        name: 'Fresh Cow Milk 1L',
        price: 90,
        mrp: 100,
        qty_on_hand: 12,
        sellable_qty: 12,
        unit: 'pc',
        category: 'dairy-and-eggs',
        brand: 'Lucky Dairy',
        image_url: 'https://images.luckystore1947.com/milk.webp',
      },
    ];

    const mockAllCatalogItems = [
      {
        item_id: 'item-en-1',
        name: 'Fresh Cow Milk 1L',
        price: 90,
        mrp: 100,
        qty_on_hand: 12,
        sellable_qty: 12,
        unit: 'pc',
        category: 'dairy-and-eggs',
        brand: 'Lucky Dairy',
        image_url: 'https://images.luckystore1947.com/milk.webp',
      },
      {
        item_id: 'item-bn-1',
        name: 'Farm Fresh Liquid Milk 1L',
        price: 95,
        mrp: 95,
        qty_on_hand: 7,
        sellable_qty: 7,
        unit: 'pc',
        category: 'dairy-and-eggs',
        brand: 'Farm Fresh',
        image_url: 'https://images.luckystore1947.com/farm-milk.webp',
      },
    ];

    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'item_translations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ data: mockTranslations, error: null }),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockTranslations, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn((rpcName: string, params: any) => {
        if (rpcName === 'search_storefront_catalog_v2') {
          expect(params.p_item_ids).toEqual(['item-bn-1']);
          // Bengali translation matches are passed as item IDs to the bounded catalog RPC.
          return Promise.resolve({
            data: mockAllCatalogItems.filter((item) => params.p_item_ids.includes(item.item_id)),
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
    };

    const { products, hasMore } = await searchStorefrontProducts({
      query: 'দুধ',
      limit: 10,
      offset: 0,
      supabaseClient: mockSupabase,
    });

    expect(products.length).toBe(1);
    const item = products[0];
    expect(item.id).toBe('item-bn-1');
    expect(item.name).toBe('Farm Fresh Liquid Milk 1L');
    expect(item.bengaliName).toBe('তাজা খাঁটি দুধ ১ লিটার');
    expect(item.bengaliDescription).toBe('ফার্ম ফ্রেশ তরল দুধ');
    expect(item.searchTerms).toEqual(['dudh', 'milk', 'taza dudh']);
    expect(item.stock).toBe(7);
    expect(item.price).toBe(95);
    expect(item.originalPrice).toBeUndefined(); // mrp <= price
    expect(hasMore).toBe(false);
  });

  it('correctly maps mrp to originalPrice and badge when mrp > price', async () => {
    const mockPosRpcResults = [
      {
        item_id: 'item-sale-1',
        name: 'Special Tea Blend',
        price: 250,
        mrp: 300,
        qty_on_hand: 5,
        sellable_qty: 5,
        unit: 'pc',
        category: 'tea-and-coffee',
      },
    ];

    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })),
      rpc: vi.fn(() => Promise.resolve({ data: mockPosRpcResults, error: null })),
    };

    const { products } = await searchStorefrontProducts({
      query: 'tea',
      limit: 10,
      offset: 0,
      supabaseClient: mockSupabase,
    });

    expect(products.length).toBe(1);
    expect(products[0].price).toBe(250);
    expect(products[0].originalPrice).toBe(300);
    expect(products[0].badge).toBe('On Sale');
    expect(products[0].stock).toBe(5);
  });

  it('propagates RPC search failures so callers can distinguish an outage from zero matches', async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database connection failed' } })),
    };

    await expect(
      searchStorefrontProducts({
        query: 'milk',
        supabaseClient: mockSupabase,
      })
    ).rejects.toThrow('Search service temporarily unavailable');
  });

  it('sanitizes PostgREST control characters to prevent filter injection', async () => {
    let capturedOrFilter = '';
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'item_translations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            or: vi.fn().mockImplementation((filterStr: string) => {
              capturedOrFilter = filterStr;
              return Promise.resolve({ data: [], error: null });
            }),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };

    await searchStorefrontProducts({
      query: 'milk,*(bad_injection):"test"',
      supabaseClient: mockSupabase,
    });

    expect(capturedOrFilter).toBe('name.ilike.%milk bad_injection test%,description.ilike.%milk bad_injection test%,search_terms.cs.{milk bad_injection test}');
  });

  it('filters supplemental translated items to requested category IDs', async () => {
    const mockTranslations = [
      {
        item_id: 'item-dairy-1',
        name: 'খাঁটি দুধ',
        description: 'দুধ',
        search_terms: ['dudh'],
      },
      {
        item_id: 'item-bakery-1',
        name: 'দুধের পাউরুটি',
        description: 'রুটি',
        search_terms: ['dudh ruti'],
      },
    ];

    const mockCatalogItems = [
      {
        item_id: 'item-dairy-1',
        name: 'Pure Milk',
        price: 90,
        category: 'dairy-and-eggs',
        category_id: 'cat-dairy',
      },
      {
        item_id: 'item-bakery-1',
        name: 'Milk Bread',
        price: 50,
        category: 'bakery-and-snacks',
        category_id: 'cat-bakery',
      },
    ];

    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'item_translations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            or: vi.fn().mockResolvedValue({ data: mockTranslations, error: null }),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockTranslations, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn((rpcName: string, params: any) => {
        if (rpcName === 'search_storefront_catalog_v2') {
          const translatedIds = params.p_item_ids ?? [];
          return Promise.resolve({
            data: mockCatalogItems.filter((item) =>
              translatedIds.includes(item.item_id) &&
              (!params.p_category_id || item.category_id === params.p_category_id || item.category === params.p_category_id)
            ),
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
    };

    const { products } = await searchStorefrontProducts({
      query: 'দুধ',
      categoryId: 'cat-dairy',
      supabaseClient: mockSupabase,
    });

    expect(products.length).toBe(1);
    expect(products[0].id).toBe('item-dairy-1');
  });

  it('returns base search results gracefully when translation lookup fails', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: null, error: new Error('PostgREST translation lookup failed') }),
      })),
      rpc: vi.fn(() => Promise.resolve({
        data: [{
          item_id: 'item-1',
          name: 'Classic Tea',
          price: 50,
          qty_on_hand: 5,
          sellable_qty: 5,
        }],
        error: null,
      })),
    };

    const { products } = await searchStorefrontProducts({
      query: 'tea',
      supabaseClient: mockSupabase as any,
    });

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe('item-1');
    expect(products[0].bengaliName).toBeUndefined();
  });
});
