import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const script = new URL('./export-meta-catalog.mjs', import.meta.url);
const id = '067da398-0000-4000-8000-000000000001';
const product = {
  id, name: 'Test Tea', price: 100, stock: 2, category: 'Tea & Coffee',
  imageUrl: 'https://images.luckystore1947.com/test.png',
  productPath: '/product/test-tea--067da398',
};

async function runFeed(pages, output, minimum = '1', imageBuffer) {
  const validImage = imageBuffer ?? await sharp({ create: { width: 600, height: 600, channels: 3, background: '#ffffff' } }).png().toBuffer();
  process.env.META_FEED_OUTPUT = output;
  process.env.META_FEED_MIN_ITEMS = minimum;
  process.env.META_FEED_ALLOWED_CATEGORIES = 'Tea & Coffee';
  process.env.META_STOREFRONT_ORIGIN = 'https://www.luckystore1947.com';
  globalThis.fetch = async url => {
    if (!new URL(url).pathname.startsWith('/api/products')) {
      return { ok: true, arrayBuffer: async () => validImage.buffer.slice(validImage.byteOffset, validImage.byteOffset + validImage.byteLength) };
    }
    const offset = Number(new URL(url).searchParams.get('offset'));
    const page = pages[offset];
    return { ok: true, json: async () => page };
  };
  await import(`${script.href}?run=${Math.random()}`);
}

// The exporter is a CLI script, so vary its module URL to isolate each run.
test('writes a valid quoted CSV only after a complete page', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    await runFeed({ 0: { products: [product], hasMore: false, offset: 0, limit: 100 } }, output);
    const text = await readFile(output, 'utf8');
    assert.match(text, /"Test Tea"/);
    assert.match(text, /"quantity_to_sell_on_facebook"/);
    assert.match(text, /"https:\/\/www\.luckystore1947\.com\/product\/test-tea--067da398"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects an undersized image before replacing the feed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    const smallImage = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#ffffff' } }).png().toBuffer();
    await assert.rejects(runFeed({ 0: { products: [product], hasMore: false, offset: 0, limit: 100 } }, output, '1', smallImage), /format or dimensions invalid/);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('includes zero-stock products as out of stock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    await runFeed({ 0: { products: [{ ...product, stock: 0 }], hasMore: false, offset: 0, limit: 100 } }, output);
    assert.match(await readFile(output, 'utf8'), /"out of stock"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects unsupported image formats before replacing the feed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    await assert.rejects(runFeed({ 0: { products: [{ ...product, imageUrl: 'https://example.com/test.webp' }], hasMore: false, offset: 0, limit: 100 } }, output), /not JPEG or PNG/);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects a per-kg price for an agreed full-pack product', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    const sack = { ...product, id: 'b1a686a7-9f23-47bf-8d78-925af6888271', price: 160,
      productPath: '/product/aci-chinigura-50-kg-loose--b1a686a7' };
    await assert.rejects(runFeed({ 0: { products: [sack], hasMore: false, offset: 0, limit: 100 } }, output), /Pack price differs/);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('keeps previous feed when pagination stops prematurely', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    await writeFile(output, 'old feed');
    await assert.rejects(runFeed({ 0: { products: [product], hasMore: true, offset: 0, limit: 100 } }, output), /Broken catalogue pagination/);
    assert.equal(await readFile(output, 'utf8'), 'old feed');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('requires an explicit policy-reviewed assortment and a verified floor', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'meta-feed-'));
  try {
    const output = join(dir, 'catalog.csv');
    await assert.rejects(runFeed({ 0: { products: [product], hasMore: false, offset: 0, limit: 100 } }, output, '2'), /eligible products/);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
