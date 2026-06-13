import 'dotenv/config';

const GRAPH_VERSION = 'v18.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface PostOptions {
  message?: string;
  link?: string;
  photoUrl?: string;
  videoUrl?: string;
}

export interface PostResult {
  id: string;
}

export function getClient(pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN): { pageId: string; token: string } {
  const token = pageAccessToken || '';
  const pageId = process.env.FACEBOOK_PAGE_ID || '';
  if (!token) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN not set');
  if (!pageId) throw new Error('FACEBOOK_PAGE_ID not set');
  return { pageId, token };
}

export async function postToPage(options: PostOptions, pageAccessToken?: string): Promise<PostResult> {
  const { pageId, token } = getClient(pageAccessToken);

  const body = new URLSearchParams();
  if (options.message) body.set('message', options.message);
  if (options.link) body.set('link', options.link);

  let endpoint = `${GRAPH_BASE}/${pageId}/feed`;
  if (options.photoUrl) {
    endpoint = `${GRAPH_BASE}/${pageId}/photos`;
    body.set('url', options.photoUrl);
    if (!options.message) body.set('caption', options.message || '');
  }
  if (options.videoUrl) {
    endpoint = `${GRAPH_BASE}/${pageId}/videos`;
    body.set('file_url', options.videoUrl);
    if (!options.message) body.set('description', options.message || '');
  }

  body.set('access_token', token);

  const res = await fetch(endpoint, { method: 'POST', body });
  const data = await res.json();
  if (!res.ok) throw new Error(`Facebook API error: ${res.status} ${JSON.stringify(data)}`);
  return data as PostResult;
}

export async function getPageInfo(pageAccessToken?: string): Promise<{ id: string; name: string }> {
  const { pageId, token } = getClient(pageAccessToken);
  const res = await fetch(`${GRAPH_BASE}/${pageId}?fields=id,name&access_token=${token}`);
  const data = (await res.json()) as { id: string; name: string };
  if (!res.ok) throw new Error(`Facebook API error: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const message = process.argv[2] || 'Hello from Lucky Store!';
  postToPage({ message })
    .then((r) => console.log(`Posted: ${r.id}`))
    .catch((e) => { console.error(e); process.exit(1); });
}
