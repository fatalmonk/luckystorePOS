import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProductDetailItemSchema, ProductDetailResponseSchema } from './product';

describe('product detail schema validation', () => {
  it('preserves published Bengali copy and details through the response schema', () => {
    const response = ProductDetailResponseSchema.parse({
      locale: 'bn',
      product: {
        id: 'p1', name: 'বাংলা পণ্য', description: 'পর্যালোচিত বিবরণ', origin: 'বাংলাদেশ',
        details: { summary: 'সারাংশ', highlights: ['বৈশিষ্ট্য'] }, translationStatus: 'published',
        price: 100, unit: 'পিস', stock: 3, category: '',
      },
      related: [{
        id: 'p2', name: 'আরেক পণ্য', description: '', translationStatus: 'published',
        price: 120, unit: 'পিস', stock: 2, category: '',
      }],
    });
    assert.equal(response.product.origin, 'বাংলাদেশ');
    assert.equal(response.product.category, '');
    assert.deepEqual(response.product.details?.highlights, ['বৈশিষ্ট্য']);
    assert.equal(response.related[0].translationStatus, 'published');
  });

  it('preserves explicit missing status on Bengali related items for screen filtering', () => {
    const response = ProductDetailResponseSchema.parse({
      locale: 'bn',
      product: { id: 'p1', name: 'বাংলা পণ্য', translationStatus: 'published', price: 100, unit: 'পিস', stock: 3, category: '' },
      related: [{ id: 'p2', name: '', description: '', translationStatus: 'missing', price: 120, unit: 'পিস', stock: 2 }],
    });
    assert.equal(response.related[0].translationStatus, 'missing');
    assert.equal(response.related[0].name, '');
  });

  it('parses valid published product with Bengali fields', () => {
    const validPublished = {
      id: 'p1',
      name: 'রাঁধুনী সরিষার তেল 1 L',
      emoji: '🛢️',
      price: 260,
      originalPrice: 280,
      unit: '1 L',
      stock: 8,
      category: '',
      description: 'পর্যালোচিত বাংলা বিবরণ।',
      brand: 'Radhuni',
      sku: 'OIL-RAD-1L',
      origin: 'বাংলাদেশ',
      details: {
        summary: 'পর্যালোচিত বাংলা সারাংশ।',
        highlights: ['যাচাইকৃত বৈশিষ্ট্য'],
        specifications: [{ label: 'প্যাকের ধরন', value: 'বোতল' }],
        usageDirections: 'লেবেলের নির্দেশনা অনুসরণ করুন।',
        storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
        faqs: [{ question: 'উৎপত্তি কোথায়?', answer: 'বাংলাদেশ।' }],
      },
      translationStatus: 'published',
      bengaliName: 'রাঁধুনী সরিষার তেল 1 L',
      bengaliDescription: 'পর্যালোচিত বাংলা বিবরণ।',
    };
    const parsed = ProductDetailItemSchema.parse(validPublished);
    assert.equal(parsed.name, 'রাঁধুনী সরিষার তেল 1 L');
    assert.equal(parsed.translationStatus, 'published');
    assert.ok(parsed.details);
  });

  it('parses valid missing product with preserved empty fields', () => {
    const validMissing = {
      id: 'p1',
      name: '',
      emoji: '🛢️',
      price: 260,
      originalPrice: 280,
      unit: '1 L',
      stock: 8,
      category: '',
      description: '',
      brand: 'Radhuni',
      sku: 'OIL-RAD-1L',
      origin: 'বাংলাদেশ',
      details: {
        summary: 'পর্যালোচিত বাংলা সারাংশ।',
        highlights: ['যাচাইকৃত বৈশিষ্ট্য'],
        specifications: [{ label: 'প্যাকের ধরন', value: 'বোতল' }],
        usageDirections: 'লেবেলের নির্দেশনা অনুসরণ করুন।',
        storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
        faqs: [{ question: 'উৎপত্তি কোথায়?', answer: 'বাংলাদেশ।' }],
      },
      translationStatus: 'missing',
      bengaliName: undefined,
      bengaliDescription: undefined,
    };
    const parsed = ProductDetailItemSchema.parse(validMissing);
    assert.equal(parsed.name, '');
    assert.equal(parsed.translationStatus, 'missing');
    assert.ok(parsed.details);
    assert.equal(parsed.category, '');
  });

  it('rejects an English badge in a missing Bengali translation', () => {
    assert.throws(() => ProductDetailResponseSchema.parse({
      locale: 'bn',
      product: {
        id: 'p1', name: '', description: '', translationStatus: 'missing',
        price: 100, unit: 'pc', stock: 3, category: '', badge: 'Sale',
      },
      related: [],
    }));
  });

  it('rejects invalid locale-translationStatus combinations', () => {
    // Invalid: bn published with empty name
    assert.throws(() =>
      ProductDetailResponseSchema.parse({
        locale: 'bn',
        product: {
          id: 'p1',
          name: '',
          translationStatus: 'published',
          price: 260,
          unit: '1 L',
          stock: 8,
          category: '',
        },
        related: [],
      }),
    );

    // Invalid: en missing
    assert.throws(() =>
      ProductDetailResponseSchema.parse({
        locale: 'en',
        product: {
          id: 'p1',
          name: 'Valid',
          translationStatus: 'missing',
          price: 260,
          unit: '1 L',
          stock: 8,
          category: 'Cooking Oil',
        },
        related: [],
      }),
    );

    // Invalid: bn missing with non-empty name
    assert.throws(() =>
      ProductDetailItemSchema.parse({
        id: 'p1',
        name: 'Invalid',
        translationStatus: 'missing',
        price: 260,
        unit: '1 L',
        stock: 8,
        category: '',
        description: '',
      }),
    );
  });

  it('rejects blank English name in published state', () => {
    assert.throws(() =>
      ProductDetailItemSchema.parse({
        id: 'p1',
        name: '',
        translationStatus: 'published',
        price: 260,
        unit: '1 L',
        stock: 8,
        category: 'Cooking Oil',
      }),
    );
  });

  it('allows omitted English status but rejects omitted Bengali publication status', () => {
    const product = { id: 'p1', name: 'Valid', price: 260, unit: '1 L', stock: 8, category: 'Cooking Oil' };
    assert.equal(ProductDetailItemSchema.parse(product).name, 'Valid');
    assert.equal(ProductDetailResponseSchema.parse({ locale: 'en', product, related: [] }).product.name, 'Valid');
    assert.throws(() => ProductDetailResponseSchema.parse({ locale: 'bn', product, related: [] }));
  });
});
