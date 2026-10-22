import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const seedSource = fs.readFileSync(new URL('./seed_test_storefront.js', import.meta.url), 'utf8');
const sqlFixture = fs.readFileSync(new URL('../../supabase/seed/storefront_test_fixtures.sql', import.meta.url), 'utf8');

test('service-role fallback includes the Polar Kheer test fixture and its category', () => {
  assert.match(seedSource, /id: 'c0000000-0000-0000-0000-000000000008'[^\n]+name: 'Frozen Desserts'[^\n]+slug: 'frozen-desserts'/);
  assert.match(seedSource, /id: '79e0ece1-0c5e-4e2f-a003-d2f37b73fafb'[^\n]+name: 'Polar Kheer 1\/2 Liter'[^\n]+brand: 'Polar'[^\n]+price: 190[^\n]+mrp: 200[^\n]+cost: 170/);
  assert.match(seedSource, /category_id: 'c0000000-0000-0000-0000-000000000008'[^\n]+sku: 'IC-POL-K1L'[^\n]+image_url: '\/products\/polar\/kheer-500ml-1-2l\.png'/);
  assert.match(sqlFixture, /'79e0ece1-0c5e-4e2f-a003-d2f37b73fafb',[\s\S]{0,400}'Polar Kheer 1\/2 Liter',[\s\S]{0,160}'Polar',[\s\S]{0,100}190\.00,[\s\S]{0,50}200\.00,[\s\S]{0,50}170\.00,[\s\S]{0,100}'c0000000-0000-0000-0000-000000000008',[\s\S]{0,80}'IC-POL-K1L',[\s\S]{0,100}'\/products\/polar\/kheer-500ml-1-2l\.png'/);
  assert.match(sqlFixture, /\('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '79e0ece1-0c5e-4e2f-a003-d2f37b73fafb', 50, 0, 0\)/);
});

test('service-role fallback creates stock rows for every product fixture', () => {
  assert.match(seedSource, /const stockLevels = products\.map\(\(p\) => \(\{[\s\S]*?item_id: p\.id,[\s\S]*?qty: p\.id ===[^\n]+\? 0 : 50/);
});
