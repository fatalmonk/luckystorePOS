import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const chunksDir = path.resolve(__dirname, '../.next/static/chunks');
function authChunks(marker: string) {
  return fs.readdirSync(chunksDir).filter(name => name.endsWith('.js') && fs.readFileSync(path.join(chunksDir, name), 'utf8').includes(marker));
}

test.beforeEach(async ({ page }) => {
  // These tests never send commerce mutations to the backing database.
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') return route.fulfill({ status: 503, json: { ok: false, error: 'Test mutation blocked' } });
    return route.continue();
  });
  await page.addInitScript(() => localStorage.setItem('lucky-analytics-consent', 'denied'));
});

test('mobile homepage does not fetch the auth SDK before account interaction', async ({ page }) => {
  test.skip(process.env.AUTH_BUNDLE_AUDIT !== 'true', 'Requires the production build being served');
  await page.setViewportSize({ width: 390, height: 844 });
  const sdk = authChunks('GoTrueClient');
  expect(sdk.length).toBeGreaterThan(0);
  const fetched: string[] = [];
  page.on('request', request => { if (sdk.some(name => request.url().endsWith(name))) fetched.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('#campaign-hero-title')).toBeVisible();
  await page.waitForTimeout(5000);
  expect(fetched).toEqual([]);
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(fetched.length).toBeGreaterThan(0);
});

test('profile waits for auth initialization and retains the orders return destination', async ({ page }) => {
  test.skip(process.env.AUTH_BUNDLE_AUDIT !== 'true', 'Requires the production build being served');
  const runtime = authChunks('startAuthRuntime');
  expect(runtime.length).toBeGreaterThan(0);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*.js', async route => {
    if (runtime.some(name => route.request().url().endsWith(name))) await gate;
    await route.continue();
  });
  await page.goto('/profile#orders');
  await expect(page.getByText('Loading profile...')).toBeVisible();
  await expect(page).toHaveURL(/\/profile#orders$/);
  release();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get('next')).toBe('/profile#orders');
});

test('cart persists through checkout and account navigation; mocked guest order completes', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('auth-cart-fixture')) {
      localStorage.setItem('lucky-cart', JSON.stringify([{ id: 'a0740000-0000-0000-0000-000000000099', name: 'Auth test rice', price: 100, qty: 2, stock: 10, unit: '1 kg', category: 'rice-and-grain' }]));
      sessionStorage.setItem('auth-cart-fixture', 'yes');
    }
  });
  await page.goto('/cart');
  await expect(page.getByText('Auth test rice').first()).toBeVisible();
  await page.getByTestId('cart-checkout-btn').click();
  await expect(page.getByTestId('checkout-name-input')).toBeVisible();
  await page.goto('/login');
  await page.goto('/checkout');
  await page.getByTestId('checkout-name-input').fill('Local Test');
  await page.getByTestId('checkout-phone-input').fill('01712345678');
  await page.getByTestId('checkout-address-input').fill('123 Local Test Road');
  await page.getByTestId('checkout-review-btn').click();
  await expect(page.getByText('Auth test rice').first()).toBeVisible();
  let submitted = false;
  await page.route('**/api/checkout', async route => {
    const body = route.request().postDataJSON();
    expect(body.items[0].qty).toBe(2);
    submitted = true;
    await route.fulfill({ json: { ok: true, order: { order_number: 'LSO-20260907-TEST0001' } } });
  });
  await page.getByTestId('checkout-place-order-btn').click();
  await expect(page).toHaveURL(/\/order\?num=/);
  expect(submitted).toBe(true);
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
});
