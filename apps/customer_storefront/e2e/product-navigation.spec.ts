import { expect, test } from '@playwright/test';

test('previews a product and returns focus to the same spot in the aisle', async ({ page }) => {
  await page.goto('/');
  const card = page.getByTestId('grid-product-card').first();
  const title = card.getByRole('heading', { level: 3 });
  const trigger = card.locator('a:has(h3)');
  await trigger.scrollIntoViewIfNeeded();
  const name = (await title.innerText()).trim();
  const href = await trigger.getAttribute('href');
  expect(href).toMatch(/^\/product\/[^/]+$/);
  const url = page.url();
  // Measure the aisle when the shopper activates the card, after scrolling settles.
  const positionAtClick = trigger.evaluate(el => new Promise<number>(resolve => {
    el.addEventListener('click', () => resolve(el.getBoundingClientRect().top), { once: true });
  }));

  await trigger.click();
  const position = await positionAtClick;
  const preview = page.getByRole('dialog', { name, exact: true });
  await expect(preview).toBeVisible();
  await expect(page).toHaveURL(url);
  await expect(preview.locator('img')).toBeVisible();
  await expect(preview).toContainText((await card.locator('p').first().innerText()).trim());
  const box = (await preview.boundingBox())!;
  const viewport = page.viewportSize()!;
  if (viewport.width < 768) {
    expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThan(2);
  } else {
    expect(box.width).toBeLessThanOrEqual(480);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
  }
  await expect(preview.getByRole('link')).toHaveAttribute('href', href!);
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(Math.abs(await trigger.evaluate(el => el.getBoundingClientRect().top) - position)).toBeLessThan(2);
});
