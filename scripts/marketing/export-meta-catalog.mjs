/**
 * Lucky Store -> Meta Commerce Manager CSV feed.
 * Source: the same public storefront catalogue projection used by shoppers.
 * Run: node scripts/marketing/export-meta-catalog.mjs
 * Required: META_FEED_MIN_ITEMS=<verified floor> and
 * META_FEED_ALLOWED_CATEGORIES=<comma-separated policy-reviewed category names>.
 * The storefront API must include canonical productPath. Deploy it before running this exporter.
 * Never put a service-role key or private inventory data in a public feed.
 */
import { mkdir, writeFile, rename, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

const origin = new URL(process.env.META_STOREFRONT_ORIGIN || 'https://www.luckystore1947.com');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
  throw new Error('Storefront origin must be an HTTPS origin without credentials or path');
}
const output = process.env.META_FEED_OUTPUT || 'dist/meta/catalog.csv';
const minItems = Number(process.env.META_FEED_MIN_ITEMS);
if (!Number.isSafeInteger(minItems) || minItems < 1) throw new Error('Set a verified META_FEED_MIN_ITEMS floor');
const allowedCategories = new Set((process.env.META_FEED_ALLOWED_CATEGORIES || '')
  .split(',').map(category => category.trim()).filter(Boolean));
if (!allowedCategories.size) throw new Error('Set policy-reviewed META_FEED_ALLOWED_CATEGORIES');
const csv = (value) => '"' + String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';
const absoluteHttps = (value) => {
  try {
    const url = new URL(value, origin);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
};
const headers = ['id','title','description','availability','condition','price','link','image_link','brand','quantity_to_sell_on_facebook'];
const expectedPackPrices = new Map([
  ['b1a686a7-9f23-47bf-8d78-925af6888271', 8000],
  ['b54e03c0-3a1b-4818-a642-8520f907fca0', 2050],
  ['ada03d73-0741-457c-a62c-6f46e21e4e1a', 2300],
  ['439d9e4b-d7df-4705-87ab-ebb067f31065', 1750],
  ['b209f469-8869-4a36-8e73-cf2fdeb833d3', 2800],
]);
const unverifiedBrandIds = new Set([
  '84276fa4-e76e-4a56-9b2b-92c2b4ff81fd',
  'ada03d73-0741-457c-a62c-6f46e21e4e1a',
]);
const rows = [];
const seen = new Set();
const limit = 100;
let fetched = 0;
for (let offset = 0; ; offset += limit) {
  if (offset > 100000) throw new Error('Catalogue pagination safety limit exceeded');
  const url = new URL('/api/products', origin);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Storefront catalogue request failed: HTTP ' + response.status);
  const payload = await response.json();
  if (!Array.isArray(payload.products) || typeof payload.hasMore !== 'boolean'
      || payload.offset !== offset || payload.limit !== limit || payload.products.length > limit) {
    throw new Error('Unexpected catalogue response; refusing to publish partial feed');
  }
  if (payload.hasMore && payload.products.length !== limit) throw new Error('Broken catalogue pagination');
  fetched += payload.products.length;
  for (const product of payload.products) {
    const id = String(product.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id) || seen.has(id)) {
      throw new Error('Invalid or duplicate product ID; feed not replaced');
    }
    seen.add(id);
    if (!allowedCategories.has(product.category)) continue;
    if (unverifiedBrandIds.has(id)) continue;
    const name = String(product.name || '').trim();
    const price = Number(product.price);
    const stock = Number(product.stock);
    const image = absoluteHttps(product.imageUrl || product.image_url);
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(stock) || stock < 0 || !image) continue;
    if (expectedPackPrices.has(id) && price !== expectedPackPrices.get(id)) {
      throw new Error('Pack price differs from approved full-pack price for product ' + id + '; feed not replaced');
    }
    if (!/\.(jpe?g|png)$/i.test(new URL(image).pathname)) {
      throw new Error('Product image is not JPEG or PNG for product ' + id + '; feed not replaced');
    }
    const path = product.productPath;
    if (typeof path !== 'string' || !/^\/product\/[a-z0-9-]*--[a-f0-9]{8}$/.test(path)
        || !path.endsWith(id.replace(/-/g, '').slice(0, 8))) {
      throw new Error('Missing or invalid canonical productPath; deploy storefront API first');
    }
    const link = new URL(path, origin).href;
    rows.push([id, name, name, stock > 0 ? 'in stock' : 'out of stock', 'new',
      price.toFixed(2) + ' BDT', link, image, product.brand || 'Lucky Store', stock]);
  }
  if (!payload.hasMore) break;
}
if (rows.length < minItems) throw new Error('Only ' + rows.length + ' eligible products; feed not replaced');
for (let offset = 0; offset < rows.length; offset += 8) {
  await Promise.all(rows.slice(offset, offset + 8).map(async (row) => {
    const [id, , , , , , , image] = row;
    const response = await fetch(image, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Product image unavailable for ' + id + '; feed not replaced');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 8_000_000) throw new Error('Product image exceeds 8 MB for ' + id + '; feed not replaced');
    const metadata = await sharp(bytes).metadata();
    if (!['jpeg', 'png'].includes(metadata.format) || metadata.width < 500 || metadata.height < 500) {
      throw new Error('Product image format or dimensions invalid for ' + id + '; feed not replaced');
    }
  }));
}
let previousCount = 0;
try {
  const previous = await readFile(output, 'utf8');
  const lines = previous.trimEnd().split('\r\n');
  if (lines[0] !== headers.map(csv).join(',')) {
    throw new Error('Existing feed has an unexpected header or line ending; refusing replacement');
  }
  previousCount = lines.length - 1;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (previousCount > 0 && rows.length < Math.ceil(previousCount * 0.9)) {
  throw new Error('Eligible products fell more than 10% from previous feed; investigate before replacement');
}
const text = [headers, ...rows].map(row => row.map(csv).join(',')).join('\r\n') + '\r\n';
await mkdir(dirname(output), { recursive: true });
const temporary = output + '.tmp';
try {
  await writeFile(temporary, text, { mode: 0o600 });
  await rename(temporary, output);
} catch (error) {
  await rm(temporary, { force: true });
  throw error;
}
console.log('Meta feed generated: ' + rows.length + ' eligible products from ' + fetched + ' catalogue products -> ' + output);
