import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProductDetailItemSchema, ProductDetailResponseSchema } from './product';

describe('product detail schema validation', () => {
  it('parses valid product detail with optional fields', () => {
    const valid = {
      id: 'p1',
      name: 'Chinigura Rice 1kg',
      emoji: '🌾',
      price: 160,
      originalPrice: 175,
      unit: '1 kg',
      stock: 15,
      imageUrl: 'https://www.luckystore1947.com/images/chinigura.jpg',
      badge: 'Best Seller',
      category: 'rice-and-grain',
      categoryId: 'c1',
      description: 'Fragrant traditional Chinigura rice',
      brand: 'Pran',
      sku: 'RIC-001',
    };
    const parsed = ProductDetailItemSchema.parse(valid);
    assert.equal(parsed.id, 'p1');
    assert.equal(parsed.brand, 'Pran');
    assert.equal(parsed.stock, 15);
  });

  it('rejects product detail with invalid price', () => {
    assert.throws(() => ProductDetailItemSchema.parse({
      id: 'p1',
      name: 'Bad',
      price: -50,
      unit: 'pc',
      stock: 1,
      category: 'rice',
    }));
  });

  it('parses full ProductDetailResponse with related items', () => {
    const response = {
      locale: 'en',
      product: {
        id: 'p1',
        name: 'Rice',
        price: 100,
        unit: 'kg',
        stock: 5,
        category: 'rice',
      },
      related: [
        {
          id: 'p2',
          name: 'Lentils',
          price: 120,
          unit: 'kg',
          stock: 8,
          category: 'cooking-essentials',
        },
      ],
    };
    const parsed = ProductDetailResponseSchema.parse(response);
    assert.equal(parsed.locale, 'en');
    assert.equal(parsed.product.id, 'p1');
    assert.equal(parsed.related.length, 1);
  });
});
