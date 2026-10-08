import assert from 'node:assert/strict';
import test from 'node:test';

import { HomeDtoSchema, resolveApiBaseUrl } from './home';

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

test('normalizes empty or whitespace category to General', () => {
  const parsed1 = HomeDtoSchema.parse({
    ...base,
    sections: [{
      id: 's1',
      title: 'Section 1',
      products: [{ id: 'p1', name: 'Item', price: 50, unit: 'pc', stock: 2, category: '' }],
    }],
  });
  assert.equal(parsed1.sections[0].products[0].category, 'General');

  const parsed2 = HomeDtoSchema.parse({
    ...base,
    sections: [{
      id: 's1',
      title: 'Section 1',
      products: [{ id: 'p1', name: 'Item', price: 50, unit: 'pc', stock: 2, category: '   ' }],
    }],
  });
  assert.equal(parsed2.sections[0].products[0].category, 'General');
});

test('resolveApiBaseUrl validates HTTPS and development hostnames', () => {
  // Production enforces HTTPS strictly
  assert.equal(resolveApiBaseUrl('https://api.luckystore1947.com', false), 'https://api.luckystore1947.com');
  assert.throws(() => resolveApiBaseUrl('http://api.luckystore1947.com', false), /must use HTTPS in production/);
  assert.throws(() => resolveApiBaseUrl('http://192.168.1.5:3000', false), /must use HTTPS in production/);

  // Development allows localhost, RFC1918, and .local over HTTP
  assert.equal(resolveApiBaseUrl('http://localhost:3000', true), 'http://localhost:3000');
  assert.equal(resolveApiBaseUrl('http://127.0.0.1:3000', true), 'http://127.0.0.1:3000');
  assert.equal(resolveApiBaseUrl('http://192.168.1.10:3000', true), 'http://192.168.1.10:3000');
  assert.equal(resolveApiBaseUrl('http://10.0.1.25:3000', true), 'http://10.0.1.25:3000');
  assert.equal(resolveApiBaseUrl('http://macbook.local:3000', true), 'http://macbook.local:3000');

  // Development rejects public DNS domains with 10./192.168. prefix over HTTP
  assert.throws(() => resolveApiBaseUrl('http://10.example.com', true), /must use HTTPS or a valid local development host/);
  assert.throws(() => resolveApiBaseUrl('http://192.168.example.com', true), /must use HTTPS or a valid local development host/);
});
