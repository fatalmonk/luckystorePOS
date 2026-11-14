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
  test('[semantics] optional robots tag does not block H1 checks', async ({ page }) => {
    await page.setContent('<html><head><title>Product</title></head><body><h1>বাংলা পণ্য</h1></body></html>');
    const robots = page.locator('head meta[name="robots"]');
    expect(await robots.evaluateAll((tags) => tags[0]?.getAttribute('content') ?? null)).toBeNull();
    await page.evaluate(() => {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, follow';
      document.head.append(meta);
    });
    expect(await robots.evaluateAll((tags) => tags[0]?.getAttribute('content') ?? null)).toBe('noindex, follow');
    await expect(page.locator('h1')).toHaveText('বাংলা পণ্য');
  });

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
    await expect(h1).toHaveText('Your Online Grocery Shop in Chattogram');
  });

  test('localized product page has exactly one semantic H1', async ({ page }) => {
    const { productHref, productName } = await firstHomepageProduct(page, '/bn');
    await page.goto(productHref);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    // Published pages may have no robots tag. Read without auto-waiting.
    const robots = await page.locator('head meta[name="robots"]').evaluateAll(
      (tags) => tags[0]?.getAttribute('content') ?? null,
    );
    if (robots?.includes('noindex')) {
      await expect(h1).toHaveText('পণ্যের বাংলা তথ্য পর্যালোচনাধীন');
    } else {
      await expect(h1).toHaveText(productName);
    }
  });

  test('English Fortune Cookies page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/fortune-cookies-near-me');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Fortune Cookies are not available at Lucky Store');
  });

  test('Bengali Fortune Cookies page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/bn/fortune-cookies-near-me');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('লাকি স্টোরে ফরচুন কুকিজ পাওয়া যায় না');
  });

  test('English brand page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/brand/aarong');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Aarong');
  });

  test('Bengali brand page has exactly one semantic H1', async ({ page }) => {
    await page.goto('/bn/brand/aarong');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('আড়ং');
  });
});
