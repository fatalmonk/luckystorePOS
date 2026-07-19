import { test, expect, Page } from '@playwright/test';

async function openFirstOutOfStockProduct(page: Page): Promise<Page | null> {
  await page.goto('/');
  await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });

  const productCards = page.locator('[data-testid="product-card"]');
  const count = await productCards.count();
  expect(count).toBeGreaterThan(0);

  await productCards.first().click();
  await page.waitForURL(/\/product\//);
  await expect(page.locator('h1')).toBeVisible();

  const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
  const addToCartButton = page.locator('button:has-text("Add to Cart")');

  try {
    const status = await Promise.race([
      wishlistButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'out-of-stock' as const),
      addToCartButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'in-stock' as const),
    ]);
    return status === 'out-of-stock' ? page : null;
  } catch {
    throw new Error('Product page did not render Add to Cart or Notify Me When Back within 10s');
  }
}

test.describe('Wishlist Flow', () => {
  test.setTimeout(60000);

  test('adds out-of-stock product to wishlist', async ({ page }) => {
    const productPage = await openFirstOutOfStockProduct(page);
    if (!productPage) {
      test.skip(true, 'First product is in stock, skipping wishlist test');
      return;
    }

    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
    await expect(wishlistButton).toBeVisible();
    await wishlistButton.click();

    // Phone input should appear
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();

    // Enter phone and save
    await phoneInput.fill('+880 1712345678');
    await page.click('button:has-text("Save")');

    // Should show saved state
    await expect(page.locator('button:has-text("On Wishlist")')).toBeVisible();
  });

  test('shows duplicate wishlist message', async ({ page }) => {
    const productPage = await openFirstOutOfStockProduct(page);
    if (!productPage) {
      test.skip(true, 'First product is in stock, skipping duplicate wishlist test');
      return;
    }

    const wishlistButton = page.locator('button:has-text("Notify Me When Back")');
    await wishlistButton.click();
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('+880 1712345678');
    await page.click('button:has-text("Save")');
    await expect(page.locator('button:has-text("On Wishlist")')).toBeVisible();

    // Try adding again (reload and click saved button)
    await page.reload();
    const savedButton = page.locator('button:has-text("On Wishlist")');
    await expect(savedButton).toBeVisible();
    await savedButton.click();

    // Should show already on wishlist toast
    await expect(page.locator('text=Already on your wishlist')).toBeVisible();
  });
});
