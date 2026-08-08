import { expect, test } from '@playwright/test';

test.describe('Storefront commerce surfaces', () => {
  test('keeps card hierarchy, weekly-deal treatment, and themes consistent', async ({ page, context }, testInfo) => {
    await context.addInitScript(() => {
      localStorage.setItem('lucky-theme', 'light');
    });

    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/');
    await page.getByRole('heading', { name: 'Popular Right Now' }).waitFor();

    const card = page.getByTestId('grid-product-card').first();
    const image = card.getByRole('link', { name: /^View / });
    const name = card.locator('a').nth(1);
    const unit = card.locator('p').first();
    const price = card.locator('.font-mono').first();
    const add = card.getByRole('button', { name: /^Add / });

    const [imageBox, nameBox, unitBox, priceBox, addBox] = await Promise.all([
      image.boundingBox(),
      name.boundingBox(),
      unit.boundingBox(),
      price.boundingBox(),
      add.boundingBox(),
    ]);

    expect(imageBox).not.toBeNull();
    expect(nameBox!.y).toBeGreaterThan(imageBox!.y + imageBox!.height);
    expect(unitBox!.y).toBeGreaterThan(nameBox!.y);
    expect(priceBox!.y).toBeGreaterThan(unitBox!.y);
    expect(addBox!.y).toBeGreaterThan(priceBox!.y);
    expect(addBox!.height).toBeGreaterThanOrEqual(44);

    const weeklyDeal = page.locator('.deal-panel');
    await expect(weeklyDeal).toBeVisible();
    await expect(weeklyDeal).toHaveCSS('background-color', 'rgb(255, 248, 225)');
    await expect(weeklyDeal.getByRole('heading', { name: "This week's best deal" })).toBeVisible();
    expect(consoleErrors).toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath('commerce-light.png'),
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByRole('button', { name: 'Switch to dark mode' }).dispatchEvent('click');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(card).toHaveCSS('background-color', 'rgb(36, 30, 26)');
    await expect(weeklyDeal).toHaveCSS('background-color', 'rgb(11, 11, 13)');

    await page.screenshot({
      path: testInfo.outputPath('commerce-dark.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });
});
