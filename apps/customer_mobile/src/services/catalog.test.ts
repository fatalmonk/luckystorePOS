import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogPageSchema, CatalogProductSchema } from './catalog';

describe('catalog schema validation', () => {
  it('accepts valid catalog products', () => {
    const valid = {
      id: 'p1',
      name: 'Miniket Rice 5kg',
      emoji: '🌾',
      price: 380,
      originalPrice: 400,
      unit: 'bag',
      stock: 12,
      imageUrl: 'https://www.luckystore1947.com/images/rice.jpg',
      badge: 'On Sale',
      category: 'rice-and-grain',
      categoryId: 'c1',
      description: 'Premium rice',
    };
    const parsed = CatalogProductSchema.parse(valid);
    assert.equal(parsed.id, 'p1');
    assert.equal(parsed.price, 380);
    assert.equal(parsed.stock, 12);
  });

  it('rejects negative prices and stock', () => {
    assert.throws(() => CatalogProductSchema.parse({
      id: 'p1',
      name: 'Bad',
      price: -10,
      unit: 'pc',
      stock: 1,
      category: 'test',
    }));
  });

  it('parses full CatalogPage with pagination metadata', () => {
    const page = {
      locale: 'en',
      categories: [{ id: 'c1', slug: 'rice', name: 'Rice', emoji: '🌾' }],
      items: [{
        id: 'p1',
        name: 'Rice',
        price: 100,
        unit: 'kg',
        stock: 5,
        category: 'rice',
      }],
      total: 1,
      hasMore: false,
    };
    const parsed = CatalogPageSchema.parse(page);
    assert.equal(parsed.locale, 'en');
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.total, 1);
    assert.equal(parsed.hasMore, false);
  });
});
