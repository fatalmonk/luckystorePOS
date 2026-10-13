import { getSeoPost, getSeoPosts } from './notfair-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const post = {
  id: 1, title: 'Fixture article', slug: 'fixture/article', image_url: 'https://notfair.co/api/seo/og?postId=1',
  meta_description: null, tags: [], reading_time_minutes: null, published_at: null,
  created_at: '2026-10-12T00:00:00Z', content_html: '<p>Fixture</p>',
};

describe('NotFair HTTP client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv('NOTFAIR_SEO_API_KEY', 'fixture-only-key');
    vi.stubEnv('NOTFAIR_SEO_API_URL', 'https://notfair.co/api/seo/content');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it.each([401, 403, 429, 500, 503])('rejects HTTP %s for both routes', async (status) => {
    fetchMock.mockImplementation(async () => new Response('upstream body must not be exposed', { status }));
    await expect(getSeoPost('fixture')).rejects.toThrow(`HTTP ${status}`);
    await expect(getSeoPosts()).rejects.toThrow(`HTTP ${status}`);
  });

  it('rejects invalid JSON for both routes', async () => {
    fetchMock.mockImplementation(async () => new Response('invalid JSON'));
    await expect(getSeoPost('fixture')).rejects.toThrow();
    await expect(getSeoPosts()).rejects.toThrow();
  });

  it.each([{}, { post: {} }, { post: false }])('rejects malformed post envelopes: %j', async (body) => {
    fetchMock.mockImplementation(async () => Response.json(body));
    await expect(getSeoPost('fixture')).rejects.toThrow();
  });

  it.each([{}, { posts: null }, { posts: [{}] }])('rejects malformed index envelopes: %j', async (body) => {
    fetchMock.mockImplementation(async () => Response.json(body));
    await expect(getSeoPosts()).rejects.toThrow();
  });

  it('throws on a missing key without fetching', async () => {
    vi.stubEnv('NOTFAIR_SEO_API_KEY', '');
    await expect(getSeoPost('fixture')).rejects.toThrow('NOTFAIR_SEO_API_KEY');
    await expect(getSeoPosts()).rejects.toThrow('NOTFAIR_SEO_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS URLs without fetching', async () => {
    vi.stubEnv('NOTFAIR_SEO_API_URL', 'http://insecure.example/api/seo/content');
    await expect(getSeoPost('fixture')).rejects.toThrow('Only HTTPS endpoints are allowed');
    await expect(getSeoPosts()).rejects.toThrow('Only HTTPS endpoints are allowed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates network failures', async () => {
    fetchMock.mockRejectedValue(new Error('Network timeout'));
    await expect(getSeoPost('fixture')).rejects.toThrow('Network timeout');
    await expect(getSeoPosts()).rejects.toThrow('Network timeout');
  });

  it('accepts a valid explicitly missing post', async () => {
    fetchMock.mockImplementation(async () => Response.json({ post: null }));
    await expect(getSeoPost('missing')).resolves.toBeNull();
  });

  it('accepts a detail 404 but rejects an index 404', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 404 }));
    await expect(getSeoPost('missing')).resolves.toBeNull();
    await expect(getSeoPosts()).rejects.toThrow('HTTP 404');
  });

  it('accepts a valid empty index', async () => {
    fetchMock.mockImplementation(async () => Response.json({ posts: [] }));
    await expect(getSeoPosts()).resolves.toEqual([]);
  });

  it('honors the server API override and requested cache interval', async () => {
    vi.stubEnv('NOTFAIR_SEO_API_URL', 'https://fixture.example/content?site=fixture');
    fetchMock.mockImplementation(async () => Response.json({ post }));
    await expect(getSeoPost(post.slug, { revalidate: 60 })).resolves.toEqual(post);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://fixture.example/content?site=fixture&slug=fixture%2Farticle',
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
  });

  it('returns validated posts and keeps server fetch caching and encoded slugs', async () => {
    fetchMock.mockImplementation(async () => Response.json({ post }));
    await expect(getSeoPost(post.slug)).resolves.toEqual(post);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://notfair.co/api/seo/content?slug=fixture%2Farticle',
      expect.objectContaining({ headers: { authorization: 'Bearer fixture-only-key' }, next: { revalidate: 3600 } }),
    );
    const { content_html: _html, ...summary } = post;
    fetchMock.mockImplementation(async () => Response.json({ posts: [summary] }));
    await expect(getSeoPosts()).resolves.toEqual([summary]);
  });
});
