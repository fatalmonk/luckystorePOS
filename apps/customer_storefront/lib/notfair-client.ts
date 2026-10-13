import 'server-only';
import { z } from 'zod';
import type { SeoFetchOptions, SeoPost, SeoPostSummary } from 'notfair-nextjs-blog';

const summarySchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  slug: z.string().min(1),
  meta_description: z.string().nullable(),
  tags: z.array(z.string()),
  image_url: z.string().url(),
  reading_time_minutes: z.number().nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
});
const indexSchema = z.object({ posts: z.array(summarySchema) });
const detailSchema = z.object({ post: summarySchema.extend({ content_html: z.string() }).nullable() });

// SDK v0.4.1 collapses HTTP and JSON failures into empty/missing content.
// Keep its UI and types, but distinguish failures at the HTTP boundary here.
async function contentFetch(slug: string | undefined, opts: SeoFetchOptions): Promise<Response> {
  const key = process.env.NOTFAIR_SEO_API_KEY;
  if (!key) throw new Error('NotFair: NOTFAIR_SEO_API_KEY is not set');
  const base = process.env.NOTFAIR_SEO_API_URL ?? 'https://notfair.co/api/seo/content';
  const url = new URL(base);
  if (slug !== undefined) url.searchParams.set('slug', slug);
  return fetch(url.toString(), {
    headers: { authorization: `Bearer ${key}` },
    next: { revalidate: opts.revalidate ?? 3600 },
  });
}

async function readBody(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`NotFair: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    // Do not expose remote bodies, URLs or credentials in error messages.
    throw new Error('NotFair: invalid JSON response');
  }
}

export async function getSeoPosts(opts: SeoFetchOptions = {}): Promise<SeoPostSummary[]> {
  const parsed = indexSchema.safeParse(await readBody(await contentFetch(undefined, opts)));
  if (!parsed.success) throw new Error('NotFair: invalid index response');
  return parsed.data.posts;
}

export async function getSeoPost(slug: string, opts: SeoFetchOptions = {}): Promise<SeoPost | null> {
  const response = await contentFetch(slug, opts);
  if (response.status === 404) return null;
  const parsed = detailSchema.safeParse(await readBody(response));
  if (!parsed.success) throw new Error('NotFair: invalid article response');
  return parsed.data.post;
}
