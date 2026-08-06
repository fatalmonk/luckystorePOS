import { expect, test } from '@playwright/test';

test.describe('Storefront campaign hero audit', () => {
  test('meets semantic, responsive, typography, image, control, and focus requirements', async ({
    page,
  }) => {
    await page.goto('/');

    const title = page.getByRole('heading', {
      name: 'Save Money. Live Better.',
    });
    await expect(title).toBeVisible();
    const hero = title.locator('xpath=ancestor::section[1]');
    const reel = hero.getByRole('region', { name: 'Pantry Staples products' });
    await expect(reel).toBeVisible();

    const destinations = [
      ['Shop pantry staples', '/category/cooking-essentials'],
    ] as const;

    for (const [name, href] of destinations) {
      const link = hero.getByRole('link', { name });
      await expect(link).toHaveAttribute('href', href);

      const box = await link.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    const layout = await hero.evaluate((element) => ({
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      heroRight: element.getBoundingClientRect().right,
    }));
    expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.heroRight).toBeLessThanOrEqual(layout.viewportWidth);

    const functionalTextSizes = await hero
      .locator('.campaign-kicker, .campaign-card-action')
      .evaluateAll((elements) =>
        elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      );
    expect(functionalTextSizes.length).toBeGreaterThan(0);
    expect(functionalTextSizes.every((size) => size >= 11)).toBe(true);

    // Campaign hero now renders product cards with descriptive alts inside the same section.
    // Spot-check the first reel image loads and is a reasonable modern format.
    const firstImage = reel.locator('img').first();
    await expect(firstImage).toBeVisible();
    await expect(firstImage).toHaveAttribute('src', /\.(avif|webp)(\?.*)?$/i);

    const nextButton = hero.getByRole('button', { name: 'Next products' });
    const nextBox = await nextButton.boundingBox();
    expect(nextBox?.width).toBeGreaterThanOrEqual(38);
    expect(nextBox?.height).toBeGreaterThanOrEqual(38);

    await reel.evaluate((element) => element.scrollTo({ left: 0, behavior: 'auto' }));
    await expect.poll(() => reel.evaluate((element) => element.scrollLeft)).toBe(0);
    const scrollBefore = await reel.evaluate((element) => element.scrollLeft);
    await nextButton.click();
    await expect
      .poll(() => reel.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(scrollBefore);

    await reel.focus();
    await expect(reel).toBeFocused();
    await reel.evaluate((element) => element.scrollTo({ left: 0, behavior: 'auto' }));
    const keyboardBefore = await reel.evaluate((element) => element.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => reel.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(keyboardBefore);

    const focusIndicator = await reel.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineWidth: Number.parseFloat(style.outlineWidth),
        boxShadow: style.boxShadow,
      };
    });
    expect(focusIndicator.outlineWidth > 0 || focusIndicator.boxShadow !== 'none').toBe(true);

    await expect(hero.getByText(/Local Reviews/i)).toHaveCount(0);
  });

  test('keeps all content and disables reel animation for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const title = page.getByRole('heading', {
      name: 'Save Money. Live Better.',
    });
    await expect(title).toBeVisible();
    const hero = title.locator('xpath=ancestor::section[1]');
    const reel = hero.getByRole('region', { name: 'Pantry Staples products' });
    const slideCount = await reel.locator('.themed-slide').count();
    expect(slideCount).toBeGreaterThan(0);

    const animationNames = await reel
      .locator('.themed-slide')
      .evaluateAll((cards: HTMLElement[]) => cards.map((card) => getComputedStyle(card).animationName));
    expect(animationNames.every((name: string) => name === 'none')).toBe(true);
  });
});
