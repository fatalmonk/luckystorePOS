const BLOG_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSlugs: Set<string> | null = null;
let cacheExpiresAt = 0;
let refresh: Promise<Set<string> | null> | null = null;

export function resetBlogSlugCacheForTest() {
  cachedSlugs = null;
  cacheExpiresAt = 0;
  refresh = null;
}

async function fetchBlogSlugs(endpoint: URL, apiKey: string): Promise<Set<string> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.json();
    const posts = body?.posts;
    if (!Array.isArray(posts)) return null;
    return new Set(
      posts
        .map((post: { slug?: unknown }) => (typeof post?.slug === 'string' ? post.slug : ''))
        .filter(Boolean),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadBlogSlugs(): Promise<Set<string> | null> {
  const apiKey = process.env.NOTFAIR_SEO_API_KEY;
  if (!apiKey) return null;
  let endpoint: URL;
  try {
    endpoint = new URL(process.env.NOTFAIR_SEO_API_URL ?? 'https://notfair.co/api/seo/content');
  } catch {
    return null;
  }
  if (endpoint.protocol !== 'https:') return null;

  const now = Date.now();
  if (cachedSlugs && now < cacheExpiresAt) return cachedSlugs;
  if (!refresh) {
    refresh = fetchBlogSlugs(endpoint, apiKey).then((slugs) => {
      if (slugs) {
        cachedSlugs = slugs;
        cacheExpiresAt = Date.now() + BLOG_CACHE_TTL_MS;
      }
      return slugs;
    }).finally(() => {
      refresh = null;
    });
  }
  const fresh = await refresh;
  return fresh ?? cachedSlugs;
}

/** Returns missing only when the blog index was fetched and does not contain the slug. */
export async function resolveBlogSlug(slug: string): Promise<'found' | 'missing' | 'unknown'> {
  const slugs = await loadBlogSlugs();
  if (!slugs) return 'unknown';
  return slugs.has(slug) ? 'found' : 'missing';
}
