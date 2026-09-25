import { test, expect, Page } from '@playwright/test';
import { getMutationSafety } from './support/mutationSafety';

const mutationSafety = getMutationSafety();
const canMutatePreview = mutationSafety.allowed;

async function mockSuccessfulCheckout(page: Page, orderNumber: string) {
  const trackingToken = 'ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f';
  await page.route('**/api/checkout', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        order: { id: 'e2e-mocked-order', order_number: orderNumber, trackingToken },
      }),
    });
  });
  await page.route('**/api/orders?num=*', async (route) => {
    expect(route.request().headers()['x-order-tracking-token']).toBe(trackingToken);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        order: {
          id: 'e2e-mocked-order',
          order_number: orderNumber,
          customer_name: 'Test User',
          customer_phone: '01712345678',
          customer_address: '123 Test Road, Chittagong',
          notes: null,
          items: [{ id: 'mock-item', name: 'Test item', price: 80, qty: 1 }],
          subtotal: 80,
          delivery_fee: 40,
          total: 120,
          status: 'pending',
          payment_method: 'bkash',
          delivery_slot: 'morning',
          created_at: new Date().toISOString(),
        },
      }),
    });
  });
}

async function openFirstProduct(page: Page) {
  await page.goto('/');
  const firstProduct = page.getByTestId('grid-product-card').first();
  await expect(firstProduct).toBeVisible({ timeout: 10000 });
  await firstProduct.getByRole('link', { name: /^View / }).click();
  await page.waitForURL(/\/product\//);
  await expect(page.locator('h1')).toBeVisible();
}

async function getFirstProductStockStatus(page: Page): Promise<'in-stock' | 'out-of-stock'> {
  // Scope to the main product detail area to avoid the hidden mobile sticky bar button
  const addButton = page.locator('main button:has-text("Add to Cart")');
  const outOfStockButton = page.locator('main button:has-text("Out of stock")');
  const alreadyInCart = page.locator('main button[aria-label="Increase quantity"]');

  try {
    return await Promise.race([
      addButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'in-stock' as const),
      alreadyInCart.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'in-stock' as const),
      outOfStockButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'out-of-stock' as const),
    ]);
  } catch {
    throw new Error('Product page did not render Add to Cart or Out of stock within 10s');
  }
}

async function addFirstInStockProductToCart(page: Page): Promise<boolean> {
  await openFirstProduct(page);
  const status = await getFirstProductStockStatus(page);
  if (status === 'out-of-stock') {
    return false;
  }

  const addButton = page.locator('main button:has-text("Add to Cart")');
  if (await addButton.isVisible()) {
    await addButton.click();
  }
  // Header cart button exposes an accessible label with item count and total after add.
  await page
    .getByRole('button', { name: /Cart \(\d+ items?/ })
    .waitFor({ state: 'visible', timeout: 5000 });
  return true;
}

test.describe('Checkout Flow', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // Keep checkout interactions deterministic without changing production consent behavior.
    await page.addInitScript(() => {
      window.localStorage.setItem('lucky-analytics-consent', 'denied');
    });
  });

  test('redirects an empty cart before showing personal-data fields', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('lucky-cart'));

    await page.goto('/checkout');
    await page.waitForURL('/cart');

    await expect(page.locator('[data-testid="checkout-name-input"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="checkout-phone-input"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="checkout-address-input"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  });

  test('completes a full checkout', async ({ page }) => {
    await mockSuccessfulCheckout(page, 'LSO-20990101-MOCKED01');
    const added = await addFirstInStockProductToCart(page);
    if (!added) {
      test.skip(true, 'First product is out of stock, skipping checkout test');
      return;
    }

    // Go to cart
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Cart', exact: true })).toBeVisible();

    // Proceed to checkout
    await page.click('[data-testid="cart-checkout-btn"]');
    await page.waitForURL('/checkout');

    // Step 1: Fill delivery details
    await page.fill('[data-testid="checkout-name-input"]', 'Test User');
    await page.fill('[data-testid="checkout-phone-input"]', '01712345678');
    await page.fill('[data-testid="checkout-address-input"]', '123 Test Road, Chittagong');

    // Go to Step 2: Review
    await page.click('[data-testid="checkout-review-btn"]');

    await expect(page.getByRole('radio', { name: /Cash on Delivery/ })).toBeChecked();
    await page.getByRole('radio', { name: /bKash/ }).check();
    await expect(page.getByText('Pay to 01731944544.')).toBeVisible();
    await page.fill('[data-testid="checkout-bkash-trxid"]', 'E2E123456');

    // Place order
    await page.click('[data-testid="checkout-place-order-btn"]');

    // Should reach order page
    await page.waitForURL(/\/order/);
    await expect(page.locator('[data-testid="order-confirmed-heading"]')).toBeVisible();
    await expect(page).toHaveURL(/#track=ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f$/);
    await expect(page.getByText('Current status: pending.')).toBeVisible();
  });

  test('shows validation errors for invalid phone', async ({ page }) => {
    const added = await addFirstInStockProductToCart(page);
    if (!added) {
      test.skip(true, 'First product is out of stock, skipping validation test');
      return;
    }

    await page.goto('/checkout');
    await expect(page.locator('[data-testid="checkout-name-input"]')).toBeVisible();

    // Try to proceed to review without filling required fields
    await page.click('[data-testid="checkout-review-btn"]');
    await expect(page.locator('text=Please check the highlighted fields')).toBeVisible();

    // Fill with invalid phone
    await page.fill('[data-testid="checkout-name-input"]', 'Test User');
    await page.fill('[data-testid="checkout-phone-input"]', '12345');
    await page.fill('[data-testid="checkout-address-input"]', '123 Test Road');

    await page.click('[data-testid="checkout-review-btn"]');
    await expect(page.locator('text=Format: 01XXXXXXXXX')).toBeVisible();
  });
});

test.describe('Checkout Price Tampering', () => {
  test('rejects tampered total with 400', async ({ page, request }) => {
    test.skip(!canMutatePreview, mutationSafety.reason);

    // First, get a valid product from the storefront
    await page.goto('/');
    await expect(page.getByTestId('grid-product-card').first()).toBeVisible({ timeout: 10000 });

    // Intercept the checkout API call to inspect the response
    // Instead of going through the UI, we'll directly POST with a tampered body
    const productsResponse = await request.get('/api/products?limit=1');
    expect(productsResponse.ok()).toBe(true);
    const { products } = await productsResponse.json();
    const product = products[0];
    const subtotal = Number(product.price);
    const deliveryFee = subtotal >= 500 ? 0 : 40;

    const response = await request.post('/api/checkout', {
      data: {
        orderNumber: 'LSO-20990101-TAMPER01',
        idempotencyKey: 'ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f',
        customerName: 'Tamper Test',
        customerPhone: '01712345678',
        customerAddress: '123 Test Road, Chittagong',
        paymentMethod: 'cod',
        items: [{ id: product.id, name: product.name, price: subtotal, qty: 1 }],
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee + 1, // Tampered by ৳1
      },
    });

    // The request has a valid product and retry key, so rejection proves total validation.
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('PRICE_MISMATCH');
    expect(response.status()).toBe(400);
  });
});

test.describe('Order Confirmation Display', () => {
  test.setTimeout(120000);

  test('displays order number, item count, and total correctly', async ({ page }) => {
    await mockSuccessfulCheckout(page, 'LSO-20990101-MOCKED02');
    const added = await addFirstInStockProductToCart(page);
    if (!added) {
      test.skip(true, 'First product is out of stock, skipping order confirmation test');
      return;
    }

    // Go to checkout
    await page.goto('/checkout');
    await expect(page.locator('[data-testid="checkout-name-input"]')).toBeVisible();

    await page.fill('[data-testid="checkout-name-input"]', 'Confirmation Test');
    await page.fill('[data-testid="checkout-phone-input"]', '01712345678');
    await page.fill('[data-testid="checkout-address-input"]', '456 Confirm Ave, Chittagong');
    await page.click('[data-testid="checkout-review-btn"]');
    await page.click('[data-testid="checkout-place-order-btn"]');

    // Wait for order confirmation page
    await page.waitForURL(/\/order/);
    await expect(page.locator('[data-testid="order-confirmed-heading"]')).toBeVisible();

    // Verify order number is displayed (format: LSO-YYYYMMDD-XXXXXXXX)
    const orderNumberText = await page.locator('p.font-mono').textContent();
    expect(orderNumberText).toMatch(/^LSO-\d{8}-[A-Z0-9]{8}$/);

    // Verify item count is shown
    await expect(page.locator('text=1 items')).toBeVisible();

    // Verify total is shown (should be ৳ followed by a number)
    const totalText = await page.locator('text=Total').locator('..').textContent();
    expect(totalText).toMatch(/৳/);
  });
});

test.describe('Isolated Supabase order integration', () => {
  test.setTimeout(120000);

  test('creates one real order only on an approved test project', async ({ page }) => {
    test.skip(!canMutatePreview, mutationSafety.reason);

    const added = await addFirstInStockProductToCart(page);
    if (!added) {
      test.skip(true, 'First product is out of stock, skipping checkout integration test');
      return;
    }

    await page.goto('/checkout');
    await page.fill('[data-testid="checkout-name-input"]', 'Isolated Test Order');
    await page.fill('[data-testid="checkout-phone-input"]', '01712345678');
    await page.fill('[data-testid="checkout-address-input"]', 'Approved Supabase test project only');
    await page.click('[data-testid="checkout-review-btn"]');
    await page.click('[data-testid="checkout-place-order-btn"]');

    await page.waitForURL(/\/order/);
    await expect(page.locator('[data-testid="order-confirmed-heading"]')).toBeVisible();
  });
});
