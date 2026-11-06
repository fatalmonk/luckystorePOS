import { describe, expect, it, vi } from 'vitest';
import type { IProductRepository, ProductSearchCriteria, PaginatedProducts } from './products';
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
