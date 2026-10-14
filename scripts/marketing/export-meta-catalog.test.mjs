import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const script = new URL('./export-meta-catalog.mjs', import.meta.url);
const id = '067da398-0000-4000-8000-000000000001';
const product = {
  id, name: 'Test Tea', price: 100, stock: 2, category: 'Tea & Coffee',
  imageUrl: 'https://images.luckystore1947.com/test.webp',
  productPath: '/product/test-tea--067da398',
};

async function runFeed(pages, output, minimum = '1') {
  process.env.META_FEED_OUTPUT = output;
  process.env.META_FEED_MIN_ITEMS = minimum;
  process.env.META_FEED_ALLOWED_CATEGORIES = 'Tea & Coffee';
  process.env.META_STOREFRONT_ORIGIN = 'https://www.luckystore1947.com';
  globalThis.fetch = async url => {
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
    assert.match(text, /"https:\/\/www\.luckystore1947\.com\/product\/test-tea--067da398"/);
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
