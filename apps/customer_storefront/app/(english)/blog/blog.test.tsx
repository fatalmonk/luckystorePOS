import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeoPost } from 'notfair-nextjs-blog';

const fetchMock = vi.fn();
vi.mock('server-only', () => ({}));
// Normalize the SDK's explicit .js CJS import for Vitest's ESM runner.
vi.mock('next/image.js', async () => ({ default: (await import('next/image')).default }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

import BlogIndex from './page';
import BlogPost, { generateMetadata } from './[slug]/page';

// Fixture-only route verification; this does not certify a live NotFair post.
const post: SeoPost = {
  id: 1,
  slug: 'test-article',
  title: 'Test article',
  meta_description: 'Test description',
  tags: [],
  image_url: 'https://notfair.co/api/seo/image/test',
  reading_time_minutes: 3,
  published_at: '2026-10-12T00:00:00Z',
  created_at: '2026-10-12T00:00:00Z',
  content_html: '<h2 id="section">Article section</h2><ul><li>List item</li></ul><p class="nf-attribution">Article credit</p><script>alert(1)</script>',
};

describe('NotFair blog routes', () => {
  it('emits truthful and injection-safe BlogPosting structured data', async () => {
    const hostile = { ...post, title: '</script><script>injected()</script>' };
    fetchMock.mockImplementation(async () => Response.json({ post: hostile }));
    const html = renderToStaticMarkup(await BlogPost({ params: Promise.resolve({ slug: post.slug }) }));
    const json = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => match[1]).find(value => JSON.parse(value)['@type'] === 'BlogPosting');
    expect(json).toBeDefined();
    expect(json).not.toContain('<');
    expect(JSON.parse(json!)).toEqual({
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: hostile.title, image: post.image_url,
      url: 'https://www.luckystore1947.com/blog/test-article',
      mainEntityOfPage: 'https://www.luckystore1947.com/blog/test-article',
      datePublished: post.published_at,
    });
  });

  it.each([null, 'invalid', '2026-02-30T00:00:00Z'])('omits unsupported publication dates (%s)', async (published_at) => {
    fetchMock.mockImplementation(async () => Response.json({ post: { ...post, published_at } }));
    const html = renderToStaticMarkup(await BlogPost({ params: Promise.resolve({ slug: post.slug }) }));
    const json = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => match[1]).find(value => JSON.parse(value)['@type'] === 'BlogPosting');
    expect(json).toBeDefined();
    expect(JSON.parse(json!)).not.toHaveProperty('datePublished');
    expect(JSON.parse(json!)).not.toHaveProperty('dateModified');
    expect(JSON.parse(json!)).not.toHaveProperty('author');
  });

  beforeEach(() => {
    vi.stubEnv('NOTFAIR_SEO_API_KEY', 'test-notfair-key');
    vi.stubEnv('NOTFAIR_SEO_API_URL', 'https://notfair.co/api/seo/content');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => Response.json(
      url.includes('?slug=') ? { post } : { posts: [post] },
    ));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('links index summaries to /blog/{slug} with the featured image', async () => {
    const html = renderToStaticMarkup(await BlogIndex());
    expect(html).toContain('href="/blog/test-article"');
    expect(html).toContain(encodeURIComponent(post.image_url));
    expect(html).toContain(post.meta_description);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('renders empty index state when getSeoPosts resolves with zero posts', async () => {
    fetchMock.mockImplementation(async () => Response.json({ posts: [] }));
    const html = renderToStaticMarkup(await BlogIndex());
    expect(html).toContain('No articles have been published yet.');
  });

  it('propagates network errors on the index route', async () => {
    fetchMock.mockRejectedValue(new Error('Network timeout'));
    await expect(BlogIndex()).rejects.toThrow('Network timeout');
  });

  it('renders the hero before sanitized article content and preserves attribution', async () => {
    const html = renderToStaticMarkup(await BlogPost({ params: Promise.resolve({ slug: post.slug }) }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`?slug=${post.slug}`), expect.any(Object));
    const imageUrl = encodeURIComponent(post.image_url);
    expect(html).toContain(imageUrl);
    expect(html.indexOf(imageUrl)).toBeLessThan(html.indexOf('Article section'));
    expect(html).toContain('<h1');
    expect(html).toContain('id="section"');
    expect(html).toContain('<ul><li>List item</li></ul>');
    expect(html).toContain('class="nf-attribution"');
    expect(html).not.toContain('alert(1)');
  });

  it('uses per-post metadata and the existing www canonical host', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: post.slug }) });
    expect(metadata.title).toBe(post.title);
    expect(metadata.description).toBe(post.meta_description);
    expect(metadata.alternates?.canonical).toBe('https://www.luckystore1947.com/blog/test-article');
    expect(metadata.openGraph).toMatchObject({ type: 'article', images: [{ url: post.image_url }] });
  });

  it('returns notFound only after the NotFair lookup returns no post', async () => {
    fetchMock.mockImplementation(async () => Response.json({ post: null }));
    await expect(BlogPost({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NOT_FOUND');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('?slug=missing'), expect.any(Object));
  });

  it('preserves upstream HTTP errors on [slug] instead of converting to notFound', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 503 }));
    await expect(BlogPost({ params: Promise.resolve({ slug: 'test-article' }) })).rejects.toThrow('HTTP 503');
  });

  it('preserves upstream HTTP errors in generateMetadata instead of returning fallback title', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 500 }));
    await expect(generateMetadata({ params: Promise.resolve({ slug: 'test-article' }) })).rejects.toThrow('HTTP 500');
  });

  it('rejects a missing key on index, detail and metadata without issuing HTTP requests', async () => {
    vi.stubEnv('NOTFAIR_SEO_API_KEY', '');
    await expect(BlogIndex()).rejects.toThrow('NOTFAIR_SEO_API_KEY');
    await expect(BlogPost({ params: Promise.resolve({ slug: post.slug }) })).rejects.toThrow('NOTFAIR_SEO_API_KEY');
    await expect(generateMetadata({ params: Promise.resolve({ slug: post.slug }) })).rejects.toThrow('NOTFAIR_SEO_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not turn HTTP authentication errors into empty index content', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 401 }));
    await expect(BlogIndex()).rejects.toThrow('HTTP 401');
  });

  it('returns notFound for a detail 404 in both article rendering and metadata', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 404 }));
    await expect(BlogPost({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NOT_FOUND');
    await expect(generateMetadata({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NOT_FOUND');
  });
});
