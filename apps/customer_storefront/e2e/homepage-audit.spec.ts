import { expect, test } from '@playwright/test';

test.describe('Storefront homepage shell audit', () => {
  test('publishes evidence-safe homepage metadata and structured data', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Lucky Store | Online Grocery & Daily Bazaar in Chattogram');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.luckystore1947.com',
    );

    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const storeSchema = schemas
      .map((schema) => JSON.parse(schema))
      .find((schema) => Array.isArray(schema['@type']) && schema['@type'].includes('GroceryStore'));

    expect(storeSchema).toBeTruthy();
    expect(storeSchema).toMatchObject({
      areaServed: {
        '@type': 'GeoCircle',
        geoRadius: '1000',
      },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        opens: '09:00',
        closes: '00:30',
      },
    });
    expect(storeSchema.openingHoursSpecification.dayOfWeek).toHaveLength(7);
    expect(storeSchema).not.toHaveProperty('paymentAccepted');
    expect(storeSchema).not.toHaveProperty('priceRange');
  });

  test('presents a clear hierarchy, dependable shell, and complete navigation', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Daily essentials from a store Chittagong knows.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Popular Right Now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daily Bazaar & Pantry Staples', exact: true })).toBeVisible();
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
      header.getByRole('button', { name: /^Cart \(/ }),
    ];
    if (viewportWidth >= 768) {
      headerControls.push(
        header.getByRole('button', { name: /Switch to (dark|light) mode/i }).filter({ visible: true }),
      );
      headerControls.push(header.getByRole('link', { name: 'Wishlist' }));
    } else {
      headerControls.push(header.getByRole('button', { name: 'Open menu' }));
    }
    for (const control of headerControls) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    const trust = page.getByRole('region', { name: 'Why shop with Lucky Store' });
    await expect(trust.getByText(/Free Delivery/i)).toBeVisible();
    await expect(trust.getByText(/Established 1947/i)).toBeVisible();
    await expect(trust.getByText(/Cash on Delivery/i)).toBeVisible();
    await expect(trust.getByText(/10k\+|Local Reviews/i)).toHaveCount(0);

    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('navigation', { name: 'Shop' }).getByRole('link', { name: 'GROCERIES' })).toHaveAttribute(
      'href',
      '/category',
    );
    await expect(footer.getByRole('navigation', { name: 'Help' }).getByRole('link', { name: 'CONTACT' })).toHaveAttribute(
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

    const mobileSearch = page
      .getByRole('main')
      .getByRole('search', { name: 'Search groceries' });
    await expect(mobileSearch.getByPlaceholder('Search rice, milk, oil, snacks...')).toBeVisible();
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
