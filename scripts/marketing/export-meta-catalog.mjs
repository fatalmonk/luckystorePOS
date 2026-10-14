/**
 * Lucky Store -> Meta Commerce Manager CSV feed.
 * Source: the same public storefront catalogue projection used by shoppers.
 * Run: node scripts/marketing/export-meta-catalog.mjs
 * Optional: META_FEED_OUTPUT=dist/meta/catalog.csv META_FEED_MIN_ITEMS=1
 * Never put a service-role key or private inventory data in a public feed.
 */
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const origin = new URL(process.env.META_STOREFRONT_ORIGIN || 'https://www.luckystore1947.com');
if (origin.protocol !== 'https:') throw new Error('Storefront origin must be HTTPS');
const output = process.env.META_FEED_OUTPUT || 'dist/meta/catalog.csv';
const minItems = Number(process.env.META_FEED_MIN_ITEMS || 1);
if (!Number.isSafeInteger(minItems) || minItems < 1) throw new Error('Invalid META_FEED_MIN_ITEMS');
const csv = (value) => '"' + String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';
const slug = (name, id) => {
  const part = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-{2,}/g, '-').slice(0, 60);
  return part + '--' + id.replace(/-/g, '').slice(0, 8);
};
const absoluteHttps = (value) => {
  try {
    const url = new URL(value, origin);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
};
const headers = ['id','title','description','availability','condition','price','link','image_link','brand','inventory'];
const rows = [];
const seen = new Set();
const limit = 100;
for (let offset = 0; ; offset += limit) {
  if (offset > 100000) throw new Error('Catalogue pagination safety limit exceeded');
  const url = new URL('/api/products', origin);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Storefront catalogue request failed: HTTP ' + response.status);
  const payload = await response.json();
  if (!Array.isArray(payload.products) || typeof payload.hasMore !== 'boolean') {
    throw new Error('Unexpected catalogue response; refusing to publish partial feed');
  }
  if (payload.hasMore && payload.products.length === 0) throw new Error('Broken catalogue pagination');
  for (const product of payload.products) {
    const id = String(product.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id) || seen.has(id)) continue;
    seen.add(id);
    const name = String(product.name || '').trim();
    const price = Number(product.price);
    const stock = Number(product.stock);
    const image = absoluteHttps(product.imageUrl || product.image_url);
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock <= 0 || !image) continue;
    const link = new URL('/product/' + slug(name, id), origin).href;
    rows.push([id, name, product.description || name, 'in stock', 'new',
      price.toFixed(2) + ' BDT', link, image, product.brand || 'Lucky Store', Math.floor(stock)]);
  }
  if (!payload.hasMore) break;
}
if (rows.length < minItems) throw new Error('Only ' + rows.length + ' eligible products; feed not replaced');
const text = [headers, ...rows].map(row => row.map(csv).join(',')).join('\r\n') + '\r\n';
await mkdir(dirname(output), { recursive: true });
const temporary = output + '.tmp';
await writeFile(temporary, text, { mode: 0o600 });
await rename(temporary, output);
console.log('Meta feed generated: ' + rows.length + ' in-stock products -> ' + output);
