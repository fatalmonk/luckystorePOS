import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/mobile/v1/home', () => {
  it('rejects unsupported locales before querying catalogue data', async () => {
    const response = await GET(new NextRequest('https://example.test/api/mobile/v1/home?locale=fr'));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ error: 'Unsupported locale' });
  });
});
