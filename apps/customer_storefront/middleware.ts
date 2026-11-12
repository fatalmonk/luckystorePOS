import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './app/lib/supabase/middleware';
import { getCanonicalCategorySlug, isCategoryGroup, normalizeCategorySlug } from './app/lib/types';
import { isBareUuid, normalizeProductSlug, toProductSlug, uuidPrefixRange } from './app/lib/products/slugify';
import { BUYING_GUIDES } from './app/lib/buying-guides/registry';
import { isPublicGuideSlug } from './app/lib/buying-guides/publication';
import { getBrandBySlug } from './app/lib/brandsData';
import { resetBlogSlugCacheForTest, resolveBlogSlug } from './app/lib/blogSlugCache';
import {
  applySecurityHeaders,
  isPrivateStorefrontPath,
  isPublicCatalogPath,
  PRIVATE_CACHE_CONTROL,
  PUBLIC_CATALOG_CACHE_CONTROL,
} from './security-headers.cjs';

type CanonicalProduct = { id: string; name: string };
type ProductLookup =
  | { status: 'found'; product: CanonicalProduct }
  | { status: 'missing' }
  | { status: 'unknown' };

function getAcceptPreferences(accept: string) {
  const accepted = accept
    .toLowerCase()
    .split(',')
    .map((entry) => {
      const [mediaType = '', ...parameters] = entry.trim().split(';');
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      return { mediaType: mediaType.trim(), quality: Number.isFinite(quality) ? quality : 0 };
    });

  const preferenceFor = (target: string) => {
    const [type] = target.split('/');
    const ranges = [
      { mediaType: target, specificity: 2 },
      { mediaType: `${type}/*`, specificity: 1 },
      { mediaType: '*/*', specificity: 0 },
    ];
    for (const range of ranges) {
      const match = accepted.find((entry) => entry.mediaType === range.mediaType);
      if (match) return { quality: match.quality, specificity: range.specificity };
    }
    return { quality: 0, specificity: -1 };
  };

  return {
    markdown: preferenceFor('text/markdown'),
    html: preferenceFor('text/html'),
  };
}

function notFoundResponse() {
  const response = new NextResponse('Not Found', {
    status: 404,
    headers: {
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, max-age=300',
    },
  });
  applySecurityHeaders(response.headers);
  return response;
}

function redirectResponse(url: URL | string, status: 301 | 308) {
  const response = NextResponse.redirect(url, status);
  applySecurityHeaders(response.headers);
  return response;
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
}

async function updateSessionIfConfigured(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export { resetBlogSlugCacheForTest as _resetBlogSlugCacheForTest };

async function resolveProductForCanonicalRedirect(identifier: string): Promise<ProductLookup> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return { status: 'unknown' };

  const restHeaders = {
    apikey: supabaseAnonKey,
    authorization: `Bearer ${supabaseAnonKey}`,
  };

  // Bound this extra pre-session lookup so named canonical routes can fail open.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const itemUrl = new URL('/rest/v1/items', supabaseUrl);
    itemUrl.searchParams.set('select', 'id,name');
    itemUrl.searchParams.set('is_active', 'eq.true');

    if (isBareUuid(identifier)) {
      itemUrl.searchParams.set('id', `eq.${identifier}`);
      itemUrl.searchParams.set('limit', '1');
    } else {
      // uuid columns reject LIKE; bound the first UUID group with gte/lt instead.
      const range = uuidPrefixRange(identifier);
      if (!range) return { status: 'unknown' };
      itemUrl.searchParams.append('id', `gte.${range.gte}`);
      if (range.lt) itemUrl.searchParams.append('id', `lt.${range.lt}`);
      itemUrl.searchParams.set('limit', '2');
    }

    const itemResponse = await fetch(itemUrl, {
      headers: restHeaders,
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!itemResponse.ok) return { status: 'unknown' };

    const rows = await itemResponse.json();
    if (!Array.isArray(rows)) return { status: 'unknown' };

    const prefix = identifier.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    const matches = isBareUuid(identifier)
      ? rows.filter((row) => typeof row?.id === 'string' && row.id.toLowerCase() === identifier.toLowerCase())
      : rows.filter(
          (row) =>
            typeof row?.id === 'string' &&
            row.id.replace(/-/g, '').toLowerCase().startsWith(prefix),
        );

    if (matches.length === 1) {
      const id = matches[0]?.id;
      const name = matches[0]?.name;
      if (typeof id === 'string' && isBareUuid(id) && typeof name === 'string' && name.trim()) {
        return { status: 'found', product: { id, name: name.trim() } };
      }
      return { status: 'unknown' };
    }
    return rows.length === 0 ? { status: 'missing' } : { status: 'unknown' };
  } catch (error) {
    console.error('Failed to resolve product canonical redirect', { identifier, error });
    return { status: 'unknown' };
  } finally {
    clearTimeout(timeout);
  }
}

// Module-scope category slug cache. Middleware module state persists across requests
// within the same edge worker instance; a 5-minute TTL keeps slugs fresh while
// eliminating a no-store Supabase round-trip on every /category/<slug> request.
// Cache stores the full set of normalized slugs so any slug can be validated without
// re-fetching. On miss or expiry the cache is rebuilt in one fetch, not per slug.
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
let _categorySlugsCache: Set<string> | null = null;
let _categoryCacheExpiresAt = 0;
let _categorySlugsRefresh: Promise<Set<string> | null> | null = null;

/** Reset the in-memory category slug cache. Exported for use in tests only. */
export function _resetCategorySlugCacheForTest() {
  _categorySlugsCache = null;
  _categoryCacheExpiresAt = 0;
  _categorySlugsRefresh = null;
}

async function fetchCategorySlugSet(supabaseUrl: string, supabaseAnonKey: string): Promise<Set<string> | null> {
  try {
    const categoriesUrl = new URL('/rest/v1/categories', supabaseUrl);
    categoriesUrl.searchParams.set('select', 'slug,name');
    categoriesUrl.searchParams.set('active', 'eq.true');

    const response = await fetch(categoriesUrl, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const rows = await response.json();
    if (!Array.isArray(rows)) return null;

    return new Set(rows.map((row: unknown) =>
      normalizeCategorySlug(
        (row as Record<string, unknown>)?.slug as string ??
        (row as Record<string, unknown>)?.name as string ??
        '',
      ),
    ));
  } catch (error) {
    console.error('Failed to fetch category slugs for cache', { error });
    return null;
  }
}

async function isKnownCategorySlug(slug: string): Promise<boolean> {
  // Covers group roots and static subcategory taxonomy without a network round-trip.
  if (isCategoryGroup(slug)) return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Without env, cannot prove the slug exists; keep fail-closed so unknown routes 404 in tests/misconfig.
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const now = Date.now();
  if (_categorySlugsRefresh !== null || now >= _categoryCacheExpiresAt) {
    if (_categorySlugsRefresh === null) {
      // Set the next retry time before starting the fetch so an upstream failure
      // cannot make every request retry continuously. Existing stale data remains usable.
      _categoryCacheExpiresAt = now + CATEGORY_CACHE_TTL_MS;
      _categorySlugsRefresh = fetchCategorySlugSet(supabaseUrl, supabaseAnonKey).then((fresh) => {
        if (fresh !== null) {
          _categorySlugsCache = fresh;
          _categoryCacheExpiresAt = Date.now() + CATEGORY_CACHE_TTL_MS;
        }
        return fresh;
      }).finally(() => {
        _categorySlugsRefresh = null;
      });
    }
    await _categorySlugsRefresh;

    // On fetch failure with no prior cache, fail open so live category pages stay available.
    // With a stale cache, serve the stale set rather than failing open for unknown slugs.
    if (_categorySlugsCache === null) return true;
  }

  const cachedSlugs = _categorySlugsCache;
  return cachedSlugs?.has(slug) ?? true;
}

/**
 * Middleware for Markdown-for-Agents content negotiation.
 *
 * When an AI agent sends Accept: text/markdown, we rewrite the request
 * to /api/markdown?path=<original-path> which renders a markdown
 * representation of the page with Content-Type: text/markdown.
 *
 * HTML remains the default for requests without the markdown accept header.
 *
 * https://llmstxt.org/
 * https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 */

export async function middleware(request: NextRequest) {
  // Canonical Subdomain 301 Redirect: Consolidate blog.luckystore1947.com to https://www.luckystore1947.com/blog
  const host = request.headers.get('host') || request.nextUrl.hostname;
  if (/^blog\.luckystore1947\.com(?::\d+)?$/i.test(host)) {
    const pathname = request.nextUrl.pathname;
    const targetPath = pathname === '/blog' || pathname.startsWith('/blog/')
      ? pathname
      : `/blog${pathname === '/' ? '' : pathname}`;
    const targetUrl = new URL(targetPath, 'https://www.luckystore1947.com');
    targetUrl.search = request.nextUrl.search;
    return redirectResponse(targetUrl, 301);
  }

  // Reject unpublished/unknown guide routes before Next can stream a soft 404.
  if (request.nextUrl.pathname.startsWith('/best/')) {
    const slug = request.nextUrl.pathname.slice('/best/'.length).replace(/\/$/, '');
    if (slug !== 'editorial' && slug !== 'dealoftheweek' && !(await isPublicGuideSlug(slug, BUYING_GUIDES))) return notFoundResponse();
  }

  // Pre-session canonical redirect: consolidate raw UUID product URLs to human-readable slug URLs.
  // Google has indexed both /product/{uuid} and /product/{slug}--{prefix}; this must happen
  // before the product page can emit duplicate HTML.
  const productUuidMatch = request.nextUrl.pathname.match(/^\/(bn\/)?product\/([^/]+)\/?$/);
  if (productUuidMatch) {
    const localePrefix = productUuidMatch[1] ?? '';
    const rawProductSlug = productUuidMatch[2];
    let decodedProductSlug: string;
    try {
      decodedProductSlug = decodeURIComponent(rawProductSlug);
    } catch {
      return notFoundResponse();
    }

    // Encoded separators must not become a second path segment after decoding.
    if (/[\/\\\u0000-\u001f\u007f]/.test(decodedProductSlug)) return notFoundResponse();

    const isLegacyPrefixSlug = /^--+[0-9a-f]{8}$/i.test(decodedProductSlug);
    const isUuidAlias = isBareUuid(decodedProductSlug);
    const namedPrefix = normalizeProductSlug(rawProductSlug).match(/^.+--([0-9a-f]{8})$/i)?.[1];
    if (!isUuidAlias && !isLegacyPrefixSlug && !namedPrefix) {
      return notFoundResponse();
    }
    if (isUuidAlias || isLegacyPrefixSlug || namedPrefix) {
      const identifier = isUuidAlias
        ? decodedProductSlug.toLowerCase()
        : (namedPrefix ?? decodedProductSlug.replace(/^-+/, '')).toLowerCase();
      const lookup = await resolveProductForCanonicalRedirect(identifier);
      if (lookup.status === 'found') {
        const product = lookup.product;
        const canonicalPath = `/${localePrefix}product/${toProductSlug(product.name, product.id)}`;
        const url = request.nextUrl.clone();
        url.pathname = canonicalPath;
        if (/^(?:www\.)?luckystore1947\.com$/i.test(request.nextUrl.hostname)) {
          url.protocol = 'https:';
          url.hostname = 'www.luckystore1947.com';
          url.port = '';
        }
        if (request.nextUrl.pathname !== canonicalPath || url.origin !== request.nextUrl.origin) {
          const redirect = NextResponse.redirect(url, 308);
          applySecurityHeaders(redirect.headers);
          return redirect;
        }
      } else if (lookup.status === 'missing' || isUuidAlias || isLegacyPrefixSlug) {
        return notFoundResponse();
      }
      // Named routes stay available when the lookup is ambiguous or the upstream
      // request fails, so a transient error cannot 404 a canonical product.
    }
  }

  const brandPathMatch = request.nextUrl.pathname.match(/^\/(bn\/)?brand\/([^/]+)\/?$/);
  if (brandPathMatch) {
    let brandSlug: string;
    try {
      brandSlug = decodeURIComponent(brandPathMatch[2]);
    } catch {
      return notFoundResponse();
    }
    if (!getBrandBySlug(brandSlug)) return notFoundResponse();
  }

  const blogPathMatch = request.nextUrl.pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogPathMatch) {
    let blogSlug: string;
    try {
      blogSlug = decodeURIComponent(blogPathMatch[1]);
    } catch {
      return notFoundResponse();
    }
    if (/[\/\\\u0000-\u001f\u007f]/.test(blogSlug)) return notFoundResponse();
    const blog = await resolveBlogSlug(blogSlug);
    if (blog === 'missing') return notFoundResponse();
  }

  // Pre-session canonical redirect: consolidate delivery hub aliases to single authoritative hub
  // (e.g. /delivery/chattogram -> /delivery, /delivery/ -> /delivery)
  if (
    request.nextUrl.pathname === '/delivery/chattogram' ||
    request.nextUrl.pathname === '/delivery/'
  ) {
    const url = new URL('/delivery', request.url);
    url.search = request.nextUrl.search;
    return redirectResponse(url, 308);
  }

  // Pre-session canonical redirect: consolidate /category?cat=<slug> to /category/<slug>
  // Preserves legitimate non-cat query parameters (e.g. sort, q) in a single 308 hop
  if (request.nextUrl.pathname === '/category' && request.nextUrl.searchParams.has('cat')) {
    const rawCat = request.nextUrl.searchParams.get('cat')?.trim();
    if (rawCat) {
      const canonicalCat = getCanonicalCategorySlug(rawCat);
      const url = request.nextUrl.clone();
      url.pathname = canonicalCat ? `/category/${canonicalCat}` : '/category';
      url.searchParams.delete('cat');
      return redirectResponse(url, 308);
    }
  }

  // Pre-session canonical redirect for unnormalized or aliased category path slugs
  // (e.g. /category/Personal-Care -> /category/personal-care, /bn/category/tea-&-coffee -> /bn/category/tea-and-coffee)
  const categoryPathMatch = request.nextUrl.pathname.match(/^\/(bn\/)?category\/([^/]+)\/?$/);
  if (categoryPathMatch) {
    const localePrefix = categoryPathMatch[1] ?? '';
    const rawSlug = categoryPathMatch[2];
    let decoded: string;
    try {
      decoded = decodeURIComponent(rawSlug);
    } catch {
      return notFoundResponse();
    }

    const canonical = getCanonicalCategorySlug(decoded.toLowerCase());
    if (!canonical || !(await isKnownCategorySlug(canonical))) {
      return notFoundResponse();
    }

    if (rawSlug !== canonical) {
      const url = request.nextUrl.clone();
      url.pathname = `/${localePrefix}category/${canonical}`;
      return redirectResponse(url, 308);
    }
  }

  const pathname = request.nextUrl.pathname;
  const catalog = isPublicCatalogPath(pathname);
  const personalized = isPrivateStorefrontPath(pathname);
  const authed = hasSupabaseAuthCookie(request);
  const supabaseResponse = personalized || authed || !catalog
    ? await updateSessionIfConfigured(request)
    : NextResponse.next();
  applySecurityHeaders(supabaseResponse.headers);
  if (personalized || authed) {
    supabaseResponse.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
    supabaseResponse.headers.set('CDN-Cache-Control', 'private, no-store');
  } else if (catalog) {
    supabaseResponse.headers.set('Cache-Control', PUBLIC_CATALOG_CACHE_CONTROL);
    supabaseResponse.headers.set('CDN-Cache-Control', PUBLIC_CATALOG_CACHE_CONTROL);
  }

  const accept = request.headers.get('accept') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const acceptPreferences = getAcceptPreferences(accept);

  // AI bots that prefer structured markdown over heavy client JS
  const isKnownAiBot = /GPTBot|PerplexityBot|ClaudeBot|cohere-ai|OAI-SearchBot|Applebot-Extended/i.test(userAgent);

  // Check if client wants markdown via Accept header or AI User-Agent (when html isn't forced)
  const explicitlyRejectsMarkdown =
    acceptPreferences.markdown.specificity === 2 && acceptPreferences.markdown.quality === 0;
  const explicitlyAcceptsHtml =
    acceptPreferences.html.specificity === 2 && acceptPreferences.html.quality > 0;
  const hasMarkdownRange = acceptPreferences.markdown.specificity >= 0;
  const markdownPreferred = acceptPreferences.markdown.quality > acceptPreferences.html.quality ||
    (acceptPreferences.markdown.quality === acceptPreferences.html.quality &&
      acceptPreferences.markdown.specificity > acceptPreferences.html.specificity);
  const wantsMarkdown = !explicitlyRejectsMarkdown && (
    (acceptPreferences.markdown.quality > 0 && markdownPreferred) ||
    (isKnownAiBot && !explicitlyAcceptsHtml && (!hasMarkdownRange || acceptPreferences.markdown.quality > 0))
  );

  const originalPath = request.nextUrl.pathname;
  const isStaticTextDoc =
    originalPath === '/llms.txt' ||
    originalPath === '/llms-full.txt' ||
    originalPath.endsWith('.txt');

  // Best routes already deliver complete server-rendered HTML. The Markdown endpoint
  // has no best-page renderer; rewriting here would replace the content with generic navigation.
  const isBestContentPage =
    originalPath === '/best' ||
    originalPath.startsWith('/best/') ||
    originalPath === '/bn/best' ||
    originalPath.startsWith('/bn/best/');
  if (wantsMarkdown && !isStaticTextDoc && !isBestContentPage) {
    const search = request.nextUrl.search;

    // Rewrite to the markdown API route with original path as query param
    const url = request.nextUrl.clone();
    url.pathname = '/api/markdown';
    url.search = `?path=${encodeURIComponent(originalPath)}${search ? `&${search.slice(1)}` : ''}`;

    const rewriteResponse = NextResponse.rewrite(url);

    // Propagate headers/cookies from supabaseResponse
    supabaseResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value);
    });

    rewriteResponse.headers.set('Vary', 'Accept, User-Agent');
    rewriteResponse.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
    rewriteResponse.headers.set('CDN-Cache-Control', 'private, no-store');
    rewriteResponse.headers.set('x-lucky-negotiated', 'markdown');
    applySecurityHeaders(rewriteResponse.headers);
    return rewriteResponse;
  }

  supabaseResponse.headers.set('Vary', 'Accept');
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api|robots\\.txt|llms\\.txt|llms-full\\.txt|.*\\.txt$|sitemap|sitemap\\.xml|.*\\.webmanifest$|auth\\.md|.*\\.md$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|\\.well-known).*)',
  ],
};
