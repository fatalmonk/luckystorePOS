import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './app/lib/supabase/middleware';
import { getCanonicalCategorySlug } from './app/lib/types';
import { isBareUuid, toProductSlug } from './app/lib/products/slugify';

const STOREFRONT_STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

async function resolveProductNameForCanonicalRedirect(productId: string): Promise<string | null> {
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
    itemUrl.searchParams.set('id', `eq.${productId}`);
    itemUrl.searchParams.set('is_active', 'eq.true');
    itemUrl.searchParams.set('limit', '1');

    const itemResponse = await fetch(itemUrl, {
      headers: restHeaders,
      cache: 'no-store',
    });

    if (itemResponse.ok) {
      const rows = await itemResponse.json();
      const name = Array.isArray(rows) ? rows[0]?.name : null;
      if (typeof name === 'string' && name.trim()) return name.trim();
    }

    const rpcResponse = await fetch(new URL('/rest/v1/rpc/search_items_pos', supabaseUrl), {
      method: 'POST',
      headers: {
        ...restHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        p_store_id: STOREFRONT_STORE_ID,
        p_query: '',
        p_category_id: null,
        p_limit: 1000,
        p_offset: 0,
      }),
      cache: 'no-store',
    });

    if (!rpcResponse.ok) return null;

    const rows = await rpcResponse.json();
    const match = Array.isArray(rows)
      ? rows.find((row: any) => String(row?.id ?? row?.item_id) === productId)
      : null;
    const name = match?.name;

    return typeof name === 'string' && name.trim() ? name.trim() : null;
  } catch (error) {
    console.error('Failed to resolve product UUID redirect', { productId, error });
    return null;
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
      return NextResponse.next();
    }

    if (isBareUuid(decodedProductSlug)) {
      const productName = await resolveProductNameForCanonicalRedirect(decodedProductSlug);
      if (productName) {
        const url = request.nextUrl.clone();
        url.pathname = `/${localePrefix}product/${toProductSlug(productName, decodedProductSlug)}`;
        return NextResponse.redirect(url, 308);
      }
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
  // (e.g. /category/Personal-Care -> /category/personal-care, /category/tea-coffee -> /category/tea-and-coffee)
  if (request.nextUrl.pathname.startsWith('/category/')) {
    const rawSlug = request.nextUrl.pathname.replace(/^\/category\//, '');
    if (rawSlug && !rawSlug.includes('/')) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(rawSlug);
      } catch {
        // Malformed percent-encoding (URIError): pass through to route handler which returns 404
        return NextResponse.next();
      }
      const canonical = getCanonicalCategorySlug(decoded);
      if (canonical && rawSlug !== canonical) {
        const url = request.nextUrl.clone();
        url.pathname = `/category/${canonical}`;
        return NextResponse.redirect(url, 308);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-lucky-pathname', request.nextUrl.pathname);
  const localizedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });
  const supabaseResponse = await updateSession(localizedRequest);

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
