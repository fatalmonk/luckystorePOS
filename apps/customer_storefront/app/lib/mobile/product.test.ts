import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../products/types';
import { createProductId } from '../products/types';
import type { PublishedItemTranslation } from '../products/productTranslations';

const mocks = vi.hoisted(() => ({
  getCachedProductBySlug: vi.fn(),
  getCachedCrossSellProducts: vi.fn(),
  prepareCrossSell: vi.fn(),
  getEnrichedProductData: vi.fn(),
  getPublishedItemTranslations: vi.fn(),
  translationQuery: {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  } as Record<string, any>,
}));

mocks.translationQuery.select.mockReturnValue(mocks.translationQuery);
mocks.translationQuery.eq.mockReturnValue(mocks.translationQuery);

vi.mock('../products/getCachedProduct', () => ({
  getCachedProductBySlug: mocks.getCachedProductBySlug,
}));
vi.mock('../products/getCachedCrossSell', () => ({
  getCachedCrossSellProducts: mocks.getCachedCrossSellProducts,
  prepareCrossSell: mocks.prepareCrossSell,
}));
vi.mock('../products/productEnrichment', () => ({
  getEnrichedProductData: mocks.getEnrichedProductData,
}));
vi.mock('../products/productTranslations', () => ({
  getPublishedItemTranslations: mocks.getPublishedItemTranslations,
}));
vi.mock('../supabase', () => ({
  supabase: { from: vi.fn(() => mocks.translationQuery) },
}));

import { getMobileProductDetail, toMobileProductDto } from './product';

describe('mobile product adapter', () => {
  const dummyProduct: Product = {
    id: createProductId('p1'),
    name: 'Mustard Oil 1L',
    emoji: '🛢️',
    price: 260,
    originalPrice: 280,
    unit: '1 L',
    category: 'oil-and-ghee',
    stock: 8,
    badge: 'English badge must not render',
    description: 'Pure mustard oil',
    brand: 'Radhuni',
    sku: 'OIL-RAD-1L',
    origin: 'Bangladesh',
  };

  const translation: PublishedItemTranslation = {
    itemId: dummyProduct.id,
    locale: 'bn',
    name: 'রাঁধুনী সরিষার তেল 1 L',
    description: 'পর্যালোচিত বাংলা বিবরণ।',
    origin: 'বাংলাদেশ',
    searchTerms: ['সরিষার তেল', 'shorishar tel', 'mustard oil'],
    details: {
      summary: 'পর্যালোচিত বাংলা সারাংশ।',
      highlights: ['যাচাইকৃত বৈশিষ্ট্য'],
      specifications: [{ label: 'প্যাকের ধরন', value: 'বোতল' }],
      usageDirections: 'লেবেলের নির্দেশনা অনুসরণ করুন।',
      storageInstructions: 'ঠান্ডা ও শুষ্ক স্থানে রাখুন।',
      faqs: [{ question: 'উৎপত্তি কোথায়?', answer: 'বাংলাদেশ।' }],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.translationQuery.select.mockReturnValue(mocks.translationQuery);
    mocks.translationQuery.eq.mockReturnValue(mocks.translationQuery);
    mocks.translationQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.getCachedProductBySlug.mockResolvedValue(dummyProduct);
    mocks.getCachedCrossSellProducts.mockResolvedValue([{ ...dummyProduct, id: createProductId('related'), name: 'English related product' }]);
    mocks.prepareCrossSell.mockImplementation((products) => products);
    mocks.getEnrichedProductData.mockReturnValue({ summary: 'English enrichment must not render' });
    mocks.getPublishedItemTranslations.mockResolvedValue(new Map([[dummyProduct.id, translation]]));
  });

  it('maps product to mobile DTO in English', () => {
    const dto = toMobileProductDto(dummyProduct, 'en');
    expect(dto).toEqual({
      id: 'p1',
      name: 'Mustard Oil 1L',
      emoji: '🛢️',
      price: 260,
      originalPrice: 280,
      unit: '1 L',
      stock: 8,
      badge: 'English badge must not render',
      category: 'oil-and-ghee',
      description: 'Pure mustard oil',
      brand: 'Radhuni',
      sku: 'OIL-RAD-1L',
    });
  });

  it('maps product to mobile DTO in Bengali when translation is present', () => {
    const dto = toMobileProductDto(dummyProduct, 'bn', undefined, translation);
    expect(dto).toMatchObject({
      name: 'রাঁধুনী সরিষার তেল 1 L',
      description: 'পর্যালোচিত বাংলা বিবরণ।',
      origin: 'বাংলাদেশ',
      details: translation.details,
      translationStatus: 'published',
      category: '',
      price: 260,
      originalPrice: 280,
      unit: '1 L',
      stock: 8,
      brand: 'Radhuni',
      sku: 'OIL-RAD-1L',
    });
  });

  it('marks missing Bengali publication without returning English primary copy', () => {
    const dto = toMobileProductDto(dummyProduct, 'bn', { summary: 'English enrichment must not render' }, null);
    expect(dto.name).toBe('');
    expect(dto.description).toBe('');
    expect(dto.translationStatus).toBe('missing');
    expect(dto.category).toBe('');
    expect(dto).not.toHaveProperty('badge');
    expect(dto).not.toHaveProperty('details');
    expect(JSON.stringify(dto)).not.toContain('Mustard Oil 1L');
    expect(JSON.stringify(dto)).not.toContain('Pure mustard oil');
    expect(JSON.stringify(dto)).not.toContain('English enrichment must not render');
    expect(JSON.stringify(dto)).not.toContain('English badge must not render');
  });

  it('uses the publication reader for Bengali detail responses and omits untranslated related products', async () => {
    const response = await getMobileProductDetail('mustard-oil--p1', 'bn');

    expect(response).toMatchObject({
      locale: 'bn',
      product: {
        name: translation.name,
        description: translation.description,
        translationStatus: 'published',
      },
      related: [],
    });
    expect(JSON.stringify(response)).not.toContain('English related product');
    expect(JSON.stringify(response)).not.toContain('English enrichment must not render');
  });
});
