import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { isProductSitemapEligible } from '../../sitemap';
import { getCanonicalCategorySlug } from '../types';

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

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ variable: 'font-bricolage' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Manrope: () => ({ variable: 'font-manrope' }),
  Noto_Sans_Bengali: () => ({ variable: 'font-bengali' }),
}));

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock CategoryShell to inspect rendered props
vi.mock('../../category/CategoryShell', () => ({
  CategoryShell: vi.fn((props: any) => ({
    type: 'CategoryShell',
    props,
  })),
}));

// Mock products repository / cached helpers
const mockProduct = {
  id: '029b62d8-1111-2222-3333-444455556666',
  name: 'Radhuni Holud Gura 100gm',
  price: 65,
  category: 'Cooking Essentials',
  categoryId: 'c3',
  description: 'Pure turmeric powder',
  image_url: 'https://images.luckystore1947.com/turmeric.jpg',
  unit: '100gm',
  stock: 20,
};

const mockCategories = [
  { id: 'c1', slug: 'snacks', name: 'Snacks', emoji: '🍿', active: true },
  { id: 'c2', slug: 'personal-care', name: 'Personal Care', emoji: '🧺', active: true },
  { id: 'c3', slug: 'cooking-essentials', name: 'Cooking Essentials', emoji: '🍳', active: true },
  { id: 'c4', slug: 'rice-and-grain', name: 'Rice & Grain', emoji: '🌾', active: true, parentId: 'c3' },
  { id: 'c5', slug: 'oil-and-ghee', name: 'Oil & Ghee', emoji: '🛢️', active: true, parentId: 'c3' },
  { id: 'c6', slug: 'tea-and-coffee', name: 'Tea & Coffee', emoji: '🍵', active: true },
];

const mockSearch = vi.fn(async (args: any) => {
  if (args.categoryId === 'c4') {
    return { products: [mockProduct], total: 1 };
  }
  if (args.categoryIds && (args.categoryIds.includes('c2') || args.categoryIds.includes('c3'))) {
    return { products: [{ ...mockProduct, id: 'item-pc', category: 'Personal Care' }], total: 1 };
  }
  return { products: [], total: 0 };
});

vi.mock('../products/index', () => ({
  createProductRepository: vi.fn(() => ({
    repo: {
      search: mockSearch,
    },
  })),
}));

vi.mock('../products/getCachedCategories', () => ({
  getCachedCategories: vi.fn(async () => mockCategories),
}));

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
        'https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8',
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

  describe('Category Routing & Product Loading Contract', () => {
    it('returns 200 indexable canonical metadata for valid canonical category', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/personal-care');
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
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/personal-care');
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

    it('CRITICAL REGRESSION TEST: valid leaf category queries products by categoryId and renders them', async () => {
      const CategorySlugPage = (await import('../../category/[slug]/page')).default;
      const result = await CategorySlugPage({
        params: Promise.resolve({ slug: 'rice-and-grain' }),
        searchParams: Promise.resolve({}),
      });

      // Assert repo.search was called with leaf categoryId 'c4'
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'c4',
          limit: 200,
        }),
      );

      // Assert CategoryShell received the loaded products
      expect(result.props.categorySlug).toBe('rice-and-grain');
      expect(result.props.products).toEqual([mockProduct]);
    });

    it('valid group root category aggregates subcategories and loads products', async () => {
      const CategorySlugPage = (await import('../../category/[slug]/page')).default;
      const result = await CategorySlugPage({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({}),
      });

      // Assert repo.search was called with categoryIds array
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: expect.arrayContaining(['c2']),
          limit: 500,
        }),
      );

      expect(result.props.categorySlug).toBe('personal-care');
      expect(result.props.products.length).toBeGreaterThan(0);
    });
  });

  describe('Middleware Category Interception Contract', () => {
    it('redirects /category?cat=snacks with HTTP 308 to /category/snacks', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category?cat=snacks');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/category/snacks');
    });

    it('preserves other query parameters while consolidating cat parameter in single 308 hop', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category?cat=Personal%20Care&sort=price&q=chips');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe(
        'https://www.luckystore1947.com/category/personal-care?sort=price&q=chips',
      );
    });

    it('redirects unnormalized category paths like /category/Personal-Care with HTTP 308 to /category/personal-care', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category/Personal-Care');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/category/personal-care');
    });
  });

  describe('Category Slug Canonicalization Consistency', () => {
    it('produces identical normalized slugs across all representations', () => {
      expect(getCanonicalCategorySlug('tea-&-coffee')).toBe('tea-and-coffee');
      expect(getCanonicalCategorySlug('Tea & Coffee')).toBe('tea-and-coffee');
      expect(getCanonicalCategorySlug('tea-and-coffee')).toBe('tea-and-coffee');
      expect(getCanonicalCategorySlug('Personal Care')).toBe('personal-care');
      expect(getCanonicalCategorySlug('personal-care')).toBe('personal-care');
      expect(getCanonicalCategorySlug('snacks')).toBe('snacks');
      expect(getCanonicalCategorySlug('rice-and-grain')).toBe('rice-and-grain');
    });
  });

  describe('Product Sitemap Eligibility Contract (RPC search_items_pos DB-level active filter)', () => {
    it('accepts valid active products with positive price', () => {
      expect(isProductSitemapEligible({ id: 'uuid-1', name: 'Item', price: 10, is_active: true })).toBe(true);
      // search_items_pos filters by WHERE i.is_active = true at DB level but omits is_active in projection
      expect(isProductSitemapEligible({ id: 'uuid-1', name: 'Item', price: 10 })).toBe(true);
    });

    it('rejects inactive products (is_active: false)', () => {
      expect(isProductSitemapEligible({ id: 'uuid-1', name: 'Item', price: 10, is_active: false })).toBe(false);
    });

    it('rejects inactive products (active: false)', () => {
      expect(isProductSitemapEligible({ id: 'uuid-1', name: 'Item', price: 10, active: false })).toBe(false);
    });

    it('rejects zero or negative price', () => {
      expect(isProductSitemapEligible({ id: 'uuid-1', name: 'Item', price: 0, is_active: true })).toBe(false);
      expect(isProductSitemapEligible({ id: 'uuid-1', name: 'Item', price: -5, is_active: true })).toBe(false);
    });

    it('rejects missing or whitespace-only name or id', () => {
      expect(isProductSitemapEligible({ id: '', name: 'Item', price: 10 })).toBe(false);
      expect(isProductSitemapEligible({ id: 'uuid-1', name: '  ', price: 10 })).toBe(false);
      expect(isProductSitemapEligible({ id: null, name: 'Item', price: 10 })).toBe(false);
    });
  });

  describe('Phase 3: Money Page Metadata & Snippet Optimization Contract', () => {
    it('provides clean entity-level Homepage root metadata without product stuffing', async () => {
      const { metadata } = await import('../../layout');
      expect((metadata.title as any).default).toBe('Lucky Store | Online Grocery & Daily Bazaar in Chattogram');
      expect(metadata.description).toBe(
        'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.',
      );
      expect((metadata.openGraph as any)?.title).toBe('Lucky Store | Online Grocery & Daily Bazaar in Chattogram');
      expect((metadata.twitter as any)?.title).toBe('Lucky Store | Online Grocery & Daily Bazaar in Chattogram');

      // Adversarial check: homepage description must not stuff specific category product terms
      const descLower = (metadata.description || '').toLowerCase();
      expect(descLower).not.toContain('miniket');
      expect(descLower).not.toContain('mustard oil');
      expect(descLower).not.toContain('soybean');
    });

    it('generates high-intent snippet metadata for /category/rice-and-grain without unverified claims', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'rice-and-grain' }),
        searchParams: Promise.resolve({}),
      });

      const titleStr = typeof meta.title === 'string' ? meta.title : (meta.title as any)?.absolute;
      expect(titleStr).toBe('Miniket & Chinigura Rice Price in Chittagong | Lucky Store');
      expect(meta.description).toContain('Shop Miniket, Nazirshail and Chinigura rice in Chittagong at displayed bazaar prices');
      expect(meta.description).toContain('doorstep product inspection');
      expect(meta.description).not.toContain('Guaranteed weight');
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/rice-and-grain');
    });

    it('generates high-intent snippet metadata for /category/oil-and-ghee without unverified dispatch claims', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'oil-and-ghee' }),
        searchParams: Promise.resolve({}),
      });

      const titleStr = typeof meta.title === 'string' ? meta.title : (meta.title as any)?.absolute;
      expect(titleStr).toBe('Soybean & Mustard Oil Price in Chittagong | Lucky Store');
      expect(meta.description).toContain('current 1L & 5L soybean and mustard oil prices in Chittagong');
      expect(meta.description).not.toContain('Authentic sealed bottles');
      expect(meta.description).not.toContain('fast local dispatch');
      expect(meta.description).not.toContain('Pure');
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/oil-and-ghee');
    });

    it('generates high-intent snippet metadata for /category/cooking-essentials', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'cooking-essentials' }),
        searchParams: Promise.resolve({}),
      });

      const titleStr = typeof meta.title === 'string' ? meta.title : (meta.title as any)?.absolute;
      expect(titleStr).toBe('Daily Bazaar & Pantry Staples in Chittagong | Lucky Store');
      expect(meta.description).toContain('Shop everyday bazaar essentials: lentils, flour, spices, salt & sugar at displayed prices');
      expect(meta.description).not.toContain('local market prices');
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/cooking-essentials');
    });

    it('generates high-intent snippet metadata for /category/tea-and-coffee without sourcing fiction', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'tea-and-coffee' }),
        searchParams: Promise.resolve({}),
      });

      const titleStr = typeof meta.title === 'string' ? meta.title : (meta.title as any)?.absolute;
      expect(titleStr).toBe('Ispahani Tea & Coffee Blends in Chittagong | Lucky Store');
      expect(meta.description).toContain('Shop Ispahani Mirzapore, Taaza tea and coffee online from Lucky Store in Chittagong');
      expect(meta.description).not.toContain('Handpicked blends');
      expect(meta.description).not.toContain('garden-fresh');
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/tea-and-coffee');
    });

    it('falls back to factual metadata for non-money category without delivery speed claims', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('Personal Care in Chittagong');
      expect(meta.description).toBe(
        'Shop Personal Care online at Lucky Store Chittagong. Browse current prices and order for local delivery with Cash on Delivery.',
      );
      expect(meta.description).not.toContain('fast');
      expect(meta.description).not.toContain('Quality items');
    });
  });

  describe('Adversarial SEO & Canonical Interception Contract', () => {
    it('permanently redirects legacy tea-coffee alias to /category/tea-and-coffee in middleware with HTTP 308', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category/tea-coffee');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/category/tea-and-coffee');
    });

    it('permanently redirects legacy tea-&-coffee alias to /category/tea-and-coffee in middleware with HTTP 308', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category/tea-&-coffee');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/category/tea-and-coffee');
    });

    it('preserves clean parent canonical and adds noindex,follow on filtered category queries', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'rice-and-grain' }),
        searchParams: Promise.resolve({ sort: 'price_asc', brand: 'teer' }),
      });

      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/rice-and-grain');
    });

    it('rejects unverified promotional claims across all money metadata entries', async () => {
      const { generateMetadata } = await import('../../category/[slug]/page');
      const moneySlugs = ['rice-and-grain', 'oil-and-ghee', 'cooking-essentials', 'tea-and-coffee'];
      const forbiddenTerms = [
        'guaranteed weight',
        'handpicked',
        'garden-fresh',
        'fast delivery',
        'fast local dispatch',
        'fast home delivery',
        'finest',
      ];

      for (const slug of moneySlugs) {
        const meta = await generateMetadata({
          params: Promise.resolve({ slug }),
          searchParams: Promise.resolve({}),
        });
        const descLower = (meta.description || '').toLowerCase();
        for (const term of forbiddenTerms) {
          expect(descLower).not.toContain(term);
        }
      }
    });

    it('handles malformed percent-encoded category slugs in middleware without throwing 500', async () => {
      const { middleware } = await import('../../../middleware');
      
      const malformedUrls = [
        'https://www.luckystore1947.com/category/%E0%A4%A',
        'https://www.luckystore1947.com/category/%ZZ',
        'https://www.luckystore1947.com/category/%',
        'https://www.luckystore1947.com/category/%a',
      ];

      for (const url of malformedUrls) {
        const req = new NextRequest(url);
        // Must not throw URIError (which causes 500 in Next.js)
        const res = await middleware(req);
        // Middleware passes through to route handler (NextResponse.next() status 200 or updated session)
        expect(res.status).toBeLessThan(500);
      }
    });

    it('triggers notFound() without throwing URIError 500 for malformed percent-encoded category slug in page & metadata', async () => {
      const { generateMetadata, default: CategoryPage } = await import('../../category/[slug]/page');

      // generateMetadata should trigger notFound()
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: '%E0%A4%A' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: '%ZZ' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      // CategoryPage should trigger notFound()
      await expect(
        CategoryPage({
          params: Promise.resolve({ slug: '%E0%A4%A' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });
  });
});
