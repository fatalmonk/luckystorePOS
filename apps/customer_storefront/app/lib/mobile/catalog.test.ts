import { describe, expect, it } from 'vitest';
import { sortProducts, toMobileCatalog } from './catalog';
import type { Category, Product } from '../products/types';
import { createProductId } from '../products/types';

describe('mobile catalog adapter', () => {
  const dummyCategories: Category[] = [
    { id: 'c1', slug: 'rice-and-grain', name: 'Rice & Grains', emoji: '🌾' },
    { id: 'c2', slug: 'oil-and-ghee', name: 'Oil & Ghee', emoji: '🛢️' },
    { id: 'c3', slug: 'tea-and-coffee', name: 'Tea & Coffee', emoji: '☕' },
  ];

  const dummyProducts: Product[] = [
    {
      id: createProductId('p1'),
      name: 'Chinigura Rice 1kg',
      emoji: '🌾',
      price: 160,
      unit: 'kg',
      category: 'rice-and-grain',
      stock: 10,
      description: 'Aromatic rice',
    },
    {
      id: createProductId('p2'),
      name: 'Soybean Oil 5L',
      emoji: '🛢️',
      price: 850,
      unit: 'bottle',
      category: 'oil-and-ghee',
      stock: 0,
      description: 'Refined oil',
    },
    {
      id: createProductId('p3'),
      name: 'Black Tea 400g',
      emoji: '☕',
      price: 240,
      unit: 'pack',
      category: 'tea-and-coffee',
      stock: 5,
      description: 'Premium tea',
    },
  ];

  it('sorts products by price ascending', () => {
    const sorted = sortProducts(dummyProducts, 'price-asc');
    expect(sorted.map((p) => p.price)).toEqual([160, 240, 850]);
  });

  it('sorts products by price descending', () => {
    const sorted = sortProducts(dummyProducts, 'price-desc');
    expect(sorted.map((p) => p.price)).toEqual([850, 240, 160]);
  });

  it('sorts products by name ascending', () => {
    const sorted = sortProducts(dummyProducts, 'name-asc');
    expect(sorted.map((p) => p.name)).toEqual(['Black Tea 400g', 'Chinigura Rice 1kg', 'Soybean Oil 5L']);
  });

  it('prioritizes in-stock items in best sort', () => {
    const sorted = sortProducts(dummyProducts, 'best');
    expect(sorted[sorted.length - 1].stock).toBe(0);
  });

  it('filters by category and inStockOnly', () => {
    const page = toMobileCatalog(dummyCategories, dummyProducts, {
      category: 'rice-and-grain',
      inStockOnly: true,
      locale: 'bn',
    });
    expect(page.locale).toBe('bn');
    expect(page.items.length).toBe(1);
    expect(page.items[0].id).toBe('p1');
    expect(page.total).toBe(1);
    expect(page.category?.name).toBe('চাল ও শস্য');
  });

  it('searches products by query string', () => {
    const page = toMobileCatalog(dummyCategories, dummyProducts, {
      q: 'Tea',
    });
    expect(page.items.length).toBe(1);
    expect(page.items[0].name).toBe('Black Tea 400g');
  });

  it('filters by category group slug and label-derived variants', () => {
    const biscuitCategories: Category[] = [
      { id: 'c4', slug: 'biscuits-and-cookies', name: 'Biscuits & Cookies', emoji: '🍪' },
    ];
    const biscuitProducts: Product[] = [
      {
        id: createProductId('b1'),
        name: 'Digestive Biscuits 200g',
        emoji: '🍪',
        price: 90,
        unit: 'pack',
        category: 'biscuits',
        stock: 10,
        description: 'Crispy wholewheat biscuits',
      },
      {
        id: createProductId('b2'),
        name: 'Chocolate Chip Cookies 150g',
        emoji: '🍪',
        price: 120,
        unit: 'pack',
        category: 'cookies',
        stock: 5,
        description: 'Rich chocolate chip cookies',
      },
      {
        id: createProductId('b3'),
        name: 'Butter Biscuits Group Pack',
        emoji: '🍪',
        price: 150,
        unit: 'box',
        category: 'biscuits-and-cookies',
        stock: 8,
        description: 'Assorted butter biscuits',
      },
      {
        id: createProductId('b4'),
        name: 'Soybean Oil 1L',
        emoji: '🛢️',
        price: 190,
        unit: 'bottle',
        category: 'oil-and-ghee',
        stock: 20,
        description: 'Pure soybean cooking oil',
      },
    ];

    // Query by canonical group slug
    const pageFromSlug = toMobileCatalog(biscuitCategories, biscuitProducts, {
      category: 'biscuits-and-cookies',
    });
    expect(pageFromSlug.items.map((p) => p.id)).toEqual(['b1', 'b2', 'b3']);

    // Query by label-derived variant
    const pageFromLabel = toMobileCatalog(biscuitCategories, biscuitProducts, {
      category: 'Biscuits & Cookies',
    });
    expect(pageFromLabel.items.map((p) => p.id)).toEqual(['b1', 'b2', 'b3']);
  });
});
