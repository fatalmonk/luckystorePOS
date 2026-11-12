import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const checkedInHtaccess = readFileSync(join(process.cwd(), 'public/.htaccess'), 'utf8');
const headerGenerator = readFileSync(join(process.cwd(), 'security-headers.cjs'), 'utf8');

describe('versioned script cache headers', () => {
  it('applies immutable caching only on successful responses in both hosting configs', () => {
    const successfulResponseRule = 'Header set Cache-Control "public, max-age=31536000, immutable" env=lucky_versioned_script';
    const errorResponseRule = 'Header always set Cache-Control "public, max-age=31536000, immutable" env=lucky_versioned_script';

    expect(checkedInHtaccess).toContain(successfulResponseRule);
    expect(checkedInHtaccess).not.toContain(errorResponseRule);
    expect(headerGenerator).toMatch(/Header set Cache-Control .*HASHED_STATIC_CACHE_CONTROL.*env=lucky_versioned_script/);
    expect(headerGenerator).not.toMatch(/Header always set Cache-Control .*HASHED_STATIC_CACHE_CONTROL.*env=lucky_versioned_script/);
  });
});
