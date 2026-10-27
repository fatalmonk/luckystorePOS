import { expect, test } from '@playwright/test';

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function getLuminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(rgb1: [number, number, number], rgb2: [number, number, number]) {
  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test.describe('Homepage refinement regressions (Task 1)', () => {
  test('mobile_delivery_is_reachable_without_scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const rejectBtn = page.locator('#lucky-consent-reject');
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
    }

    const primaryCta = page.locator('[data-cro="hero-primary-cta"]');
    const deliveryCta = page.locator('[data-cro="hero-delivery-eligibility"]');

    await expect(primaryCta).toBeVisible();
    await expect(deliveryCta).toBeVisible();

    const primaryBox = await primaryCta.boundingBox();
    const deliveryBox = await deliveryCta.boundingBox();

    expect(primaryBox).not.toBeNull();
    expect(deliveryBox).not.toBeNull();

    // Verify both are reachable without scroll (within 844px screen height)
    expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(844);
    expect(deliveryBox!.y + deliveryBox!.height).toBeLessThanOrEqual(844);
  });

  test('shortcut_icons_have_contrast_in_both_themes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const theme of ['light', 'dark'] as const) {
      await page.goto('/');
      const rejectBtn = page.locator('#lucky-consent-reject');
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();
      }

      await page.evaluate((t) => {
        if (t === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }, theme);

      const shortcutLink = page.locator('.hero-discovery .group').first();
      await expect(shortcutLink).toBeVisible();

      const iconWell = shortcutLink.locator('span.rounded-full').first();
      await expect(iconWell).toBeVisible();

      // Check resting contrast
      const restingColors = await iconWell.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return { color: style.color, bg: style.backgroundColor };
      });

      const restingContrast = getContrast(parseRgb(restingColors.color), parseRgb(restingColors.bg));
      expect(restingContrast, `Resting contrast in ${theme} should be >= 3:1`).toBeGreaterThanOrEqual(3.0);

      // Check hover state
      await shortcutLink.hover();
      const hoverColors = await iconWell.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return { color: style.color, bg: style.backgroundColor };
      });

      const hoverContrast = getContrast(parseRgb(hoverColors.color), parseRgb(hoverColors.bg));
      expect(hoverContrast, `Hover contrast in ${theme} should be >= 3:1`).toBeGreaterThanOrEqual(3.0);
    }
  });

  test('actions_fit_at_320_and_meet_touch_target_and_contrast_minimums', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/');

    const rejectBtn = page.locator('#lucky-consent-reject');
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();
    }

    const primaryCta = page.locator('[data-cro="hero-primary-cta"]');
    const deliveryCta = page.locator('[data-cro="hero-delivery-eligibility"]');

    await expect(primaryCta).toBeVisible();
    await expect(deliveryCta).toBeVisible();

    const primaryBox = await primaryCta.boundingBox();
    const deliveryBox = await deliveryCta.boundingBox();

    expect(primaryBox).not.toBeNull();
    expect(deliveryBox).not.toBeNull();

    // Verify touch targets >= 44x44px
    expect(primaryBox!.width).toBeGreaterThanOrEqual(44);
    expect(primaryBox!.height).toBeGreaterThanOrEqual(44);
    expect(deliveryBox!.width).toBeGreaterThanOrEqual(44);
    expect(deliveryBox!.height).toBeGreaterThanOrEqual(44);

    // Verify normal text contrast >= 4.5:1
    const deliveryColors = await deliveryCta.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { color: style.color, bg: style.backgroundColor };
    });
    const deliveryContrast = getContrast(parseRgb(deliveryColors.color), parseRgb(deliveryColors.bg));
    expect(deliveryContrast, 'Delivery link normal text contrast should be >= 4.5:1').toBeGreaterThanOrEqual(4.5);
  });
});
