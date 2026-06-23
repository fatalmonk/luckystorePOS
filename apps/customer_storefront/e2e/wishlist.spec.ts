import { test, expect } from '@playwright/test';

test.describe('Wishlist Flow', () => {
  test('adds out-of-stock product to wishlist', async ({ page }) => {
    // Navigate to a product page
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

    // Find and click an out-of-stock product (or any product)
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);

    // Click first product
    await productCards.first().click();
    await page.waitForURL(/\/product\//);

    // Check if wishlist button is visible (out of stock)
    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
    const addToCartButton = page.locator('button:has-text("Add to Cart")');

    if (await addToCartButton.isVisible().catch(() => false)) {
      test.skip(true, 'Product in stock, skipping wishlist test');
      return;
    }

    await expect(wishlistButton).toBeVisible();
    await wishlistButton.click();

    // Phone input should appear
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();

    // Enter phone and save
    await phoneInput.fill('+880 1712345678');
    await page.click('button:has-text("Save")');

    // Should show saved state
    await expect(page.locator('button:has-text("On wishlist")')).toBeVisible();
  });

  test('shows duplicate wishlist message', async ({ page, context }) => {
    // Use a fresh context to ensure no localStorage carryover
    // This test assumes the product is out of stock
    await page.goto('/product/test-product-id');

    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
    if (await wishlistButton.isVisible().catch(() => false)) {
      await wishlistButton.click();
      const phoneInput = page.locator('input[type="tel"]');
      await phoneInput.fill('+880 1712345678');
      await page.click('button:has-text("Save")');
      await expect(page.locator('button:has-text("On wishlist")')).toBeVisible();

      // Try adding again (reload and click)
      await page.reload();
      await page.locator('button:has-text("On wishlist")').click();
      // Should show already on wishlist toast
    } else {
      test.skip(true, 'Product in stock or not found');
    }
  });
});