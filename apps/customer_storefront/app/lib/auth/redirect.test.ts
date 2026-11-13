import { describe, expect, it } from 'vitest';
import { getSafeAuthReturnPath } from './redirect';

describe('getSafeAuthReturnPath', () => {
  it('preserves internal paths, query strings, hashes, and localized routes', () => {
    expect(getSafeAuthReturnPath('/profile#orders')).toBe('/profile#orders');
    expect(getSafeAuthReturnPath('/bn/profile?tab=orders')).toBe('/bn/profile?tab=orders');
  });

  it.each([
    null,
    undefined,
    '',
    'https://example.com',
    '//example.com',
    '/.//evil.com',
    '/..//evil.com',
    '/\\\\example.com',
    'javascript:alert(1)',
    '/profile\nhttps://example.com',
  ])('falls back to the profile for unsafe destination %s', (destination) => {
    expect(getSafeAuthReturnPath(destination)).toBe('/profile');
  });
});
