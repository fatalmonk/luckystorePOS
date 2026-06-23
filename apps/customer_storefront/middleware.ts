import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for Markdown-for-Agents content negotiation.
 *
 * When an AI agent sends Accept: text/markdown, we set a request header
 * (x-requested-markdown) so downstream routes can optionally serve markdown.
 * We also set Vary: Accept on responses to enable proper caching.
 *
 * Link headers for agent discovery are added in next.config.js headers().
 */

export function middleware(request: NextRequest) {
  const accept = request.headers.get('accept') || '';
  const wantsMarkdown = accept.includes('text/markdown');

  // Clone request headers and add a flag for downstream routes
  const requestHeaders = new Headers(request.headers);
  if (wantsMarkdown) {
    requestHeaders.set('x-requested-markdown', 'true');
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Tell caches that response varies by Accept header
  if (wantsMarkdown) {
    response.headers.set('Vary', 'Accept');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and well-known JSON/MD files
     * (which have their own content types).
     */
    '/((?!_next/static|_next/image|favicon|icon|opengraph|twitter|logo|apple|robots\\.txt|sitemap|\\.well-known|auth\\.md).*)',
  ],
};