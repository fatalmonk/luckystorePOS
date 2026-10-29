import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLegacyImageReference } from './legacy-image-reference.mjs';

test('parses supported storage prefixes and drops query/fragment data', () => {
  assert.deepEqual(parseLegacyImageReference('https://cdn.example.test/storage/v1/object/public/item-images/tenant-a/a.webp?token=secret#preview'), {
    key: 'item-images/tenant-a/a.webp', rule: 'item-images-prefix',
  });
  assert.deepEqual(parseLegacyImageReference('https://cdn.example.test/product-images/a.webp?cache=1'), {
    key: 'product-images/a.webp', rule: 'product-images-prefix',
  });
  assert.deepEqual(parseLegacyImageReference('products/tenant-a/a.webp'), {
    key: 'products/tenant-a/a.webp', rule: 'products-prefix',
  });
  assert.deepEqual(parseLegacyImageReference('https://cdn.example.test/brands/ama/products/a.webp'), {
    key: 'brands/ama/products/a.webp', rule: 'brand-prefix',
  });
});

test('keeps unknown, empty, and malformed references unresolved', () => {
  for (const value of [null, '', 'https://cdn.example.test/a.webp', 'products/%E0%A4%A.webp']) {
    assert.deepEqual(parseLegacyImageReference(value), { key: null, rule: null });
  }
});
