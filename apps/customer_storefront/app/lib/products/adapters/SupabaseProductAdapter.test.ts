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
  stockQty?: number;
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
      // If querying stock_levels
      return Promise.resolve({
        data: overrides?.stockQty !== undefined ? { qty: overrides.stockQty } : { qty: 5 },
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
            data: overrides?.stockQty !== undefined ? { qty: overrides.stockQty } : { qty: 2 },
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
      if (rpcName === 'search_items_pos') {
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

    it('returns null when product is not found or inactive', async () => {
      const supabase = createMockSupabase({ itemsRow: null });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getById(createProductId('00000000-0000-0000-0000-000000000000'));
      expect(product).toBeNull();
    });
  });

  describe('getByIdPrefix', () => {
    it('resolves 8-char slug prefix via RPC and delegates to getById to include description', async () => {
      const fullUuid = 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4';
      const rpcMatch = {
        id: fullUuid,
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        category: 'Tea & Coffee',
        category_id: 'cat-1',
        qty_on_hand: 2,
      };
      const dbRow = {
        id: fullUuid,
        name: 'Nescafe Classic 90g Jar',
        price: 475,
        category_id: 'cat-1',
        description: 'Start your morning with the rich taste and irresistible aroma of Nescafe Classic.',
        brand: 'Nestle',
      };

      const supabase = createMockSupabase({
        rpcRows: [rpcMatch],
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
    });

    it('rejects prefixes shorter than 4 characters to prevent broad wildcards', async () => {
      const supabase = createMockSupabase();
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('ae');
      expect(product).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('returns null when prefix matches no active items in search_items_pos', async () => {
      const supabase = createMockSupabase({ rpcRows: [] });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('deadbeef');
      expect(product).toBeNull();
    });

    it('fails closed and returns null when prefix matches multiple items (ambiguous collision)', async () => {
      const match1 = {
        id: 'ae09a3ef-1111-4f14-8a9c-a66c63e028b4',
        name: 'Nescafe Product 1',
      };
      const match2 = {
        id: 'ae09a3ef-2222-4f14-8a9c-a66c63e028b4',
        name: 'Nescafe Product 2',
      };

      const supabase = createMockSupabase({ rpcRows: [match1, match2] });
      const adapter = new SupabaseProductAdapter(supabase, fakeBrandParser, fakeEmojiResolver);

      const product = await adapter.getByIdPrefix('ae09a3ef');
      expect(product).toBeNull();
    });
  });
});
