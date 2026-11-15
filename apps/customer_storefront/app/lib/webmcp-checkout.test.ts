import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkoutSchema } from './validation';
import { __resetCheckoutStateForTesting, WEBMCP_TOOLS } from './webmcp';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function throwingStorage() {
  return {
    getItem: (_key: string): string | null => { throw new Error('storage unavailable'); },
    setItem: (_key: string, _value: string): void => { throw new Error('storage unavailable'); },
    removeItem: (_key: string): void => { throw new Error('storage unavailable'); },
  };
}

const CART_ITEM = {
  id: '029b62d8-1111-2222-3333-444455556666',
  name: 'Rice',
  price: 100,
  qty: 1,
  unit: '1 kg',
};

const BASE_INPUT = {
  customerName: 'Test Customer',
  customerPhone: '01712345678',
  customerAddress: '12 Example Road, Chattogram',
  paymentMethod: 'cod',
};

function makeSignal() {
  return new AbortController().signal;
}

describe('WebMCP submit_order', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetCheckoutStateForTesting();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Existing test: lost response / identity reuse
  // ────────────────────────────────────────────────────────────────────────────
  it('sends checkout-schema data and reuses identity after a lost response', async () => {
    const sessionStorage = createStorage();
    const cart = { items: [CART_ITEM] };
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

    const execute = WEBMCP_TOOLS.submit_order.execute;
    await expect(execute(BASE_INPUT, { signal: makeSignal() })).rejects.toThrow('connection dropped');
    await execute(BASE_INPUT, { signal: makeSignal() });

    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[0].orderNumber).toBe(requests[1].orderNumber);
    expect(requests[0].paymentMethod).toBe('cod');
    expect(requests[1].subtotal).toBe(100);
    expect(requests[1].deliveryFee).toBe(40);
    expect(requests[1].total).toBe(140);
    expect(checkoutSchema.safeParse({
      ...requests[1],
      tenantId: '00000000-0000-0000-0000-000000000001',
      storeId: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
    }).success).toBe(true);
    expect(sessionStorage.getItem('lucky-webmcp-checkout-identity')).toBeNull();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Existing test: PRICE_MISMATCH surface
  // ────────────────────────────────────────────────────────────────────────────
  it('returns the server quote when promotion pricing differs', async () => {
    vi.stubGlobal('localStorage', {
      ...createStorage(),
      getItem: (key: string) => key === 'cart' ? JSON.stringify({ items: [CART_ITEM] }) : null,
    });
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      code: 'PRICE_MISMATCH',
      error: 'Some prices changed.',
      items: [{ id: '029b62d8-1111-2222-3333-444455556666', price: 100, qty: 1 }],
      subtotal: 90,
      discount: 10,
      deliveryFee: 40,
      total: 130,
    }), { status: 400 })));

    const result = await WEBMCP_TOOLS.submit_order.execute({
      ...BASE_INPUT,
    }, { signal: makeSignal() });

    expect(result).toMatchObject({
      code: 'PRICE_MISMATCH',
      subtotal: 90,
      discount: 10,
      deliveryFee: 40,
      total: 130,
      requiresCustomerReview: true,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // New: PRICE_MISMATCH does NOT reset identity; confirmed retry reuses it
  // ────────────────────────────────────────────────────────────────────────────
  it('reuses identity across PRICE_MISMATCH and confirmed retry', async () => {
    const sessionStorage = createStorage();
    const cart = { items: [CART_ITEM] };
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
      if (callCount === 1) {
        // First call: server says PRICE_MISMATCH with discounted total
        return new Response(JSON.stringify({
          ok: false,
          code: 'PRICE_MISMATCH',
          error: 'Promo applied.',
          items: [{ id: CART_ITEM.id, price: 90, qty: 1 }],
          subtotal: 90,
          discount: 10,
          deliveryFee: 40,
          total: 130,
        }), { status: 400 });
      }
      // Second call: success
      return new Response(JSON.stringify({ ok: true, order: { id: 'order-99' } }), { status: 200 });
    }));

    const execute = WEBMCP_TOOLS.submit_order.execute;

    // First call — expect PRICE_MISMATCH
    const mismatch = await execute(BASE_INPUT, { signal: makeSignal() });
    expect(mismatch).toMatchObject({
      requiresCustomerReview: true,
      subtotal: 90,
      discount: 10,
      deliveryFee: 40,
      total: 130,
    });

    // Repeated call without customer approval must not trigger another network request.
    const awaitingReview = await execute(BASE_INPUT, { signal: makeSignal() });
    expect(awaitingReview).toMatchObject({ requiresCustomerReview: true, total: 130 });
    expect(requests).toHaveLength(1);

    // Second network call with confirmed quote
    const confirmed = await execute({
      ...BASE_INPUT,
      confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 130 },
    }, { signal: makeSignal() });
    expect(confirmed).toMatchObject({ ok: true });

    // Both requests used the same idempotency identity
    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[0].orderNumber).toBe(requests[1].orderNumber);

    // Confirmed retry sent server-quoted amounts — not stale local cart totals
    expect(requests[1].subtotal).toBe(90);
    expect(requests[1].discount).toBe(10);
    expect(requests[1].deliveryFee).toBe(40);
    expect(requests[1].total).toBe(130);

    // After success, identity is cleared
    expect(sessionStorage.getItem('lucky-webmcp-checkout-identity')).toBeNull();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // New: identity preserved in module memory when sessionStorage is unavailable
  // ────────────────────────────────────────────────────────────────────────────
  it('preserves identity via module memory when sessionStorage throws', async () => {
    const cart = { items: [CART_ITEM] };
    const requests: Array<Record<string, unknown>> = [];
    let callCount = 0;

    vi.stubGlobal('localStorage', {
      ...createStorage(),
      getItem: (key: string) => key === 'cart' ? JSON.stringify(cart) : null,
      setItem: vi.fn(),
    });
    // sessionStorage always throws
    vi.stubGlobal('sessionStorage', throwingStorage());
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
      requests.push(payload);
      callCount += 1;
      if (callCount === 1) throw new Error('network error');
      return new Response(JSON.stringify({ ok: true, order: { id: 'order-42' } }), { status: 200 });
    }));

    const execute = WEBMCP_TOOLS.submit_order.execute;
    await expect(execute(BASE_INPUT, { signal: makeSignal() })).rejects.toThrow('network error');
    await execute(BASE_INPUT, { signal: makeSignal() });

    // Identity must be preserved across calls even though sessionStorage threw
    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[0].orderNumber).toBe(requests[1].orderNumber);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // New: confirmedQuote mismatch is rejected — agent cannot fabricate amounts
  // ────────────────────────────────────────────────────────────────────────────
  it('rejects confirmedQuote that does not match the last server quote', async () => {
    const cart = { items: [CART_ITEM] };
    vi.stubGlobal('localStorage', {
      ...createStorage(),
      getItem: (key: string) => key === 'cart' ? JSON.stringify(cart) : null,
      setItem: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      code: 'PRICE_MISMATCH',
      error: 'Price changed.',
      items: [{ id: CART_ITEM.id, price: 90, qty: 1 }],
      subtotal: 90,
      discount: 10,
      deliveryFee: 40,
      total: 130,
    }), { status: 400 })));

    const execute = WEBMCP_TOOLS.submit_order.execute;
    await execute(BASE_INPUT, { signal: makeSignal() }); // stores server quote

    // Attempt to confirm with wrong total
    const rejected = await execute({
      ...BASE_INPUT,
      confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 999 },
    }, { signal: makeSignal() }) as Record<string, unknown>;

    expect(rejected.error).toContain('does not match the last server quote');
    expect(rejected.requiresCustomerReview).toBe(true);

    // A quote cannot be reused for a different payment method or checkout payload.
    const changedPayload = await execute({
      ...BASE_INPUT,
      paymentMethod: 'bkash',
      confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 130 },
    }, { signal: makeSignal() }) as Record<string, unknown>;
    expect(changedPayload.requiresCustomerReview).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // New: second price change re-requires review
  // ────────────────────────────────────────────────────────────────────────────
  it('requires review again when price changes a second time', async () => {
    const cart = { items: [CART_ITEM] };
    const requests: Array<Record<string, unknown>> = [];
    let callCount = 0;

    vi.stubGlobal('localStorage', {
      ...createStorage(),
      getItem: (key: string) => key === 'cart' ? JSON.stringify(cart) : null,
      setItem: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
      requests.push(payload);
      callCount += 1;
      if (callCount === 1) {
        // First mismatch
        return new Response(JSON.stringify({
          ok: false, code: 'PRICE_MISMATCH', error: 'First change.',
          items: [], subtotal: 90, discount: 10, deliveryFee: 40, total: 130,
        }), { status: 400 });
      }
      if (callCount === 2) {
        // Second mismatch (price changed again between first review and retry)
        return new Response(JSON.stringify({
          ok: false, code: 'PRICE_MISMATCH', error: 'Second change.',
          items: [], subtotal: 80, discount: 0, deliveryFee: 40, total: 120,
        }), { status: 400 });
      }
      // Third call: success
      return new Response(JSON.stringify({ ok: true, order: { id: 'order-fin' } }), { status: 200 });
    }));

    const execute = WEBMCP_TOOLS.submit_order.execute;

    // First attempt
    const first = await execute(BASE_INPUT, { signal: makeSignal() }) as Record<string, unknown>;
    expect(first.requiresCustomerReview).toBe(true);
    expect(first.total).toBe(130);

    // Confirmed retry — server changes price again
    const second = await execute({
      ...BASE_INPUT,
      confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 130 },
    }, { signal: makeSignal() }) as Record<string, unknown>;
    expect(second.requiresCustomerReview).toBe(true);
    expect(second.total).toBe(120);

    // Customer approves new quote — final success
    const final = await execute({
      ...BASE_INPUT,
      confirmedQuote: { subtotal: 80, discount: 0, deliveryFee: 40, total: 120 },
    }, { signal: makeSignal() }) as Record<string, unknown>;
    expect(final).toMatchObject({ ok: true });

    // All three retries share the same idempotency identity
    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[1].idempotencyKey).toBe(requests[2].idempotencyKey);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // New: success clears cart and identity
  // ────────────────────────────────────────────────────────────────────────────
  it('clears cart and identity on success', async () => {
    const sessionStorage = createStorage();
    const cartStorage = createStorage();
    cartStorage.setItem('cart', JSON.stringify({ items: [CART_ITEM] }));

    vi.stubGlobal('localStorage', cartStorage);
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, order: { id: 'order-ok' } }), { status: 200 }),
    ));

    await WEBMCP_TOOLS.submit_order.execute(BASE_INPUT, { signal: makeSignal() });

    // Cart cleared (saveCart writes '{"items":[]}')
    const cartRaw = cartStorage.getItem('cart');
    const cartAfter = JSON.parse(cartRaw ?? '{"items":[1]}') as { items: unknown[] };
    expect(cartAfter.items).toHaveLength(0);
    // Identity cleared
    expect(sessionStorage.getItem('lucky-webmcp-checkout-identity')).toBeNull();
  });

  it('restores the pending server quote after reload before any additional checkout POST', async () => {
    const sessionStorage = createStorage();
    const cartStorage = createStorage();
    cartStorage.setItem('cart', JSON.stringify({ items: [CART_ITEM] }));
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal('localStorage', cartStorage);
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      if (requests.length === 1) {
        return new Response(JSON.stringify({
          ok: false, code: 'PRICE_MISMATCH', error: 'Price changed',
          subtotal: 90, discount: 10, deliveryFee: 40, total: 130, items: [],
        }), { status: 400 });
      }
      return new Response(JSON.stringify({ ok: true, order: { id: 'reload-order' } }), { status: 200 });
    }));

    const execute = WEBMCP_TOOLS.submit_order.execute;
    const first = await execute(BASE_INPUT, { signal: makeSignal() }) as Record<string, unknown>;
    expect(first.requiresCustomerReview).toBe(true);
    const persisted = JSON.parse(sessionStorage.getItem('lucky-webmcp-checkout-identity')!) as Record<string, unknown>;
    expect(persisted.pendingQuote).toEqual({ subtotal: 90, discount: 10, deliveryFee: 40, total: 130 });
    expect(requests).toHaveLength(1);

    // A module reset simulates JS state loss across browser page reload while
    // preserving sessionStorage, which is the browser's persistent per-tab state.
    __resetCheckoutStateForTesting();
    const pending = await execute(BASE_INPUT, { signal: makeSignal() }) as Record<string, unknown>;
    expect(pending).toMatchObject({ requiresCustomerReview: true, total: 130, discount: 10 });
    expect(requests).toHaveLength(1);

    const approved = await execute({
      ...BASE_INPUT,
      confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 130 },
    }, { signal: makeSignal() });
    expect(approved).toMatchObject({ ok: true });
    expect(requests).toHaveLength(2);
    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[0].orderNumber).toBe(requests[1].orderNumber);
    expect(requests[1].total).toBe(130);
    expect(sessionStorage.getItem('lucky-webmcp-checkout-identity')).toBeNull();
  });

  it('rejects a malformed stored quote after reload without sending checkout', async () => {
    const sessionStorage = createStorage();
    const cartStorage = createStorage();
    cartStorage.setItem('cart', JSON.stringify({ items: [CART_ITEM] }));
    vi.stubGlobal('localStorage', cartStorage);
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: false, code: 'PRICE_MISMATCH', error: 'Price changed',
      subtotal: 90, discount: 10, deliveryFee: 40, total: 130, items: [],
    }), { status: 400 })));

    const execute = WEBMCP_TOOLS.submit_order.execute;
    await execute(BASE_INPUT, { signal: makeSignal() });
    const key = 'lucky-webmcp-checkout-identity';
    const record = JSON.parse(sessionStorage.getItem(key)!) as Record<string, unknown>;
    record.pendingQuote = { subtotal: 90, discount: 10, deliveryFee: 40, total: 999 };
    sessionStorage.setItem(key, JSON.stringify(record));

    __resetCheckoutStateForTesting();
    const blocked = await execute(BASE_INPUT, { signal: makeSignal() }) as Record<string, unknown>;
    expect(blocked).toMatchObject({ requiresCustomerReview: true });
    expect(blocked.error).toContain('saved price quote is invalid');
    const altered = await execute({
      ...BASE_INPUT, confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 130 },
    }, { signal: makeSignal() }) as Record<string, unknown>;
    expect(altered.requiresCustomerReview).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // New: payment method passes through correctly
  // ────────────────────────────────────────────────────────────────────────────
  it('accepts bkash as payment method', async () => {
    const cart = { items: [CART_ITEM] };
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal('localStorage', {
      ...createStorage(),
      getItem: (key: string) => key === 'cart' ? JSON.stringify(cart) : null,
      setItem: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', createStorage());
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ ok: true, order: { id: 'order-bkash' } }), { status: 200 });
    }));

    await WEBMCP_TOOLS.submit_order.execute(
      { ...BASE_INPUT, paymentMethod: 'bkash' },
      { signal: makeSignal() },
    );
    expect(requests[0].paymentMethod).toBe('bkash');
  });
});
