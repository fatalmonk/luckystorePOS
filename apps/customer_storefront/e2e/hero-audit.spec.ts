import { expect, test } from '@playwright/test';

test.describe('Storefront campaign hero audit', () => {
  test('meets semantic, responsive, typography, image, control, and focus requirements', async ({
    page,
  }) => {
    await page.goto('/');

    const title = page.getByRole('heading', {
      name: 'Groceries you know, delivered across Chittagong.',
    });
    await expect(title).toBeVisible();
    const hero = title.locator('xpath=ancestor::section[1]');
    const reel = page.getByRole('region', { name: 'Featured campaign carousel' });
    await expect(reel).toBeVisible();

    const destinations = [
      ['Browse groceries', '/category'],
      ['Explore everyday groceries', '/category'],
      ['Shop Buldak ramen deals', '/search?q=buldak'],
      ['Shop dairy and eggs', '/category/dairy-and-eggs'],
      ['Shop tea and coffee', '/category/tea-&-coffee'],
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

    const images = hero.locator('img');
    await expect(images).toHaveCount(5);
    const imageCount = await images.count();
    for (let index = 0; index < imageCount; index += 1) {
      const image = images.nth(index);
      await expect(image).toHaveAttribute('alt', '');

      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(
          () =>
            image.evaluate((element) => {
              const imageElement = element as HTMLImageElement;
              return imageElement.complete && imageElement.naturalWidth > 0;
            }),
          { message: `campaign image ${index + 1} should load` },
        )
        .toBe(true);

      const imageState = await image.evaluate((element) => {
        const imageElement = element as HTMLImageElement;
        return {
          currentSrc: imageElement.currentSrc,
          naturalWidth: imageElement.naturalWidth,
          renderedWidth: imageElement.clientWidth,
        };
      });
      expect(imageState.currentSrc).toMatch(/\.avif$/);
      const densityCoverage = imageState.naturalWidth / imageState.renderedWidth;
      expect(
        densityCoverage,
        `${imageState.currentSrc} covers ${(densityCoverage * 100).toFixed(1)}% of its rendered density`,
      ).toBeGreaterThanOrEqual(0.9);
    }

    const nextButton = hero.getByRole('button', { name: 'Next campaign' });
    const nextBox = await nextButton.boundingBox();
    expect(nextBox?.width).toBeGreaterThanOrEqual(44);
    expect(nextBox?.height).toBeGreaterThanOrEqual(44);

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

    const reel = page.getByRole('region', { name: 'Featured campaign carousel' });
    await expect(reel.locator('.campaign-reel-card')).toHaveCount(4);

    const animationNames = await reel
      .locator('.campaign-reel-card')
      .evaluateAll((cards) => cards.map((card) => getComputedStyle(card).animationName));
    expect(animationNames.every((name) => name === 'none')).toBe(true);
  });
});
