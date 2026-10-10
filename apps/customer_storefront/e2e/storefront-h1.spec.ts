import { expect, test, type Page } from '@playwright/test';

async function firstHomepageProduct(page: Page, homepagePath: '/' | '/bn') {
  await page.goto(homepagePath);
  const productCard = page.getByTestId('grid-product-card').first();
  await expect(productCard).toBeVisible();

  const productHref = await productCard.locator('a[href*="/product/"]').first().getAttribute('href');
  const productName = (await productCard.locator('h3').innerText()).trim();
  expect(productHref).toBeTruthy();
  expect(productName).not.toBe('');

  return { productHref: productHref!, productName };
}

test.describe('Storefront H1 contract', () => {
  test('homepage has exactly one semantic H1', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test('product page has exactly one semantic H1', async ({ page }) => {
    const { productHref, productName } = await firstHomepageProduct(page, '/');
    await page.goto(productHref);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(productName);
  });

  test('delivery page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/delivery');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Online Grocery & Daily Bazaar Delivery in Chattogram');
  });

  test('localized product page has exactly one semantic H1', async ({ page }) => {
    const { productHref, productName } = await firstHomepageProduct(page, '/bn');
    await page.goto(productHref);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(productName);
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

  test('English brand page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/brand/radhuni');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Radhuni');
  });

  test('Bengali brand page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/bn/brand/radhuni');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('রাঁধুনী');
  });
});
