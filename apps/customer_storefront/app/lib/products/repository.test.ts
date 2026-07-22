import { describe, it, expect, vi } from 'vitest';
import { ProductRepository } from './repository';
import type { ProductDataPort, BrandParser, EmojiResolver, PaginatedProducts } from './types';
import { createProductId } from './types';

function createFakeAdapter(overrides?: Partial<ProductDataPort>): ProductDataPort {
  return {
    search: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    getById: vi.fn().mockResolvedValue(null),
    getCategories: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const fakeBrandParser: BrandParser = { parse: () => undefined };
const fakeEmojiResolver: EmojiResolver = { resolve: () => '📦' };

describe('ProductRepository', () => {
  describe('search', () => {
    it('enforces max page size of 100', async () => {
      const adapter = createFakeAdapter();
      const repo = new ProductRepository(adapter, fakeBrandParser, fakeEmojiResolver);

      await repo.search({ limit: 500 });

      expect(adapter.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it('defaults to limit 60 when not specified', async () => {
      const adapter = createFakeAdapter();
      const repo = new ProductRepository(adapter, fakeBrandParser, fakeEmojiResolver);

      await repo.search({});

      expect(adapter.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 60 })
      );
    });

    it('preserves limit when within bounds', async () => {
      const adapter = createFakeAdapter();
      const repo = new ProductRepository(adapter, fakeBrandParser, fakeEmojiResolver);

      await repo.search({ limit: 25 });

      expect(adapter.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 })
      );
    });

    it('passes through criteria to adapter', async () => {
      const result: PaginatedProducts = {
        products: [
          {
            id: createProductId('1'),
            name: 'Test',
            emoji: '📦',
            price: 10,
            unit: 'pc',
            category: 'test',
            stock: 5,
            description: '',
          },
        ],
        hasMore: true,
      };
      const adapter = createFakeAdapter({
        search: vi.fn().mockResolvedValue(result),
      });
      const repo = new ProductRepository(adapter, fakeBrandParser, fakeEmojiResolver);

      const r = await repo.search({ query: 'milk', categoryId: 'cat-1', page: 2 });

      expect(r).toEqual(result);
      expect(adapter.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'milk', categoryId: 'cat-1', page: 2 })
      );
    });
  });

  describe('getById', () => {
    it('delegates to adapter', async () => {
      const adapter = createFakeAdapter();
      const repo = new ProductRepository(adapter, fakeBrandParser, fakeEmojiResolver);

      const id = createProductId('xyz');
      await repo.getById(id);

      expect(adapter.getById).toHaveBeenCalledWith(id);
    });
  });

  describe('getCategories', () => {
    it('delegates to adapter', async () => {
      const adapter = createFakeAdapter();
      const repo = new ProductRepository(adapter, fakeBrandParser, fakeEmojiResolver);

      await repo.getCategories();

      expect(adapter.getCategories).toHaveBeenCalledTimes(1);
    });
  });
});
