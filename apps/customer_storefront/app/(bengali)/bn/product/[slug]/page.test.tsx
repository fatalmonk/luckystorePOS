import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toProductSlug } from '../../../../lib/products/slugify';
import { getEnrichedProductData } from '../../../../lib/products/productEnrichment';
import { getCachedProductBySlug } from '../../../../lib/products/getCachedProduct';
import { generateMetadata } from './page';

const mocks = vi.hoisted(() => {
  const translationQuery: Record<string, any> = {};
  translationQuery.select = vi.fn(() => translationQuery);
  translationQuery.eq = vi.fn(() => translationQuery);
  translationQuery.maybeSingle = vi.fn();
  return { translationQuery, getCachedProductBySlug: vi.fn() };
});

vi.mock('../../../../lib/products/getCachedProduct', () => ({
  getCachedProductBySlug: mocks.getCachedProductBySlug,
}));
vi.mock('../../../../lib/supabase', () => ({
  supabase: { from: vi.fn(() => mocks.translationQuery) },
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('not found'); },
  permanentRedirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));

describe('Bengali Cadbury product metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses catalog-aligned localized enrichment for published translation metadata', async () => {
    const product = {
      id: '4dc60601-5883-4ab4-98a7-d5e8b1ca8adb',
      name: 'Cadbury Dairy Milk Chocolate Bar, 13.2 g',
      description: 'Old translated copy mentioning 100% sustainably sourced cocoa.',
      price: 45,
      unit: 'pc',
      brand: 'Cadbury',
      category: 'Chocolates & Candies',
      image_url: null,
      origin: null,
    };
    const slug = toProductSlug(product.name, product.id);
    vi.mocked(getCachedProductBySlug).mockResolvedValue(product as never);
    mocks.translationQuery.maybeSingle.mockResolvedValue({
      data: { name: product.name, description: product.description, origin: null },
      error: null,
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    const expectedSummary = getEnrichedProductData('4dc60601')?.localizedContent?.bn?.summary;

    expect(metadata.title).toEqual({ absolute: expect.stringContaining('13.2 g') });
    expect(metadata.description).toBe(expectedSummary);
    expect(metadata.description).not.toMatch(/100%|sustainably sourced/i);
    expect(metadata.robots).toBeUndefined();
  });
});
