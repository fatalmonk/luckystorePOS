import { describe, expect, it, vi } from 'vitest';
import type { IProductRepository, ProductSearchCriteria, PaginatedProducts, Product as RepositoryProduct } from './products';
import type { Category } from './products/types';
import type { Product as CatalogProduct } from './types';
import { loadCategoryCatalogProducts, resolveCategoryRouteData } from './categoryRouteData';

function repositoryWithSearch(
  search: (criteria: ProductSearchCriteria) => Promise<PaginatedProducts>,
): IProductRepository {
  return { search } as IProductRepository;
}

const emptyResult: PaginatedProducts = { products: [], hasMore: false };

function catalogProduct(id: string, name: string): CatalogProduct {
  return {
    id,
    name,
    emoji: '🛒',
    price: 1,
    unit: 'pc',
    category: 'groceries',
    stock: 1,
    description: '',
  };
}

describe('resolveCategoryRouteData', () => {
  it('loads group products by child IDs and includes the root category', async () => {
    const root: Category = { id: 'root', slug: 'snacks', name: 'Snacks', emoji: '🍿' };
    const child: Category = {
      id: 'chips',
      slug: 'chips-pretzels',
      name: 'Chips',
      emoji: '🥔',
      parentId: 'root',
    };
    const search = vi.fn().mockResolvedValue(emptyResult);

    const result = await resolveCategoryRouteData({
      slug: 'snacks',
      categories: [root, child],
      currentCategory: root,
      repository: repositoryWithSearch(search),
    });

    expect(search).toHaveBeenCalledWith({ categoryIds: ['root', 'chips'], query: undefined, limit: 500 });
    expect(result.group?.slug).toBe('snacks');
    expect(result.productCount).toBe(0);
  });

  it('retains the legacy name search when an ID-based leaf search is empty', async () => {
    const category: Category = {
      id: 'rice',
      slug: 'rice-and-grain',
      name: 'Rice & Grain',
      emoji: '🌾',
    };
    const search = vi.fn()
      .mockResolvedValueOnce(emptyResult)
      .mockResolvedValueOnce({ products: [], hasMore: true });

    const result = await resolveCategoryRouteData({
      slug: category.slug,
      categories: [category],
      currentCategory: category,
      repository: repositoryWithSearch(search),
    });

    expect(search).toHaveBeenNthCalledWith(1, {
      categoryId: 'rice',
      query: undefined,
      limit: 200,
    });
    expect(search).toHaveBeenNthCalledWith(2, {
      query: 'Rice & Grain',
      limit: 200,
    });
    expect(result.productCount).toBeUndefined();
  });

  it('returns category context alongside a product query error', async () => {
    const category: Category = {
      id: 'rice',
      slug: 'rice-and-grain',
      name: 'Rice & Grain',
      emoji: '🌾',
    };
    const failure = new Error('query failed');
    const result = await resolveCategoryRouteData({
      slug: category.slug,
      categories: [category],
      currentCategory: category,
      repository: repositoryWithSearch(() => Promise.reject(failure)),
    });

    expect(result.parentGroup?.slug).toBe('cooking-essentials');
    expect(result.products).toEqual([]);
    expect(result.error).toBe(failure);
  });
});

describe('loadCategoryCatalogProducts', () => {
  it('filters the snapshot by the search term when the repository is empty', async () => {
    const snapshot = [catalogProduct('rice', 'Rice'), catalogProduct('soap', 'Soap')];
    const repository = repositoryWithSearch(async () => emptyResult);

    const result = await loadCategoryCatalogProducts(repository, snapshot, 'rice');

    expect(result.products.map((product) => product.id)).toEqual(['rice']);
  });

  it('returns the full snapshot and the query error when the repository fails', async () => {
    const snapshot = [catalogProduct('rice', 'Rice')];
    const failure = new Error('offline');
    const repository = repositoryWithSearch(() => Promise.reject(failure));

    const result = await loadCategoryCatalogProducts(repository, snapshot);

    expect(result.products).toEqual(snapshot);
    expect(result.error).toBe(failure);
  });
});

describe('isolated Ice Cream leaf-category pagination', () => {
  const category: Category = {
    id: 'ice-cream-category',
    slug: 'ice-cream',
    name: 'Ice Cream',
    emoji: '🍦',
  };

  it.each([65, 501, 1001])(
    'traverses a stable %i-item category exactly once without client-side caps',
    async (count) => {
      const products: RepositoryProduct[] = Array.from({ length: count }, (_, i) =>
        catalogProduct(String(i).padStart(5, '0'), `Ice Cream ${String(i).padStart(5, '0')}`) as unknown as RepositoryProduct,
      );
      const search = vi.fn(async ({ limit = 24, offset = 0 }: ProductSearchCriteria) => ({
        products: products.slice(offset, offset + limit),
        hasMore: offset + limit < products.length,
      }));
      const received: string[] = [];
      for (let page = 1; page <= Math.ceil(count / 24); page++) {
        const result = await resolveCategoryRouteData({
          slug: category.slug,
          categories: [category],
          currentCategory: category,
          repository: repositoryWithSearch(search),
          page,
          pageSize: 24,
        });
        expect(result.error).toBeUndefined();
        received.push(...result.products.map((p) => p.id));
        expect(result.products.length).toBeLessThanOrEqual(24);
        expect(result.hasMore).toBe(page * 24 < count);
        expect(search).toHaveBeenLastCalledWith({
          query: undefined,
          categoryId: category.id,
          limit: 24,
          offset: (page - 1) * 24,
        });
      }
      expect(received).toEqual(products.map((p) => p.id));
      expect(new Set(received).size).toBe(count);
    },
  );

  it('returns empty when an out-of-range ID and legacy name page are both empty', async () => {
    const search = vi.fn().mockResolvedValue(emptyResult);
    const result = await resolveCategoryRouteData({
      slug: category.slug,
      categories: [category],
      currentCategory: category,
      repository: repositoryWithSearch(search),
      page: 99,
      pageSize: 24,
    });
    expect(result.products).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(search).toHaveBeenCalledTimes(3);
    expect(search).toHaveBeenNthCalledWith(1, { query: undefined, categoryId: category.id, limit: 24, offset: 2352 });
    expect(search).toHaveBeenNthCalledWith(2, { categoryId: category.id, limit: 1, offset: 0 });
    expect(search).toHaveBeenNthCalledWith(3, { query: 'Ice Cream', limit: 24, offset: 2352 });
  });
});

describe('Ice Cream legacy fallback pagination boundaries', () => {
  const category: Category = { id: 'legacy-ice', slug: 'ice-cream', name: 'Ice Cream', emoji: '🍦' };

  it('paginates name-only legacy products consistently when category IDs have no products', async () => {
    const fixture: RepositoryProduct[] = Array.from({ length: 65 }, (_, i) =>
      catalogProduct(`ice-${String(i).padStart(3, '0')}`, `Ice Cream ${i}`) as unknown as RepositoryProduct,
    );
    const search = vi.fn(async (criteria: ProductSearchCriteria) => ({
      products: criteria.categoryId
        ? []
        : fixture.slice(criteria.offset ?? 0, (criteria.offset ?? 0) + (criteria.limit ?? 200)),
      hasMore: criteria.categoryId
        ? false
        : (criteria.offset ?? 0) + (criteria.limit ?? 200) < fixture.length,
    }));
    const all: string[] = [];
    for (const page of [1, 2, 3]) {
      const result = await resolveCategoryRouteData({
        slug: 'ice-cream', categories: [category], currentCategory: category,
        repository: repositoryWithSearch(search), page, pageSize: 24,
      });
      all.push(...result.products.map(p => p.id));
      expect(result.hasMore).toBe(page < 3);
    }
    expect(all).toEqual(fixture.map(p => p.id));
    expect(search).toHaveBeenCalledWith({ query: 'Ice Cream', limit: 24, offset: 48 });
  });

  it('does not switch to legacy name matching beyond the end of an ID-based catalog', async () => {
    const firstProduct = catalogProduct('one', 'Ice Cream One') as unknown as RepositoryProduct;
    const search = vi.fn(async (criteria: ProductSearchCriteria) => ({
      products: criteria.categoryId && criteria.offset === 0
        ? [firstProduct]
        : [],
      hasMore: false,
    }));
    const result = await resolveCategoryRouteData({
      slug: 'ice-cream', categories: [category], currentCategory: category,
      repository: repositoryWithSearch(search), page: 4, pageSize: 24,
    });
    expect(result.products).toEqual([]);
    expect(search).toHaveBeenCalledTimes(2);
    expect(search).not.toHaveBeenCalledWith(expect.objectContaining({ query: 'Ice Cream' }));
  });
});
