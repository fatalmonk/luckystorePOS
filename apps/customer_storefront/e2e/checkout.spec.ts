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
    const addButton = page.locator('button:has-text("Add")');
    const wishlistButton = page.locator('button:has-text("Notify when available")');

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
    await page.fill('input[placeholder*="name"]', 'Test User');
    await page.fill('input[placeholder="01XXXXXXXXX"]', '01712345678');
    await page.fill('textarea[placeholder*="House"]', '123 Test Road, Chittagong');

    // Go to Step 2: Review
    await page.click('[data-testid="checkout-review-btn"]');

    // Place order
    await page.click('[data-testid="checkout-place-order-btn"]');

    // Should reach order page
    await page.waitForURL(/\/order/);
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });

  test('shows validation errors for invalid phone', async ({ page }) => {
    // Add a product to cart first
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.waitForURL(/\/product\//);

    const addButton = page.locator('button:has-text("Add")');
    const wishlistButton = page.locator('button:has-text("Notify when available")');
    if (await wishlistButton.isVisible().catch(() => false)) {
      test.skip(true, 'Product out of stock, skipping validation test');
      return;
    }
    await addButton.click();
    await expect(page.locator('text=Added')).toBeVisible();

    await page.goto('/checkout');

    // Try to proceed to review without filling required fields
    await page.click('[data-testid="checkout-review-btn"]');
    await expect(page.locator('text=Please fix the errors below')).toBeVisible();

    // Fill with invalid phone
    await page.fill('input[placeholder*="name"]', 'Test User');
    await page.fill('input[placeholder="01XXXXXXXXX"]', '12345');
    await page.fill('textarea[placeholder*="House"]', '123 Test Road');

    await page.click('[data-testid="checkout-review-btn"]');
    await expect(page.locator('text=Format: 01XXXXXXXXX')).toBeVisible();
  });
});