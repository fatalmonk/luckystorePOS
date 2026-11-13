import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { isProductSitemapEligible } from '../../sitemap';
import { getCanonicalCategorySlug } from '../types';

const mockTranslationMaybeSingle = vi.hoisted(() => vi.fn());
const mockTranslationFrom = vi.hoisted(() => vi.fn());
const mockSupabaseRpc = vi.hoisted(() => vi.fn());

const mockUpdateSession = vi.fn(async () => new Response(null, { status: 200 }));

vi.mock('../supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}));

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

function createTranslationQuery() {
  const filters: Record<string, unknown> = {};
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn((column: string, value: unknown) => {
    filters[column] = value;
    return query;
  });
  query.in = vi.fn((column: string, value: unknown) => {
    filters[column] = value;
    return query;
  });
  query.maybeSingle = vi.fn(() => mockTranslationMaybeSingle(filters));
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(mockTranslationMaybeSingle(filters)).then(resolve, reject);
  return query;
}

// Mock both client entry points so publication reads remain deterministic.
vi.mock('../supabase', () => ({
  supabase: {
    from: mockTranslationFrom,
    rpc: mockSupabaseRpc,
  },
}));

vi.mock('../supabase/anonymousStorefront', () => ({
  getAnonymousStorefrontClient: () => ({ from: mockTranslationFrom }),
}));

// Mock CategoryShell to inspect rendered props
vi.mock('../../(english)/category/CategoryShell', () => ({
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

const mockUntranslatedProduct = {
  ...mockProduct,
  id: '7ddf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  name: 'Untranslated Active Item',
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
    if (slug.includes('7ddf0fb2')) return mockUntranslatedProduct;
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
    mockTranslationFrom.mockImplementation(() => createTranslationQuery());
    mockTranslationMaybeSingle.mockImplementation(async (filters: Record<string, unknown>) => {
      const published = filters.locale === 'bn' && filters.review_status === 'published';
      const filteredIds = Array.isArray(filters.item_id) ? filters.item_id : [filters.item_id];
      const itemId = filteredIds.find((value): value is string => typeof value === 'string');
      return {
        data: published && itemId
          ? [{
              item_id: itemId,
              locale: 'bn',
              name: 'রাঁধুনি হলুদ গুঁড়া 100 g',
              description: 'বিশুদ্ধ হলুদের গুঁড়া',
              origin: 'বাংলাদেশ',
              search_terms: ['হলুদ গুঁড়া', 'holud gura', 'turmeric powder'],
              details: null,
              evidence_snapshot: {
                entityId: itemId,
                sourceName: mockProduct.name,
                sourceDescription: mockProduct.description,
                sku: null,
                barcode: null,
                brand: 'Radhuni',
                packageText: mockProduct.unit,
                sourceUris: ['https://example.com/evidence/radhuni-holud'],
                observedAt: '2026-11-12T10:00:00.000Z',
              },
              review_status: 'published',
              reviewed_at: '2026-11-12T11:00:00.000Z',
              published_at: '2026-11-12T12:00:00.000Z',
              reviewed_by: '20000000-0000-4000-8000-000000000001',
              published_by: '30000000-0000-4000-8000-000000000001',
            }]
          : null,
        error: null,
      };
    });
  });

  describe('HTTP named product canonical redirects', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(JSON.stringify([mockProduct]), { status: 200 }));
    });
    afterEach(() => { vi.mocked(fetch).mockRestore(); vi.unstubAllEnvs(); vi.useRealTimers(); });

    it.each(['%E2%80%93', '%E2%80%94', '%E2%88%92'])('redirects encoded supported separator %s before session for both locales', async (separator) => {
      const { middleware } = await import('../../../middleware');
      for (const locale of ['', 'bn/']) {
        const response = await middleware(new NextRequest(`https://www.luckystore1947.com/${locale}product/old-name${separator}029b62d8?ref=smart&x=1&x=2`));
        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe(`https://www.luckystore1947.com/${locale}product/radhuni-holud-gura-100gm--029b62d8?ref=smart&x=1&x=2`);
      }
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it.each([
      ['radhuni-holud-gura-100gm--029b62d8', 200],
      ['--029b62d8', 404],
    ])('aborts stalled lookup for %s and preserves failure semantics', async (slug, expectedStatus) => {
      vi.useFakeTimers();
      let lookupSignal: AbortSignal | undefined;
      vi.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
        lookupSignal = init?.signal ?? undefined;
        lookupSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }));
      const { middleware } = await import('../../../middleware');
      const pending = middleware(new NextRequest(`https://www.luckystore1947.com/product/${slug}`));
      await vi.advanceTimersByTimeAsync(1500);
      expect(lookupSignal?.aborted).toBe(true);
      const response = await pending;
      expect(response.status).toBe(expectedStatus);
      expect(response.headers.get('location')).toBeNull();
      expect(mockUpdateSession).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([
      ['https://luckystore1947.com', '', 'https://www.luckystore1947.com'],
      ['https://www.luckystore1947.com', 'bn/', 'https://www.luckystore1947.com'],
      ['http://localhost:3000', '', 'http://localhost:3000'],
      ['https://seo-preview.vercel.app', 'bn/', 'https://seo-preview.vercel.app'],
    ])('redirects obsolete names before session on %s', async (origin, locale, target) => {
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest(`${origin}/${locale}product/old-name--029b62d8?utm_source=test&x=1&x=2`));
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(`${target}/${locale}product/radhuni-holud-gura-100gm--029b62d8?utm_source=test&x=1&x=2`);
      expect(mockUpdateSession).not.toHaveBeenCalled();
      const lookup = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
      expect(lookup.searchParams.get('is_active')).toBe('eq.true');
      expect(lookup.searchParams.get('limit')).toBe('2');
    });

    it('passes the current slug through without a redirect loop or anonymous session refresh', async () => {
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest('https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8'));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      expect(mockUpdateSession).not.toHaveBeenCalled();
      expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=120, stale-while-revalidate=600');
      expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('content-security-policy-report-only')).toContain("default-src 'self'");
      expect(response.headers.get('permissions-policy')).toContain('camera=()');
      expect(response.headers.get('strict-transport-security')).toContain('max-age=31536000');
    });

    it('refreshes a signed-in catalog session and keeps that response private', async () => {
      const { middleware } = await import('../../../middleware');
      const request = new NextRequest('https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8');
      request.cookies.set('sb-project-auth-token', 'session');
      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(mockUpdateSession).toHaveBeenCalledOnce();
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');
    });

    it('keeps cart responses private even for anonymous visitors', async () => {
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest('https://www.luckystore1947.com/bn/cart'));
      expect(mockUpdateSession).toHaveBeenCalledOnce();
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');
      expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    });

    it('returns a real 404 for product slugs that cannot identify a catalog item', async () => {
      const { middleware } = await import('../../../middleware');
      for (const path of ['/product/fake-xyz', '/bn/product/fake-xyz', '/product/old--zzzzzzzz']) {
        const response = await middleware(new NextRequest(`https://www.luckystore1947.com${path}`));
        expect(response.status, path).toBe(404);
        expect(response.headers.get('x-robots-tag')).toBe('noindex');
        expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
        expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns a real 404 when a canonical product prefix is conclusively absent', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest('https://www.luckystore1947.com/bn/product/missing-item--aaaaaaaa'));
      expect(response.status).toBe(404);
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it.each([
      [[mockProduct, { ...mockProduct, id: '029b62d8-0000-0000-0000-000000000000' }]],
      [[{ id: '029b62d8-invalid', name: 'Bad ID' }]],
    ])('never guesses identity from ambiguous or malformed rows: %j', async (rows) => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 }));
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest('https://www.luckystore1947.com/product/old-name--029b62d8'));
      expect(response.status).not.toBe(404);
      expect(response.headers.get('location')).toBeNull();
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it('passes named routes through when lookup fails but preserves alias 404 semantics', async () => {
      vi.mocked(fetch).mockImplementation(async () => new Response('unavailable', { status: 503 }));
      const { middleware } = await import('../../../middleware');
      expect((await middleware(new NextRequest('https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8'))).status).toBe(200);
      expect((await middleware(new NextRequest('https://www.luckystore1947.com/product/--029b62d8'))).status).toBe(404);
    });

    it('redirects an empty Bengali display slug to the shared English catalog slug', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([{
        id: '95c86e99-34c8-4ed3-823d-2ca8446fdbd9',
        name: 'Diploma Instant Full Cream Milk Powder 500 g',
      }]), { status: 200 }));
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest('https://www.luckystore1947.com/bn/product/--95c86e99?ref=bn'));
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(
        'https://www.luckystore1947.com/bn/product/diploma-instant-full-cream-milk-powder-500-g--95c86e99?ref=bn',
      );
    });

    it('redirects legacy slugs for a Bengali-only catalog name to the transliterated slug', async () => {
      vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify([{
        id: '95c86e99-34c8-4ed3-823d-2ca8446fdbd9',
        name: 'ডিপ্লোমা ইন্স্ট্যান্ট ফুল ক্রিম মিল্ক পাউডার',
      }]), { status: 200 }));
      const { middleware } = await import('../../../middleware');
      const canonical = 'https://www.luckystore1947.com/product/diploma-instyant-ful-krim-milk-paudar--95c86e99';
      for (const slug of ['--95c86e99', 'old-diploma--95c86e99']) {
        const response = await middleware(new NextRequest(`https://www.luckystore1947.com/product/${slug}`));
        expect(response.status, slug).toBe(308);
        expect(response.headers.get('location')).toBe(canonical);
      }
      const current = await middleware(new NextRequest(`https://www.luckystore1947.com/bn/product/diploma-instyant-ful-krim-milk-paudar--95c86e99`));
      expect(current.status).toBe(200);
      expect(current.headers.get('location')).toBeNull();
      const fake = await middleware(new NextRequest('https://www.luckystore1947.com/product/fake-xyz'));
      expect(fake.status).toBe(404);
      expect(fake.headers.get('x-robots-tag')).toBe('noindex');
    });

    it.each(['--029b62d8', '---029b62d8', '029b62d8-1111-2222-3333-444455556666'])('canonicalizes legacy alias %s on the production apex', async (slug) => {
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest(`http://luckystore1947.com/bn/product/${slug}?ref=alias`));
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe('https://www.luckystore1947.com/bn/product/radhuni-holud-gura-100gm--029b62d8?ref=alias');
      expect(mockUpdateSession).not.toHaveBeenCalled();
    });

    it('keeps named canonical routes available when credentials are absent', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      const { middleware } = await import('../../../middleware');
      expect((await middleware(new NextRequest('https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8'))).status).toBe(200);
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each(['old--029b62d', 'old--029b62d80', 'old--zzzzzzzz'])('returns 404 for invalid product suffix %s before lookup', async (slug) => {
      const { middleware } = await import('../../../middleware');
      const response = await middleware(new NextRequest(`https://www.luckystore1947.com/product/${slug}`));
      expect(response.status).toBe(404);
      expect(response.headers.get('location')).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns 404 for unknown brand slugs in both locales', async () => {
      const { middleware } = await import('../../../middleware');
      for (const path of ['/brand/fake-xyz', '/bn/brand/fake-xyz']) {
        const response = await middleware(new NextRequest(`https://www.luckystore1947.com${path}`));
        expect(response.status, path).toBe(404);
        expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
        expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      }
      expect((await middleware(new NextRequest('https://www.luckystore1947.com/brand/radhuni'))).status).toBe(200);
    });

    it('returns 404 when the blog index confirms a slug is absent', async () => {
      vi.stubEnv('NOTFAIR_SEO_API_KEY', 'test-key');
      vi.stubEnv('NOTFAIR_SEO_API_URL', 'https://notfair.example/content');
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ posts: [{ slug: 'real-post' }] }), { status: 200 }));
      const { middleware, _resetBlogSlugCacheForTest } = await import('../../../middleware');
      _resetBlogSlugCacheForTest();
      const missing = await middleware(new NextRequest('https://www.luckystore1947.com/blog/fake-xyz'));
      expect(missing.status).toBe(404);
      expect(missing.headers.get('x-content-type-options')).toBe('nosniff');
      const found = await middleware(new NextRequest('https://www.luckystore1947.com/blog/real-post'));
      expect(found.status).toBe(200);
      expect(found.headers.get('cache-control')).toContain('s-maxage=120');
    });

    it.each(['bad%ZZ--029b62d8', 'bad%2Fname--029b62d8'])('rejects malformed path encoding %s before lookup', async (slug) => {
      const { middleware } = await import('../../../middleware');
      expect((await middleware(new NextRequest(`https://www.luckystore1947.com/product/${slug}`))).status).toBe(404);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Product Routing & Metadata Contract', () => {
    it('returns canonical metadata for valid canonical product slug', async () => {
      const { generateMetadata } = await import('../../(english)/product/[slug]/page');
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
      const { generateMetadata } = await import('../../(english)/product/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'nonexistent-item--99999999' }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('triggers 308 permanentRedirect for bare UUID product URL', async () => {
      const { generateMetadata } = await import('../../(english)/product/[slug]/page');
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
      const { generateMetadata } = await import('../../(english)/product/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'old-product-name--029b62d8' }),
        }),
      ).rejects.toThrow('NEXT_REDIRECT;replace;/product/radhuni-holud-gura-100gm--029b62d8;308;');

      expect(mockPermanentRedirect).toHaveBeenCalledWith(
        '/product/radhuni-holud-gura-100gm--029b62d8',
      );
    });

    it('redirects resolvable empty-name Bengali product slugs by ID prefix', async () => {
      const { generateMetadata } = await import('../../(bengali)/bn/product/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: '--029b62d8' }),
        }),
      ).rejects.toThrow('NEXT_REDIRECT;replace;/bn/product/radhuni-holud-gura-100gm--029b62d8;308;');

      expect(mockPermanentRedirect).toHaveBeenCalledWith(
        '/bn/product/radhuni-holud-gura-100gm--029b62d8',
      );
    });

    describe('Product Hreflang Reciprocity Contract', () => {
      const expectedEnCanonical = 'https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8';
      const expectedBnCanonical = 'https://www.luckystore1947.com/bn/product/radhuni-holud-gura-100gm--029b62d8';

      it('English product alternates emit en-BD, bn-BD, x-default hreflang mapping', async () => {
        const { generateMetadata } = await import('../../(english)/product/[slug]/page');
        const meta = await generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        });

        const languages = meta.alternates?.languages;
        expect(languages).toBeDefined();
        expect(languages?.['en-BD']).toBe(expectedEnCanonical);
        expect(languages?.['bn-BD']).toBe(expectedBnCanonical);
        expect(languages?.['x-default']).toBe(expectedEnCanonical);
      });

      it('Bengali product alternates emit bn-BD, en-BD, x-default hreflang mapping', async () => {
        const { generateMetadata } = await import('../../(bengali)/bn/product/[slug]/page');
        const meta = await generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        });

        const languages = meta.alternates?.languages;
        expect(languages).toBeDefined();
        expect(languages?.['bn-BD']).toBe(expectedBnCanonical);
        expect(languages?.['en-BD']).toBe(expectedEnCanonical);
        expect(languages?.['x-default']).toBe(expectedEnCanonical);
        expect(meta.robots).toBeUndefined();
      });

      it('English and Bengali hreflang alternates are reciprocal', async () => {
        const enMeta = await (await import('../../(english)/product/[slug]/page')).generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        });
        const bnMeta = await (await import('../../(bengali)/bn/product/[slug]/page')).generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        });

        const enLanguages = enMeta.alternates?.languages;
        const bnLanguages = bnMeta.alternates?.languages;

        // en-BD on English page must equal en-BD on Bengali page (same canonical)
        expect(enLanguages?.['en-BD']).toBe(bnLanguages?.['en-BD']);
        // bn-BD on Bengali page must equal bn-BD on English page (same canonical)
        expect(enLanguages?.['bn-BD']).toBe(bnLanguages?.['bn-BD']);
        // x-default on both pages must equal English canonical (default locale)
        expect(enLanguages?.['x-default']).toBe(expectedEnCanonical);
        expect(bnLanguages?.['x-default']).toBe(expectedEnCanonical);
      });
    });

    describe('Hreflang Edge Case Contract (Task 3)', () => {
      it('emits no hreflang alternate pointing at a redirect alias', async () => {
        const { generateMetadata } = await import('../../(english)/product/[slug]/page');
        const meta = await generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        });

        const languages = meta.alternates?.languages ?? {};
        const localeKeys = Object.keys(languages) as Array<keyof typeof languages>;
        for (const localeKey of localeKeys) {
          const value = languages[localeKey];
          expect(typeof value === 'string' ? value : '').not.toContain('/product/old-name');
          expect(typeof value === 'string' ? value : '').not.toContain('/bn/product/old-name');
          expect(typeof value === 'string' ? value : '').not.toContain('?');
        }
        expect(languages?.['en-BD']).toBe('https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8');
        expect(languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/product/radhuni-holud-gura-100gm--029b62d8');
      });

      it('does not emit canonical or hreflang for stale slug redirect before metadata generation', async () => {
        const { generateMetadata } = await import('../../(english)/product/[slug]/page');
        await expect(
          generateMetadata({
            params: Promise.resolve({ slug: 'old-product-name--029b62d8' }),
          }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockPermanentRedirect).toHaveBeenCalledWith('/product/radhuni-holud-gura-100gm--029b62d8');
        expect(mockNotFound).not.toHaveBeenCalled();
      });

      it('keeps an untranslated Bengali fallback self-canonical but noindex and omits the absent bn-BD partner', async () => {
        mockTranslationMaybeSingle.mockResolvedValue({ data: null, error: null });
        const slug = 'untranslated-active-item--7ddf0fb2';
        const enCanonical = `https://www.luckystore1947.com/product/${slug}`;
        const bnCanonical = `https://www.luckystore1947.com/bn/product/${slug}`;

        const enMeta = await (await import('../../(english)/product/[slug]/page')).generateMetadata({
          params: Promise.resolve({ slug }),
        });
        const bnMeta = await (await import('../../(bengali)/bn/product/[slug]/page')).generateMetadata({
          params: Promise.resolve({ slug }),
        });

        expect(enMeta.alternates).toEqual({
          canonical: enCanonical,
          languages: {
            'en-BD': enCanonical,
            'x-default': enCanonical,
          },
        });
        expect(bnMeta.alternates).toEqual({
          canonical: bnCanonical,
        });
        expect(bnMeta.robots).toEqual({ index: false, follow: true });
        expect(mockNotFound).not.toHaveBeenCalled();
        expect(mockPermanentRedirect).not.toHaveBeenCalled();
      });

      it('keeps the noindex self-canonical fallback when the optional translation table is missing', async () => {
        mockTranslationMaybeSingle.mockResolvedValue({
          data: null,
          error: { code: 'PGRST205', message: "Could not find the table 'public.item_translations' in the schema cache" },
        });
        const { generateMetadata } = await import('../../(bengali)/bn/product/[slug]/page');
        const meta = await generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        });

        expect(meta.alternates).toEqual({
          canonical: 'https://www.luckystore1947.com/bn/product/radhuni-holud-gura-100gm--029b62d8',
        });
        expect(meta.robots).toEqual({ index: false, follow: true });
      });

      it('propagates genuine Bengali translation query failures', async () => {
        const queryError = { code: '08006', message: 'connection failure' };
        mockTranslationMaybeSingle.mockResolvedValue({ data: null, error: queryError });
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { generateMetadata } = await import('../../(bengali)/bn/product/[slug]/page');

        await expect(generateMetadata({
          params: Promise.resolve({ slug: 'radhuni-holud-gura-100gm--029b62d8' }),
        })).rejects.toBe(queryError);
        log.mockRestore();
      });
    });

    it('triggers notFound() in ProductPage component for missing product', async () => {
      const ProductPage = (await import('../../(english)/product/[slug]/page')).default;
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
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/personal-care');
      expect(meta.robots).toBeUndefined(); // defaults to index,follow
      expect(mockNotFound).not.toHaveBeenCalled();
    });

    it('triggers notFound() in generateMetadata for invalid category slug (eliminates soft 404)', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'absolute-nonsense-category' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('triggers 308 permanentRedirect for unnormalized category alias (one-hop consolidation)', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      await expect(
        generateMetadata({
          params: Promise.resolve({ slug: 'Personal-Care' }),
          searchParams: Promise.resolve({ sort: 'price' }),
        }),
      ).rejects.toThrow('NEXT_REDIRECT;replace;/category/personal-care?sort=price;308;');

      expect(mockPermanentRedirect).toHaveBeenCalledWith('/category/personal-care?sort=price');
    });

    it('emits noindex,follow on filtered category views while preserving clean canonical', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({ sort: 'price-asc', q: 'soap' }),
      });

      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/personal-care');
    });

    it('triggers notFound() in CategorySlugPage component for nonexistent category', async () => {
      const CategorySlugPage = (await import('../../(english)/category/[slug]/page')).default;
      await expect(
        CategorySlugPage({
          params: Promise.resolve({ slug: 'completely-bogus-category' }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalled();
    });

    it('CRITICAL REGRESSION TEST: valid leaf category queries products by categoryId and renders them', async () => {
      const CategorySlugPage = (await import('../../(english)/category/[slug]/page')).default;
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
      const CategorySlugPage = (await import('../../(english)/category/[slug]/page')).default;
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

    it('redirects Bengali ampersand aliases without dropping the locale prefix', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/bn/category/tea-&-coffee');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe(
        'https://www.luckystore1947.com/bn/category/tea-and-coffee',
      );
    });

    it('coalesces concurrent category route validation into one upstream fetch', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(JSON.stringify([{ slug: 'fresh-market', name: 'Fresh Market' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const { middleware, _resetCategorySlugCacheForTest } = await import('../../../middleware');
      _resetCategorySlugCacheForTest();
      try {
        const responses = await Promise.all(
          Array.from({ length: 20 }, (_, index) =>
            middleware(new NextRequest(
              `https://www.luckystore1947.com/${index % 2 === 0 ? '' : 'bn/'}category/fresh-market`,
            )),
          ),
        );

        expect(responses.every((response) => response.status !== 404)).toBe(true);
        const categoryFetches = fetchSpy.mock.calls.filter(([input]) =>
          new URL(String(input)).pathname === '/rest/v1/categories',
        );
        expect(categoryFetches).toHaveLength(1);
      } finally {
        _resetCategorySlugCacheForTest();
        fetchSpy.mockRestore();
        if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });

    it('returns a real 404 before session handling for unknown category slugs', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      try {
        const { middleware } = await import('../../../middleware');

        for (const pathname of [
          '/category/definitely-unknown-category',
          '/bn/category/definitely-unknown-category',
        ]) {
          const res = await middleware(new NextRequest(`https://www.luckystore1947.com${pathname}`));
          expect(res.status).toBe(404);
          expect(res.headers.get('x-robots-tag')).toBe('noindex');
        }

        expect(mockUpdateSession).not.toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });

    it('resolves empty-name product prefixes with uuid range filters, not LIKE', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = new URL(String(input));
        const idFilters = url.searchParams.getAll('id');
        const hasValidRange =
          idFilters.includes('gte.029b62d8-0000-0000-0000-000000000000') &&
          idFilters.includes('lt.029b62d9-0000-0000-0000-000000000000');

        return new Response(
          JSON.stringify(
            hasValidRange
              ? [{ id: '029b62d8-1111-2222-3333-444455556666', name: 'Radhuni Holud Gura 100gm' }]
              : [],
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      try {
        const { middleware } = await import('../../../middleware');
        const res = await middleware(
          new NextRequest('https://www.luckystore1947.com/product/--029b62d8'),
        );

        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe(
          'https://www.luckystore1947.com/product/radhuni-holud-gura-100gm--029b62d8',
        );

        const resTriple = await middleware(
          new NextRequest('https://www.luckystore1947.com/bn/product/---029b62d8'),
        );
        expect(resTriple.status).toBe(308);
        expect(resTriple.headers.get('location')).toBe(
          'https://www.luckystore1947.com/bn/product/radhuni-holud-gura-100gm--029b62d8',
        );

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        for (const call of fetchSpy.mock.calls) {
          const requested = new URL(String(call[0]));
          const idFilters = requested.searchParams.getAll('id');
          expect(idFilters).toContain('gte.029b62d8-0000-0000-0000-000000000000');
          expect(idFilters).toContain('lt.029b62d9-0000-0000-0000-000000000000');
          expect(idFilters.some((value) => value.startsWith('like.'))).toBe(false);
        }
      } finally {
        fetchSpy.mockRestore();
        if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });

    it('returns a real 404 before session handling for unresolvable product UUID and prefix URLs', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      try {
        const { middleware } = await import('../../../middleware');

        for (const pathname of [
          '/product/--deadbeef',
          '/product/---deadbeef',
          '/bn/product/--deadbeef',
          '/bn/product/---deadbeef',
          '/product/deadbeef-0000-4000-8000-000000000000',
          '/bn/product/deadbeef-0000-4000-8000-000000000000',
        ]) {
          const res = await middleware(new NextRequest(`https://www.luckystore1947.com${pathname}`));
          expect(res.status).toBe(404);
          expect(res.headers.get('x-robots-tag')).toBe('noindex');
        }

        expect(mockUpdateSession).not.toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });

    it('fails open to session handling when category validation upstream errors', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('upstream error', { status: 503 }),
      );

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      try {
        const { middleware, _resetCategorySlugCacheForTest } = await import('../../../middleware');
        _resetCategorySlugCacheForTest();
        const res = await middleware(
          new NextRequest('https://www.luckystore1947.com/category/db-only-category'),
        );

        expect(res.status).not.toBe(404);
        expect(mockUpdateSession).not.toHaveBeenCalled();
        expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      } finally {
        fetchSpy.mockRestore();
        if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
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
      expect(getCanonicalCategorySlug('ice-creams')).toBe('ice-cream');
      expect(getCanonicalCategorySlug('rice-and-grain')).toBe('rice-and-grain');
      expect(getCanonicalCategorySlug('Rice & Grains')).toBe('rice-and-grain');
      expect(getCanonicalCategorySlug('dairy')).toBe('dairy-and-eggs');
      expect(getCanonicalCategorySlug('Dairy')).toBe('dairy-and-eggs');
      expect(getCanonicalCategorySlug('pantry')).toBe('cooking-essentials');
      expect(getCanonicalCategorySlug('Pantry')).toBe('cooking-essentials');
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
    it('gives the English homepage a local title and date-grounded delivery snippet', async () => {
      const { metadata } = await import('../../(english)/page');
      const { DELIVERY_POLICY } = await import('../deliveryData');
      expect((metadata.title as any)?.absolute).toBe(
        'Lucky Store | Online Grocery in Chawkbazar, Chattogram',
      );
      expect((metadata.title as any)?.absolute).toContain('Chattogram');
      expect(metadata.description).toContain(DELIVERY_POLICY.shortLocation);
      expect(metadata.description).toContain(String(DELIVERY_POLICY.establishedYear));
      expect(metadata.description).toContain(DELIVERY_POLICY.deliveryHours.display);
      expect(metadata.description).toContain(DELIVERY_POLICY.paymentMethods.cod.replace(/ \(COD\)$/, ''));
      expect(metadata.description).toContain(DELIVERY_POLICY.paymentMethods.bkash.split(' (')[0]);
      expect(metadata.description).toContain('after doorstep inspection');
      expect((metadata.openGraph as any)?.url).toBe('https://www.luckystore1947.com/');
      expect((metadata.twitter as any)?.title).toBe((metadata.title as any)?.absolute);
    });

    it('provides clean entity-level Homepage root metadata without product stuffing', async () => {
      const { metadata } = await import('../../RootLayoutDocument');
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
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
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
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
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
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
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
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
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

    it('generates specific ice cream category metadata with the canonical www URL', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'ice-cream' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toEqual({ absolute: 'Ice Cream in Chittagong | Lucky Store' });
      expect(meta.description).toContain('ice cream tubs, cones and popsicles');
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/ice-cream');
    });

    it('falls back to factual metadata for non-money category without delivery speed claims', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'personal-care' }),
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('Personal Care in Chittagong');
      expect(meta.description).toBe(
        'Shop Personal Care online at Lucky Store in Chattogram. Browse current prices and order for local delivery with Cash on Delivery and doorstep inspection.',
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

    it('permanently redirects skin-care alias to /category/personal-care in middleware with HTTP 308', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category/skin-care');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/category/personal-care');
    });

    it('permanently redirects chips-and-pretzels alias to /category/snacks in middleware with HTTP 308', async () => {
      const { middleware } = await import('../../../middleware');
      const req = new NextRequest('https://www.luckystore1947.com/category/chips-and-pretzels');
      const res = await middleware(req);

      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/category/snacks');
    });

    it('permanently redirects plural ice-creams routes to the singular canonical category in both locales', async () => {
      const { middleware } = await import('../../../middleware');
      for (const [path, target] of [
        ['/category/ice-creams', 'https://www.luckystore1947.com/category/ice-cream'],
        ['/bn/category/ice-creams', 'https://www.luckystore1947.com/bn/category/ice-cream'],
      ]) {
        const res = await middleware(new NextRequest(`https://www.luckystore1947.com${path}`));
        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe(target);
      }
    });

    it('preserves clean parent canonical and adds noindex,follow on filtered category queries', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'rice-and-grain' }),
        searchParams: Promise.resolve({ sort: 'price_asc', brand: 'teer' }),
      });

      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe('https://www.luckystore1947.com/category/rice-and-grain');
    });

    it('rejects unverified promotional claims across all money metadata entries', async () => {
      const { generateMetadata } = await import('../../(english)/category/[slug]/page');
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
      const { generateMetadata, default: CategoryPage } = await import('../../(english)/category/[slug]/page');

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
