import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE, GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  result: { data: null as unknown, error: null as unknown },
}));

const query = {
  insert: mocks.insert,
  select: mocks.select,
  single: mocks.single,
  delete: mocks.delete,
  eq: mocks.eq,
  then: (resolve: (value: typeof mocks.result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(mocks.result).then(resolve, reject),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

const makeRequest = (url: string, options?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://localhost${url}`, options);

function ownerCookie(response: Response) {
  const value = (response as Response & { cookies: { get: (name: string) => { value: string } | undefined } })
    .cookies.get('wishlist_owner')?.value;
  if (!value) throw new Error('Expected wishlist owner cookie');
  return value;
}

async function initializeOwnerCookie() {
  const response = await GET(makeRequest('/api/wishlist?initialize=1'));
  return { response, cookie: ownerCookie(response) };
}

describe('/api/wishlist ownership', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key-with-sufficient-entropy');
    mocks.result = { data: null, error: null };
    mocks.insert.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.single.mockImplementation(async () => mocks.result);
    mocks.delete.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    mocks.createClient.mockReturnValue({ from: mocks.from });
  });

  it('does not use a client-supplied fingerprint to read another wishlist', async () => {
    const response = await GET(makeRequest('/api/wishlist?fingerprint=victim-fingerprint'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, productIds: [] });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects writes until a signed owner cookie has been initialized', async () => {
    const makeAdd = (productId: string) => POST(makeRequest('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, productName: 'Tea', fingerprint: 'victim-fingerprint' }),
    }));
    const [response, concurrentResponse] = await Promise.all([makeAdd('product-1'), makeAdd('product-2')]);

    expect(response.status).toBe(401);
    expect(concurrentResponse.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: 'Wishlist session required' });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect((response as Response & { cookies: { get: (name: string) => unknown } })
      .cookies.get('wishlist_owner')).toBeUndefined();
  });

  it('stores a server-generated, signed owner instead of the posted fingerprint', async () => {
    mocks.result = {
      data: { id: 'wishlist-1', product_id: 'product-1', product_name: 'Tea', created_at: 'now' },
      error: null,
    };

    const { cookie, response: sessionResponse } = await initializeOwnerCookie();
    const ownerId = cookie.split('.')[0];
    const response = await POST(makeRequest('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `wishlist_owner=${cookie}` },
      body: JSON.stringify({
        productId: 'product-1',
        productName: 'Tea',
        fingerprint: 'victim-fingerprint',
      }),
    }));

    expect(response.status).toBe(200);
    expect(ownerId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ownerId).not.toBe('victim-fingerprint');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      customer_fingerprint: ownerId,
      product_id: 'product-1',
    }));
    expect(mocks.select).toHaveBeenCalledWith('id, product_id, product_name, customer_phone, created_at');
    expect(cookie).toMatch(/^[A-Za-z0-9_-]{43}\.\d{10,}\.[A-Za-z0-9_-]{43}$/);
    expect((sessionResponse as Response & { cookies: { get: (name: string) => { httpOnly: boolean; sameSite: string } } })
      .cookies.get('wishlist_owner')).toMatchObject({ httpOnly: true, sameSite: 'lax' });
  });

  it('accepts only a valid signed cookie for wishlist reads', async () => {
    mocks.result = { data: [{ product_id: 'product-1' }], error: null };
    const { cookie: sessionCookie } = await initializeOwnerCookie();
    const ownerId = sessionCookie.split('.')[0];
    const writeResponse = await POST(makeRequest('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `wishlist_owner=${sessionCookie}` },
      body: JSON.stringify({ productId: 'product-1', productName: 'Tea' }),
    }));
    expect(writeResponse.status).toBe(200);

    mocks.createClient.mockClear();
    mocks.from.mockClear();
    mocks.eq.mockClear();
    const response = await GET(makeRequest('/api/wishlist?fingerprint=victim-fingerprint', {
      headers: { cookie: `wishlist_owner=${sessionCookie}` },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, productIds: ['product-1'] });
    expect(mocks.eq).toHaveBeenCalledWith('customer_fingerprint', ownerId);
    expect(mocks.eq).not.toHaveBeenCalledWith('customer_fingerprint', 'victim-fingerprint');
  });

  it('ignores forged owner cookies', async () => {
    const response = await GET(makeRequest('/api/wishlist', {
      headers: {
        cookie: `wishlist_owner=${'A'.repeat(43)}.${Math.floor(Date.now() / 1000) + 3600}.${'B'.repeat(43)}`,
      },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, productIds: [] });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects an expired signed owner cookie', async () => {
    vi.useFakeTimers();
    const { cookie } = await initializeOwnerCookie();
    const expiresAt = Number(cookie.split('.')[1]);

    vi.setSystemTime(new Date((expiresAt + 1) * 1000));
    mocks.createClient.mockClear();
    const response = await GET(makeRequest('/api/wishlist', {
      headers: { cookie: `wishlist_owner=${cookie}` },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, productIds: [] });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('deletes only under the signed cookie owner, ignoring query fingerprints', async () => {
    const { cookie } = await initializeOwnerCookie();
    const ownerId = cookie.split('.')[0];

    mocks.eq.mockClear();
    const response = await DELETE(makeRequest('/api/wishlist?productId=product-1&fingerprint=victim-fingerprint', {
      method: 'DELETE',
      headers: { cookie: `wishlist_owner=${cookie}` },
    }));

    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenNthCalledWith(1, 'product_id', 'product-1');
    expect(mocks.eq).toHaveBeenNthCalledWith(2, 'customer_fingerprint', ownerId);
    expect(mocks.eq).not.toHaveBeenCalledWith('customer_fingerprint', 'victim-fingerprint');
  });
});
