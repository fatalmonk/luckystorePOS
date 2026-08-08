import { expect, test } from '@playwright/test';

test.describe('Storefront homepage shell audit', () => {
  test('presents a clear hierarchy, dependable shell, and complete navigation', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Daily groceries from a store Chittagong knows.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Popular Right Now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daily Essentials' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shop by routine' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Serving Chittagong since 1947.' })).toBeVisible();

    const header = page.getByRole('banner');
    const viewportWidth = test.info().project.use.viewport?.width ?? 1280;
    if (viewportWidth >= 640 && viewportWidth < 1024) {
      await expect(header.getByText('Chittagong Hub, BD')).toBeVisible();
    } else {
      await expect(header.getByText('Chittagong Hub, BD')).toBeHidden();
    }
    await expect(header.getByText(/WELCOME10|PROMO/i)).toHaveCount(0);

    const headerControls = [
      header.getByRole('link', { name: 'Lucky Store 1947' }),
      header.getByRole('button', { name: /Switch to (dark|light) mode/ }).filter({ visible: true }),
      header.getByRole('button', { name: /^Cart \(/ }),
    ];
    if (viewportWidth >= 768) {
      headerControls.push(header.getByRole('link', { name: 'Wishlist' }));
    }
    for (const control of headerControls) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    const trust = page.getByRole('region', { name: 'Why shop with Lucky Store' });
    await expect(trust.getByText('Local delivery')).toBeVisible();
    await expect(trust.getByText('Since 1947')).toBeVisible();
    await expect(trust.getByText('Pay on delivery')).toBeVisible();
    await expect(trust.getByText(/10k\+|500\+|Local Reviews/i)).toHaveCount(0);

    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('navigation', { name: 'Main Navigation' }).getByRole('link', { name: 'GROCERIES' })).toHaveAttribute(
      'href',
      '/category',
    );
    await expect(footer.getByRole('navigation', { name: 'Secondary Navigation' }).getByRole('link', { name: 'CONTACT' })).toHaveAttribute(
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
    const mobileSearch = header.locator('form').first();
    await expect(header.getByPlaceholder('Search groceries')).toBeVisible();
    const searchBox = await mobileSearch.boundingBox();
    expect(searchBox?.width).toBeGreaterThanOrEqual(44);
    expect(searchBox?.height).toBeGreaterThanOrEqual(44);

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
