import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './app/lib/supabase/middleware';

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
  const supabaseResponse = await updateSession(request);

  const accept = request.headers.get('accept') || '';

  // Check if the client explicitly wants markdown
  // Browsers send text/html,...*/*  — agents send text/markdown
  const wantsMarkdown =
    accept.includes('text/markdown') &&
    !accept.includes('text/html');

  if (wantsMarkdown) {
    const originalPath = request.nextUrl.pathname;
    const search = request.nextUrl.search;

    // Rewrite to the markdown API route with the original path as query param
    const url = request.nextUrl.clone();
    url.pathname = '/api/markdown';
    url.search = `?path=${encodeURIComponent(originalPath)}${search ? `&${search.slice(1)}` : ''}`;

    const rewriteResponse = NextResponse.rewrite(url);
    
    // Propagate headers/cookies from supabaseResponse
    supabaseResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value);
    });
    
    return rewriteResponse;
  }

  supabaseResponse.headers.set('Vary', 'Accept');
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets, API routes, and well-known
     * files (which have their own content types).
     */
    '/((?!_next/static|_next/image|api|favicon|icon|opengraph|twitter|logo|apple|robots\\.txt|sitemap|\\.well-known|auth\\.md).*)',
  ],
};