import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeoPost } from 'notfair-nextjs-blog';

const api = vi.hoisted(() => ({ getSeoPosts: vi.fn(), getSeoPost: vi.fn() }));
vi.mock('notfair-nextjs-blog', () => api);
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
  const originalKey = process.env.NOTFAIR_SEO_API_KEY;

  beforeEach(() => {
    process.env.NOTFAIR_SEO_API_KEY = 'test-notfair-key';
    vi.clearAllMocks();
    api.getSeoPosts.mockResolvedValue([post]);
    api.getSeoPost.mockResolvedValue(post);
  });

  afterEach(() => {
    process.env.NOTFAIR_SEO_API_KEY = originalKey;
  });

  it('links index summaries to /blog/{slug} with the featured image', async () => {
    const html = renderToStaticMarkup(await BlogIndex());
    expect(html).toContain('href="/blog/test-article"');
    expect(html).toContain(encodeURIComponent(post.image_url));
    expect(html).toContain(post.meta_description);
    expect(api.getSeoPosts).toHaveBeenCalledOnce();
  });

  it('renders the hero before sanitized article content and preserves attribution', async () => {
    const html = renderToStaticMarkup(await BlogPost({ params: Promise.resolve({ slug: post.slug }) }));
    expect(api.getSeoPost).toHaveBeenCalledWith(post.slug);
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
    api.getSeoPost.mockResolvedValue(null);
    await expect(BlogPost({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow('NOT_FOUND');
    expect(api.getSeoPost).toHaveBeenCalledWith('missing');
  });
});
