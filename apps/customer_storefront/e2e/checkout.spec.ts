import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('completes a full checkout', async ({ page }) => {
    // Navigate to home and add a product to cart
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-grid"]', { timeout: 10000 });

    // Click first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Wait for product detail
    await page.waitForURL(/\/product\//);
    await expect(page.locator('h1')).toBeVisible();

    // Add to cart if in stock
    const addButton = page.locator('button:has-text("Add to Cart")');
    const wishlistButton = page.locator('button:has-text("Notify when available")');

    if (await wishlistButton.isVisible().catch(() => false)) {
      test.skip('Product out of stock, skipping checkout test');
      return;
    }

    await addButton.click();

    // Go to cart
    await page.goto('/cart');
    await expect(page.locator('text=Cart')).toBeVisible();

    // Proceed to checkout
    await page.click('text=Checkout');
    await page.waitForURL('/checkout');

    // Fill checkout form (Step 2)
    await page.fill('input[placeholder*="full name"]', 'Test User');
    await page.fill('input[placeholder*="WhatsApp"]', '+880 1712345678');
    await page.fill('textarea[placeholder*="Address"]', '123 Test Road, Chattogram');

    // Place order
    await page.click('text=Place Order');

    // Should reach confirming step then order page
    await page.waitForURL(/\/order/);
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });

  test('shows validation errors for invalid phone', async ({ page }) => {
    await page.goto('/checkout');

    // Try to proceed without filling required fields
    await page.click('text=Place Order');
    await expect(page.locator('text=Please fill all required fields')).toBeVisible();

    // Fill with invalid phone
    await page.fill('input[placeholder*="full name"]', 'Test User');
    await page.fill('input[placeholder*="WhatsApp"]', '12345');
    await page.fill('textarea[placeholder*="Address"]', '123 Test Road');

    await page.click('text=Place Order');
    await expect(page.locator('text=Enter valid BD phone')).toBeVisible();
  });
});
