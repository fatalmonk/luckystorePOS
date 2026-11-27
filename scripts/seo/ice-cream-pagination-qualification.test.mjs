/**
 * Ice Cream P0 qualification: synthetic characterization ONLY.
 *
 * No database, browser, network, credentials or production data. This models
 * the grouped-category aggregation in app/lib/search/searchProducts.ts as
 * observed at the frozen PR baseline. It is NOT a test of the actual running
 * search RPC or a certification of future pagination correctness.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = (relative) => readFileSync(resolve(root, relative), 'utf8');
const searchSource = source('apps/customer_storefront/app/lib/search/searchProducts.ts');
const routeSource = source('apps/customer_storefront/app/lib/categoryRouteData.ts');
const enSource = source('apps/customer_storefront/app/(english)/category/[slug]/page.tsx');
const bnSource = source('apps/customer_storefront/app/(bengali)/bn/category/[slug]/page.tsx');
const catalogSource = source('apps/customer_storefront/app/components/CatalogLayout.tsx');

function rows(count) {
  return Array.from({ length: count }, (_, i) => {
    const id = String(i).padStart(5, '0');
    return { id, name: `Ice Cream ${id}`, category: i % 2 ? 'b' : 'a' };
  });
}

/**
 * Mirrors the current per-category read-then-Map-then-slice path, not an
 * imagined globally ordered backend. Only used with artificial stable rows.
 */
function simulateGroupedPage(dataset, offset, limit = 24) {
  const ids = ['a', 'b'];
  const rowsNeeded = offset + limit + 1;
  const map = new Map();
  let transferredRows = 0;
  let rpcCalls = 0;

  for (const category of ids) {
    const ordered = dataset.filter((p) => p.category === category)
      .sort((x, y) => x.name.localeCompare(y.name) || x.id.localeCompare(y.id));
    let fetched = 0;
    let rpcOffset = 0;
    while (fetched < rowsNeeded) {
      const pageLimit = Math.min(1000, rowsNeeded - fetched);
      const batch = ordered.slice(rpcOffset, rpcOffset + pageLimit);
      rpcCalls += 1;
      transferredRows += batch.length;
      for (const p of batch) if (!map.has(p.id)) map.set(p.id, p);
      fetched += batch.length;
      if (batch.length < pageLimit) break;
      rpcOffset += batch.length;
    }
  }

  const combined = [...map.values()];
  return {
    products: combined.slice(offset, offset + limit),
    hasMore: combined.length > offset + limit,
    transferredRows,
    rpcCalls,
  };
}

test('source identity: current implementation uses capped route queries and client Load More', () => {
  assert.match(routeSource, /limit:\s*500/);
  assert.match(routeSource, /limit:\s*200/);
  assert.match(catalogSource, /const PAGE_SIZE = 24/);
  assert.match(catalogSource, /setVisibleCount\(\(prev\) => prev \+ PAGE_SIZE\)/);
  assert.match(searchSource, /const rowsNeeded = actualOffset \+ limit \+ 1/);
  assert.match(searchSource, /const rawRowsMap = new Map/);
  assert.match(searchSource, /allRows\.slice\(actualOffset, actualOffset \+ limit\)/);
});

test('source identity: locales gate pagination while preserving legacy noindex rules', () => {
  for (const content of [enSource, bnSource]) {
    assert.match(content, /const pageState = iceCreamPaginationEnabled\(canonicalSlug\) \? resolveIceCreamPage\(resolvedSearch\) : null/);
    assert.match(content, /const hasFilters = pageState \? pageState\.hasFilters : Object\.values\(resolvedSearch\)\.some/);
    assert.match(content, /robots: hasFilters \?/);
    assert.doesNotMatch(content, /getSingleParam\(resolvedSearch\.page\)/);
  }
});

test('synthetic single-category 65-item baseline partitions into 24,24,17', () => {
  const dataset = rows(65);
  const pages = [0, 24, 48].map((o) => dataset.slice(o, o + 24));
  assert.deepEqual(pages.map((p) => p.length), [24, 24, 17]);
  assert.equal(new Set(pages.flat().map((p) => p.id)).size, 65);
});

for (const count of [65, 501, 1001]) {
  test(`synthetic group of ${count} exposes globally unsorted results and deep-query amplification`, () => {
    const dataset = rows(count);
    const first = simulateGroupedPage(dataset, 0);
    const globalFirst = [...dataset]
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .slice(0, 24).map((x) => x.id);
    assert.notDeepEqual(first.products.map((x) => x.id), globalFirst,
      'Category concatenation is not the globally ordered catalog');
    assert.equal(new Set(first.products.map((x) => x.id)).size, first.products.length);

    const lastPageOffset = Math.floor((count - 1) / 24) * 24;
    const deep = simulateGroupedPage(dataset, lastPageOffset);
    assert.equal(deep.products.length, count - lastPageOffset);
    assert.ok(deep.transferredRows > 24,
      'Deep page reads exceed the visible page size');
    assert.ok(deep.rpcCalls >= 2);
    // Source-level cap is checked separately; this models only the search path.
  });
}

test('synthetic full traversal is stable only for a frozen catalog snapshot', () => {
  const dataset = rows(501);
  const pages = Array.from({ length: Math.ceil(dataset.length / 24) }, (_, i) =>
    simulateGroupedPage(dataset, i * 24).products);
  const resultIds = pages.flat().map((p) => p.id);
  assert.equal(resultIds.length, 501);
  assert.equal(new Set(resultIds).size, 501);
  assert.notDeepEqual(resultIds, dataset.map((p) => p.id),
    'Stable concatenated grouping differs from global alphabetical ordering');
});
