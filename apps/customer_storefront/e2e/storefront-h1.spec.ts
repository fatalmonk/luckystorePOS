import { expect, test } from '@playwright/test';

test.describe('Storefront H1 contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage has exactly one semantic H1', async ({ page }) => {
    const h1s = await page.locator('h1').all();
    expect(h1s.length).toBe(1);
    await expect(h1s[0]).toBeVisible();
  });

  test('product page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/product/miniket-rice-premium');
    const h1s = await page.locator('h1').all();
    expect(h1s.length).toBe(1);
    await expect(h1s[0]).toBeVisible();
    await expect(h1s[0]).toHaveText('Miniket Rice Premium');
  });

  test('delivery page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/delivery');
    const h1s = await page.locator('h1').all();
    expect(h1s.length).toBe(1);
    await expect(h1s[0]).toBeVisible();
    await expect(h1s[0]).toHaveText('Online Grocery & Daily Bazaar Delivery in Chattogram');
  });

  test('localized product page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/bn/product/miniket-rice-premium');
    const h1s = await page.locator('h1').all();
    expect(h1s.length).toBe(1);
    await expect(h1s[0]).toBeVisible();
    await expect(h1s[0]).toHaveText('মিনিকেট চাল প্রিমিয়াম');
  });
});
