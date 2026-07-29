import { expect, test } from '@playwright/test';

test.describe('Storefront homepage shell audit', () => {
  test('presents a clear hierarchy, dependable shell, and complete navigation', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Your neighborhood grocer, one scroll away.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The everyday edit' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Featured products' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How Lucky Store works' })).toBeVisible();

    const header = page.getByRole('banner');
    if ((test.info().project.use.viewport?.width ?? 1280) < 640) {
      await expect(header.getByText('Delivery across Chittagong')).toBeHidden();
    } else {
      await expect(header.getByText('Delivery across Chittagong')).toBeVisible();
    }
    await expect(header.getByText(/WELCOME10|PROMO/i)).toHaveCount(0);

    const headerControls = [
      header.getByRole('link', { name: 'Lucky Store 1947' }),
      header.getByRole('button', { name: /Switch to (dark|light) mode/ }),
      header.getByRole('link', { name: 'Wishlist' }),
      header.getByRole('button', { name: /^Cart/ }),
    ];
    for (const control of headerControls) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    const trust = page.getByRole('region', { name: 'Why shop with Lucky Store' });
    await expect(trust.getByText('Local delivery')).toBeVisible();
    await expect(trust.getByText('Serving since 1947')).toBeVisible();
    await expect(trust.getByText('Pay on arrival')).toBeVisible();
    await expect(trust.getByText(/10k\+|500\+|Local Reviews/i)).toHaveCount(0);

    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('link', { name: 'All groceries' })).toHaveAttribute(
      'href',
      '/category',
    );
    await expect(footer.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/contact',
    );

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });

  test('serves a cache-busted 1200 by 630 social sharing image', async ({ page }) => {
    await page.goto('/');

    const openGraphImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    expect(openGraphImage).toContain('/lucky-store-social-share-v2.png');
    expect(twitterImage).toContain('/lucky-store-social-share-v2.png');

    const localAssetPath = new URL(openGraphImage!).pathname;
    const dimensions = await page.evaluate(async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, localAssetPath);
    expect(dimensions).toEqual({ width: 1200, height: 630 });
  });

  test('keeps mobile search, primary navigation, footer, and page width usable', async ({ page }) => {
    test.skip(
      (test.info().project.use.viewport?.width ?? 1280) >= 640,
      'Mobile-shell assertion',
    );

    await page.goto('/');

    const header = page.getByRole('banner');
    const openSearch = header.getByRole('button', { name: 'Open search' });
    const searchBox = await openSearch.boundingBox();
    expect(searchBox?.width).toBeGreaterThanOrEqual(44);
    expect(searchBox?.height).toBeGreaterThanOrEqual(44);

    await openSearch.click();
    await expect(page.getByRole('textbox', { name: 'Search products' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Close search' })).toBeVisible();

    await page.getByRole('button', { name: 'Close search' }).click();
    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(primaryNavigation).toBeVisible();
    await expect(primaryNavigation.getByRole('link')).toHaveCount(4);
    await expect(primaryNavigation.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      /wa\.me\/8801731944544/,
    );
    await expect(primaryNavigation.getByText('Orders')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toBeVisible();

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });
});
