import assert from 'node:assert/strict';
import test from 'node:test';

import { HomeDtoSchema } from './home';

const base = {
  locale: 'en',
  degraded: false,
  categories: [{ id: 'c1', slug: 'rice', name: 'Rice', emoji: '🌾' }],
  sections: [{
    id: 'popular',
    title: 'Popular products',
    products: [{ id: 'p1', name: 'Rice', emoji: '🌾', price: 120, unit: '1 kg', stock: 4, category: 'rice', cost: 70 }],
  }],
};

test('accepts the bounded Home DTO and strips unknown product fields', () => {
  const parsed = HomeDtoSchema.parse(base);
  assert.equal(parsed.sections[0].products[0].name, 'Rice');
  assert.equal('cost' in parsed.sections[0].products[0], false);
});

test('rejects non-finite prices and negative stock', () => {
  assert.throws(() => HomeDtoSchema.parse({ ...base, sections: [{ ...base.sections[0], products: [{ ...base.sections[0].products[0], price: Number.NaN }] }] }));
  assert.throws(() => HomeDtoSchema.parse({ ...base, sections: [{ ...base.sections[0], products: [{ ...base.sections[0].products[0], stock: -1 }] }] }));
});

test('represents an outage without orderable fallback products', () => {
  const parsed = HomeDtoSchema.parse({ ...base, degraded: true, sections: [] });
  assert.equal(parsed.degraded, true);
  assert.deepEqual(parsed.sections, []);
});
