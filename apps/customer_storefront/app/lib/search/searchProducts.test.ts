import { describe, it, expect, vi } from 'vitest';
import { searchStorefrontProducts } from './searchProducts';

describe('searchStorefrontProducts', () => {
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
        if (rpcName === 'search_items_pos') {
          if (params.p_query === 'দুধ') {
            // English POS search returns nothing for Bengali script
            return Promise.resolve({ data: [], error: null });
          }
          // Full catalog query to resolve missing translated item IDs
          return Promise.resolve({ data: mockAllCatalogItems, error: null });
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
        unit: 'pc',
        category: 'tea-and-coffee',
      },
    ];

    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
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
});
