import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './app/lib/supabase/middleware';
import { getCanonicalCategorySlug, isCategoryGroup, normalizeCategorySlug } from './app/lib/types';
import { isBareUuid, toProductSlug, uuidPrefixRange } from './app/lib/products/slugify';

type CanonicalProduct = { id: string; name: string };

function notFoundResponse() {
  return new NextResponse('Not Found', {
    status: 404,
    headers: { 'X-Robots-Tag': 'noindex' },
  });
}

async function resolveProductForCanonicalRedirect(identifier: string): Promise<CanonicalProduct | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const restHeaders = {
    apikey: supabaseAnonKey,
    authorization: `Bearer ${supabaseAnonKey}`,
  };

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
      if (!range) return null;
      itemUrl.searchParams.append('id', `gte.${range.gte}`);
      if (range.lt) itemUrl.searchParams.append('id', `lt.${range.lt}`);
      itemUrl.searchParams.set('limit', '2');
    }

    const itemResponse = await fetch(itemUrl, {
      headers: restHeaders,
      cache: 'no-store',
    });

    if (!itemResponse.ok) return null;

    const rows = await itemResponse.json();
    if (!Array.isArray(rows)) return null;

    const prefix = identifier.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    const matches = isBareUuid(identifier)
      ? rows
      : rows.filter(
          (row) =>
            typeof row?.id === 'string' &&
            row.id.replace(/-/g, '').toLowerCase().startsWith(prefix),
        );

    if (matches.length !== 1) return null;

    const id = matches[0]?.id;
    const name = matches[0]?.name;
    return typeof id === 'string' && typeof name === 'string' && name.trim()
      ? { id, name: name.trim() }
      : null;
  } catch (error) {
    console.error('Failed to resolve product canonical redirect', { identifier, error });
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
    // Fail open on transient upstream errors so real category pages stay available.
    if (!response.ok) return true;

    const rows = await response.json();
    if (!Array.isArray(rows)) return true;

    return rows.some((row) =>
      normalizeCategorySlug(row?.slug ?? row?.name ?? '') === slug,
    );
  } catch (error) {
    console.error('Failed to validate category route', { slug, error });
    return true;
  }
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

    const isLegacyPrefixSlug = /^--+[0-9a-f]{8}$/i.test(decodedProductSlug);
    if (isBareUuid(decodedProductSlug) || isLegacyPrefixSlug) {
      const identifier = isLegacyPrefixSlug
        ? decodedProductSlug.replace(/^-+/, '').toLowerCase()
        : decodedProductSlug.toLowerCase();
      const product = await resolveProductForCanonicalRedirect(identifier);
      if (product) {
        const url = request.nextUrl.clone();
        url.pathname = `/${localePrefix}product/${toProductSlug(product.name, product.id)}`;
        return NextResponse.redirect(url, 308);
      }
      return notFoundResponse();
    }
  }

  // Pre-session canonical redirect: consolidate delivery hub aliases to single authoritative hub
  // (e.g. /delivery/chattogram -> /delivery, /delivery/ -> /delivery)
  if (
    request.nextUrl.pathname === '/delivery/chattogram' ||
    request.nextUrl.pathname === '/delivery/'
  ) {
    const url = new URL('/delivery', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
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
      return NextResponse.redirect(url, 308);
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
      return NextResponse.redirect(url, 308);
    }
  }

  const supabaseResponse = await updateSession(request);

  const accept = request.headers.get('accept') || '';
  const userAgent = request.headers.get('user-agent') || '';

  // AI bots that prefer structured markdown over heavy client JS
  const isKnownAiBot = /GPTBot|PerplexityBot|ClaudeBot|cohere-ai|OAI-SearchBot|Applebot-Extended/i.test(userAgent);

  // Check if client wants markdown via Accept header or AI User-Agent (when html isn't forced)
  const wantsMarkdown =
    (accept.includes('text/markdown') && !accept.includes('text/html')) ||
    (isKnownAiBot && !accept.includes('text/html'));

  if (wantsMarkdown) {
    const originalPath = request.nextUrl.pathname;
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

    rewriteResponse.headers.set('Vary', 'Accept');
    return rewriteResponse;
  }

  supabaseResponse.headers.set('Vary', 'Accept');
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api|robots\\.txt|sitemap|sitemap\\.xml|site\\.webmanifest|auth\\.md|.*\\.md$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|\\.well-known).*)',
  ],
};
