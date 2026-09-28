import { expect, test } from '@playwright/test';

test.describe('Storefront H1 contract', () => {
  test('homepage has exactly one semantic H1', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test('product page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/');
    const productLink = page.locator('a[href^="/product/"]').first();
    await expect(productLink).toBeVisible();
    const productHref = await productLink.getAttribute('href');
    expect(productHref).toBeTruthy();

    await page.goto(productHref!);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).not.toHaveText('Page not found');
  });

  test('delivery page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/delivery');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Online Grocery & Daily Bazaar Delivery in Chattogram');
  });

  test('localized product page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/');
    const productLink = page.locator('a[href^="/product/"]').first();
    await expect(productLink).toBeVisible();
    const productHref = await productLink.getAttribute('href');
    expect(productHref).toBeTruthy();

    await page.goto(`/bn${productHref}`);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).not.toHaveText('Page not found');
  });

  test('English Fortune Cookies page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/fortune-cookies-near-me');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Looking for Fortune Cookies near you?');
  });

  test('Bengali Fortune Cookies page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/bn/fortune-cookies-near-me');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('কাছাকাছি ফরচুন কুকিজ খুঁজছেন?');
  });
});
