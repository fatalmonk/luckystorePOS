import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next/navigation
const mockNotFound = vi.fn(() => {
  const err = new Error('NEXT_NOT_FOUND');
  (err as any).digest = 'NEXT_NOT_FOUND';
  throw err;
});

const mockPermanentRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT;replace;${url};308;`);
  (err as any).digest = `NEXT_REDIRECT;replace;${url};308;`;
  throw err;
});

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  redirect: (url: string) => mockPermanentRedirect(url),
}));

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock products repository / cached helpers
const mockProduct = {
  id: '029b62d8-1111-2222-3333-444455556666',
  name: 'Radhuni Holud Gura 100gm',
  price: 65,
  category: 'Cooking Essentials',
  categoryId: 'cat-cooking',
  description: 'Pure turmeric powder',
  image_url: 'https://images.luckystore1947.com/turmeric.jpg',
  unit: '100gm',
  stock: 20,
};

vi.mock('../products/getCachedProduct', () => ({
  getCachedProductBySlug: vi.fn(async (slug: string) => {
    if (slug.includes('029b62d8')) return mockProduct;
    return null;
  }),
}));

vi.mock('../products/getCachedCrossSell', () => ({
  getCachedCrossSellProducts: vi.fn(async () => []),
  prepareCrossSell: vi.fn(() => []),
}));

const mockCategories = [
  { id: 'c1', slug: 'snacks', name: 'Snacks', emoji: '🍿', active: true },
  { id: 'c2', slug: 'personal-care', name: 'Personal Care', emoji: '🧺', active: true },
  { id: 'c3', slug: 'cooking-essentials', name: 'Cooking Essentials', emoji: '🍳', active: true },
];

vi.mock('../products/getCachedCategories', () => ({
  getCachedCategories: vi.fn(async () => mockCategories),
}));

describe('SEO & Routing Contract Tests (Phase 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Product Routing & Metadata Contract', () => {
    it('returns canonical metadata for valid canonical product slug', async () => {
      const { generateMetadata } = await import('../../product/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
      });

      expect(meta.alternates?.canonical).toBe(
        'https://luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8',
      );
      expect(mockNotFound).not.toHaveBeenCalled();
      expect(mockPermanentRedirect).not.toHaveBeenCalled();
    });

    it('triggers notFound() in generateMetadata for nonexistent product', async () => {
      const { generateMetadata } = await import('../../product/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'nonexistent-item--99999999' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('triggers 308 permanentRedirect for bare UUID product URL', async () => {
      const { generateMetadata } = await import('../../product/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: '029b62d8-1111-2222-3333-444455556666' }),
        }),
      ).rejects.toThrow('NEXT_REDIRECT;replace;/product/radhuni-holud-gura-100gm--029b62d8;308;');

      expect(mockPermanentRedirect).toHaveBeenCalledWith(
        '/product/radhuni-holud-gura-100gm--029b62d8',
      );
    });

    it('triggers 308 permanentRedirect for outdated slug with valid UUID prefix', async () => {
      const { generateMetadata } = await import('../../product/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'old-product-name--029b62d8' }),
        }),
      ).rejects.toThrow('NEXT_REDIRECT;replace;/product/radhuni-holud-gura-100gm--029b62d8;308;');

      expect(mockPermanentRedirect).toHaveBeenCalledWith(
        '/product/radhuni-holud-gura-100gm--029b62d8',
      );
    });

    it('triggers notFound() in ProductPage component for missing product', async () => {
      const ProductPage = (await import('../../product/[slug]/page')).default;
      await expect(
        ProductPage({
          params: Promise.resolve({ slug: 'missing-product--99999999' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });
  });

  describe('Category Routing & Metadata Contract', () => {
    it('returns 200 indexable canonical metadata for valid canonical category', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.alternates?.canonical).toBe('https://luckystore1947.com/category/personal-care');
      expect(meta.robots).toBeUndefined(); // defaults to index,follow
      expect(mockNotFound).not.toHaveBeenCalled();
    });

    it('triggers notFound() in generateMetadata for invalid category slug (eliminates soft 404)', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'absolute-nonsense-category' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('triggers 308 permanentRedirect for unnormalized category alias (one-hop consolidation)', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'Personal-Care' }),
          searchParams: Promise.resolve({ sort: 'price' }),
        }),
      ).rejects.toThrow('NEXT_REDIRECT;replace;/category/personal-care?sort=price;308;');

      expect(mockPermanentRedirect).toHaveBeenCalledWith('/category/personal-care?sort=price');
    });

    it('emits noindex,follow on filtered category views while preserving clean canonical', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({ sort: 'price-asc', q: 'soap' }),
      });

      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe('https://luckystore1947.com/category/personal-care');
    });

    it('triggers notFound() in CategorySlugPage component for nonexistent category', async () => {
      const CategorySlugPage = (await import('../../category/[slug]/page')).default;
      await expect(
        CategorySlugPage({
          params: Promise.resolve({ slug: 'completely-bogus-category' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });
  });

  describe('Middleware Category Interception Contract', () => {
    it('redirects /category?cat=snacks with HTTP 308 to /category/snacks', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://luckystore1947.com/category?cat=snacks');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://luckystore1947.com/category/snacks');
    });

    it('preserves other query parameters while consolidating cat parameter', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://luckystore1947.com/category?cat=Personal%20Care&sort=price&q=chips');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe(
        'https://luckystore1947.com/category/personal-care?sort=price&q=chips',
      );
    });
  });

  describe('Sitemap Invariants', () => {
    it('produces valid self-canonical URLs and never injects hardcoded fallbacks on error', async () => {
      const sitemapModule = await import('../../sitemap');
      const sitemap = await sitemapModule.default();

      expect(Array.isArray(sitemap)).toBe(true);
      for (const entry of sitemap) {
        expect(entry.url).toMatch(/^https:\/\/luckystore1947\.com/);
        expect(entry.url).not.toContain('?');
        expect(entry.url).not.toContain('/api/');
        expect(entry.url).not.toContain('/admin/');
      }
    });
  });
});
