import { expect, test } from '@playwright/test';

test.describe('Product detail navigation', () => {
  test('exposes a semantic product link and keeps cart actions isolated', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('[data-testid="product-card"]').first();
    await expect(firstCard).toBeVisible();

    const title = (await firstCard.locator('h3').textContent())?.trim();
    expect(title).toBeTruthy();

    const titleLink = firstCard.getByRole('link', { name: title!, exact: true });
    await expect(titleLink).toHaveAttribute('href', /^\/product\/[^/]+$/);

    const homepageUrl = page.url();
    await firstCard.getByRole('button', { name: new RegExp(`^Add ${escapeRegExp(title!)} to cart$`) }).click();
    await expect(page).toHaveURL(homepageUrl);

    await titleLink.click();
    await expect(page).toHaveURL(/\/product\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1, name: title! })).toBeVisible();
  });
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
