import { test, expect } from '@playwright/test';

const rice = {
  id: '029b62d8-1111-2222-3333-444455556666', name: 'Test Rice', price: 100,
  stock: 10, qty: 1, emoji: '', unit: '1 kg', category: 'rice', description: 'Test only',
};
const milk = {
  id: '029b62d8-1111-2222-3333-444455556677', name: 'Test Milk', price: 60,
  stock: 10, emoji: '', unit: '1 L', category: 'dairy', description: 'Test only',
};
const checkoutFields = {
  customerName: 'Isolated Checkout Test',
  customerPhone: '01712345678',
  customerAddress: 'Test-only address, Chattogram',
  paymentMethod: 'cod',
};
const confirmedQuote = { subtotal: 210, discount: 10, deliveryFee: 40, total: 250 };

async function tool(
  page: import('@playwright/test').Page,
  name: string,
  input: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  return page.evaluate(async ({ name, input }) => {
    const registration = (window as unknown as {
      __webmcpRegistered: Record<
        string,
        { execute: (input: Record<string, unknown>, ctx: { signal: AbortSignal }) => Promise<Record<string, unknown>> }
      >;
    }).__webmcpRegistered;
    return registration[name].execute(input, { signal: new AbortController().signal });
  }, { name, input });
}

async function waitForTools(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => Boolean((window as unknown as { __webmcpRegistered?: Record<string, unknown> })
      .__webmcpRegistered?.submit_order),
    null, { timeout: 30_000 },
  );
}

test('WebMCP uses visible cart, reviews server quotes across reload, and keeps idempotency', async ({ page }) => {
  // This is a mocked transport test: no real order API request or DB write.
  await page.addInitScript((initial) => {
    (window as unknown as { __webmcpRegistered: Record<string, unknown> }).__webmcpRegistered = {};
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async (entry: { name: string }) => {
          (window as unknown as { __webmcpRegistered: Record<string, unknown> })
            .__webmcpRegistered[entry.name] = entry;
        },
      },
    });
    if (!localStorage.getItem('lucky-cart')) {
      localStorage.setItem('lucky-cart', JSON.stringify([initial]));
    }
  }, rice);

  await page.route('**/api/products?id=*', async (route) => {
    const id = new URL(route.request().url()).searchParams.get('id');
    await route.fulfill({
      status: id === milk.id ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(id === milk.id ? milk : { error: 'Not found' }),
    });
  });

  const posts: Array<Record<string, unknown>> = [];
  await page.route('**/api/checkout', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    posts.push(JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>);
    await route.fulfill({
      status: posts.length === 1 ? 400 : 200,
      contentType: 'application/json',
      body: JSON.stringify(posts.length === 1
        ? { ok: false, code: 'PRICE_MISMATCH', ...confirmedQuote, error: 'Please review updated pricing', items: [] }
        : { ok: true, order: { id: 'mocked-test-order', order_number: 'LSO-MOCKED' } }),
    });
  });

  await page.goto('/cart');
  await waitForTools(page);
  await expect.poll(async () => (await tool(page, 'get_cart')).items).toMatchObject([{ id: rice.id, qty: 1 }]);
  const added = await tool(page, 'add_to_cart', { id: milk.id, qty: 2 });
  expect(added.ok).toBe(true);
  await expect.poll(async () => page.evaluate(() => {
    return JSON.parse(localStorage.getItem('lucky-cart') ?? '[]') as unknown[];
  })).toHaveLength(2);
  const cart = await tool(page, 'get_cart');
  expect(cart.items).toMatchObject([
    { id: rice.id, qty: 1 },
    { id: milk.id, qty: 2 },
  ]);
  expect(cart.total).toBe(260);
  expect(await page.evaluate(() => localStorage.getItem('cart'))).toBeNull();

  const mismatch = await tool(page, 'submit_order', checkoutFields);
  expect(mismatch).toMatchObject({ code: 'PRICE_MISMATCH', requiresCustomerReview: true, total: 250 });
  expect(posts).toHaveLength(1);
  expect(posts[0].total).toBe(260);

  // A real navigation reload clears JS module state but preserves sessionStorage.
  await page.reload();
  await waitForTools(page);
  const blocked = await tool(page, 'submit_order', checkoutFields);
  expect(blocked).toMatchObject({ requiresCustomerReview: true, total: 250 });
  expect(posts).toHaveLength(1);
  const tampered = await tool(page, 'submit_order', { ...checkoutFields, confirmedQuote: { ...confirmedQuote, total: 999 } });
  expect(tampered.requiresCustomerReview).toBe(true);
  expect(posts).toHaveLength(1);
  const success = await tool(page, 'submit_order', { ...checkoutFields, confirmedQuote });
  expect(success.ok).toBe(true);
  expect(posts).toHaveLength(2);
  expect(posts[1].idempotencyKey).toBe(posts[0].idempotencyKey);
  expect(posts[1].items).toEqual(posts[0].items);
  expect(posts[1].total).toBe(250);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('lucky-cart') ?? '[]') as unknown[])).toHaveLength(0);
});
