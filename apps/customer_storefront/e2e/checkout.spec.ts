import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('completes a full checkout', async ({ page }) => {
    // Navigate to home and add a product to cart
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    // Click first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Wait for product detail
    await page.waitForURL(/\/product\//);
    await expect(page.locator('h1')).toBeVisible();

    // Add to cart if in stock
    const addButton = page.locator('button:has-text("Add to Cart")');
    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');

    if (await wishlistButton.isVisible().catch(() => false)) {
      test.skip(true, 'Product out of stock, skipping checkout test');
      return;
    }

    await addButton.click();
    await expect(page.locator('text=Added')).toBeVisible();

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

    // Place order
    await page.click('[data-testid="checkout-place-order-btn"]');

    // Should reach order page
    await page.waitForURL(/\/order/);
    await expect(page.locator('[data-testid="order-confirmed-heading"]')).toBeVisible();
  });

  test('shows validation errors for invalid phone', async ({ page }) => {
    // Add a product to cart first
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.waitForURL(/\/product\//);

    const addButton = page.locator('button:has-text("Add to Cart")');
    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
    if (await wishlistButton.isVisible().catch(() => false)) {
      test.skip(true, 'Product out of stock, skipping validation test');
      return;
    }
    await addButton.click();
    await expect(page.locator('text=Added')).toBeVisible();

    await page.goto('/checkout');

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
    // First, get a valid product from the storefront
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    // Intercept the checkout API call to inspect the response
    // Instead of going through the UI, we'll directly POST with a tampered body
    const response = await request.post('/api/checkout', {
      data: {
        orderNumber: '',
        customerName: 'Tamper Test',
        customerPhone: '01712345678',
        customerAddress: '123 Test Road, Chittagong',
        items: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test', price: 1, qty: 1 }],
        subtotal: 1,
        deliveryFee: 0,
        total: 1, // Tampered — actual price would be different
      },
    });

    // Server should reject because DB price won't match the tampered total
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(response.status()).toBe(400);
  });
});

test.describe('Order Confirmation Display', () => {
  test('displays order number, item count, and total correctly', async ({ page }) => {
    // Navigate to home and add a product
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.waitForURL(/\/product\//);

    const addButton = page.locator('button:has-text("Add to Cart")');
    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
    if (await wishlistButton.isVisible().catch(() => false)) {
      test.skip(true, 'Product out of stock, skipping order confirmation test');
      return;
    }

    await addButton.click();
    await expect(page.locator('text=Added')).toBeVisible();

    // Go to checkout
    await page.goto('/checkout');
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