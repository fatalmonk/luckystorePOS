import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkoutSchema } from './validation';
import { WEBMCP_TOOLS } from './webmcp';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('WebMCP submit_order', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends checkout-schema data and reuses identity after a lost response', async () => {
    const sessionStorage = createStorage();
    const cart = {
      items: [{
        id: '029b62d8-1111-2222-3333-444455556666',
        name: 'Rice',
        price: 100,
        qty: 1,
        unit: '1 kg',
      }],
    };
    const requests: Array<Record<string, unknown>> = [];
    let callCount = 0;
    vi.stubGlobal('localStorage', {
      ...createStorage(),
      getItem: (key: string) => key === 'cart' ? JSON.stringify(cart) : null,
      setItem: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
      requests.push(payload);
      callCount += 1;
      if (callCount === 1) throw new Error('connection dropped after request');
      return new Response(JSON.stringify({ ok: true, order: { id: 'order-1' } }), { status: 200 });
    }));

    const input = {
      customerName: 'Test Customer',
      customerPhone: '01712345678',
      customerAddress: '12 Example Road, Chattogram',
      paymentMethod: 'cod',
    };
    const execute = WEBMCP_TOOLS.submit_order.execute;
    await expect(execute(input, { signal: new AbortController().signal })).rejects.toThrow('connection dropped');
    await execute(input, { signal: new AbortController().signal });

    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[0].orderNumber).toBe(requests[1].orderNumber);
    expect(requests[0].paymentMethod).toBe('cod');
    expect(checkoutSchema.safeParse({
      ...requests[1],
      tenantId: '00000000-0000-0000-0000-000000000001',
      storeId: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
    }).success).toBe(true);
    expect(sessionStorage.getItem('lucky-webmcp-checkout-identity')).toBeNull();
  });
});
