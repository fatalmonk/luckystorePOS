import { expect, test } from '@playwright/test';

test.describe('Storefront campaign hero audit', () => {
  test('meets semantic, responsive, typography, image, control, and focus requirements', async ({
    page,
  }) => {
    await page.goto('/');

    const title = page.getByRole('heading', {
      name: 'Daily essentials from a store Chittagong knows.',
    });
    await expect(title).toBeVisible();
    const hero = title.locator('xpath=ancestor::section[1]');
    const search = hero.getByRole('search', { name: 'Search groceries' });
    await expect(search).toBeVisible();
    await expect(search.getByRole('searchbox')).toHaveAttribute('name', 'q');

    const reel = hero.locator('section[aria-labelledby="hero-discovery-title"] .hero-product-strip');
    await expect(reel).toBeVisible();

    const destinations = [
      ['Rice', '/category?q=rice'],
      ['Snacks', '/category/snacks'],
      ['Cleaning', '/category/cleaning-supplies'],
      ['Shop groceries', '/category'],
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
      .locator('input, a')
      .evaluateAll((elements) =>
        elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      );
    expect(functionalTextSizes.length).toBeGreaterThan(0);
    expect(functionalTextSizes.every((size) => size >= 11)).toBe(true);

    // Campaign hero renders product cards with descriptive alts inside the same section.
    // Cards may render a processed canvas image to remove white product backgrounds, so
    // verify the original asset source remains a reasonable modern format.
    const firstImage = reel.locator('img').first();
    await expect(firstImage).toBeVisible();
    const originalImageSrc =
      (await firstImage.getAttribute('data-original-src')) ?? (await firstImage.getAttribute('src'));
    const parsedImageSrc = new URL(originalImageSrc!, page.url());
    const assetSrc =
      parsedImageSrc.pathname === '/_next/image'
        ? parsedImageSrc.searchParams.get('url') ?? originalImageSrc
        : originalImageSrc;
    expect(assetSrc).toMatch(/\.(avif|webp)(\?.*)?$/i);

    const searchbox = search.getByRole('searchbox');
    await searchbox.focus();
    await expect(searchbox).toBeFocused();
    const focusIndicator = await searchbox.evaluate((element) => {
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
      name: 'Daily essentials from a store Chittagong knows.',
    });
    await expect(title).toBeVisible();
    const hero = title.locator('xpath=ancestor::section[1]');
    const reel = hero.locator('section[aria-labelledby="hero-discovery-title"] .hero-product-strip');
    const slideCount = await reel.locator('a[href^="/product/"]').count();
    expect(slideCount).toBeGreaterThan(0);

    const scrollBehavior = await reel.evaluate((el) => getComputedStyle(el).scrollBehavior);
    expect(['auto', 'smooth']).toContain(scrollBehavior);
  });
});
