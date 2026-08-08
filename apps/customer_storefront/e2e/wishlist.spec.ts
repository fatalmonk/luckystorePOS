import { test, expect, Page } from '@playwright/test';

async function openFirstOutOfStockProduct(page: Page): Promise<Page | null> {
  await page.goto('/');
  await expect(page.getByTestId('grid-product-card').first()).toBeVisible({ timeout: 10000 });

  const outOfStockButton = page.getByRole('button', { name: / is out of stock$/ }).first();
  if ((await outOfStockButton.count()) === 0) {
    return null;
  }

  const productCard = outOfStockButton.locator('xpath=ancestor::article[1]');
  await productCard.getByRole('link', { name: /^View / }).click();
  await page.waitForURL(/\/product\//);
  await expect(page.locator('h1')).toBeVisible();

  const wishlistButton = page.locator('main button:has-text("Notify Me When Back")');
  const addToCartButton = page.locator('main button:has-text("Add to Cart")');

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

test.describe('Out-of-stock product flow', () => {
  test.setTimeout(60000);

  test('renders out-of-stock product detail without Notify me behavior', async ({ page }) => {
    const productPage = await openFirstOutOfStockProduct(page);
    if (!productPage) {
      test.skip(true, 'No out-of-stock product is visible on the homepage');
      return;
    }

    await expect(page.locator('main button:has-text("Out of stock")')).toBeDisabled();
    await expect(page.getByText(/Notify me|Notify Me When Back|On Wishlist/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /See Similar Items/i })).toBeVisible();
  });

  test('renders out-of-stock product card as disabled', async ({ page }) => {
    const productPage = await openFirstOutOfStockProduct(page);
    if (!productPage) {
      test.skip(true, 'No out-of-stock product is visible on the homepage');
      return;
    }

    await page.goBack();
    const outOfStockButton = page.getByRole('button', { name: / is out of stock$/ }).first();
    await expect(outOfStockButton).toBeDisabled();
    await expect(page.getByText(/Notify me|Notify Me When Back/i)).toHaveCount(0);
  });
});
