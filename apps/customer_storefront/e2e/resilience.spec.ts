import { expect, test } from '@playwright/test';

test('the homepage remains useful while product images are slow', async ({ page }) => {
  await page.route(/\.(avif|webp|png|jpe?g)(\?.*)?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Save Money. Live Better.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Shop pantry staples/i })).toBeVisible();
  await expect(page.locator('[data-testid="product-image-loading"]').first()).toBeVisible();
});

test('search still routes when recent-search storage fails', async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.getItem = function (key: string) {
      if (key === 'lucky_recent_searches') throw new Error('Storage disabled');
      return originalGetItem.call(this, key);
    };
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'lucky_recent_searches') throw new Error('Storage disabled');
      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto('/search');
  await expect(page.getByRole('status')).toContainText('Search still works normally.');
  await page.getByPlaceholder('Search groceries, brands, essentials...').fill('Milk');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/(\/category|\/search)\?.*q=Milk/);
});

test('cart changes remain usable when cart storage fails', async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.getItem = function (key: string) {
      if (key === 'lucky-cart') throw new Error('Storage disabled');
      return originalGetItem.call(this, key);
    };
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'lucky-cart') throw new Error('Storage disabled');
      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto('/');
  await expect(page.getByText('Cart saving is unavailable.', { exact: false })).toBeVisible();
  const addButton = page.getByRole('button', { name: /^Add .+ to cart$/ }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
  await expect(page.getByRole('button', { name: /^Remove one .+$/ }).first()).toBeVisible();
});
