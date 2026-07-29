import { expect, test } from '@playwright/test';

test.describe('Storefront visual audit evidence', () => {
  test('captures the complete homepage with clean runtime text sizing', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/');
    await page.getByRole('heading', {
      name: 'Groceries you know, delivered across Chittagong.',
    }).waitFor();
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    const footerLogo = page.getByRole('img', { name: 'লাকি স্টোর — ১৯৪৭' });
    await expect
      .poll(() =>
        footerLogo.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);

    const undersizedVisibleText = await page.locator('body *').evaluateAll((elements) =>
      elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        const style = getComputedStyle(htmlElement);
        const text = htmlElement.childNodes.length === 1
          ? htmlElement.textContent?.trim()
          : '';
        const visible =
          text &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number.parseFloat(style.opacity) > 0 &&
          htmlElement.getBoundingClientRect().width > 0 &&
          htmlElement.getBoundingClientRect().height > 0;
        const size = Number.parseFloat(style.fontSize);

        if (!visible || size >= 12 || htmlElement.classList.contains('sr-only')) return [];
        return [{ tag: htmlElement.tagName, text: text!.slice(0, 80), size }];
      }),
    );

    expect(undersizedVisibleText).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'auto' });
    });
    await page.screenshot({
      path: testInfo.outputPath('homepage-light.png'),
      fullPage: true,
      animations: 'disabled',
    });

    const themeToggle = page.getByRole('button', { name: 'Switch to dark mode' });
    await themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({
      path: testInfo.outputPath('homepage-dark.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('keeps local Core Web Vitals within good thresholds', async ({ page }) => {
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0 };
      Object.defineProperty(window, '__homepageAuditMetrics', {
        configurable: true,
        value: metrics,
      });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries.at(-1);
        if (lastEntry) metrics.lcp = lastEntry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!layoutShift.hadRecentInput) metrics.cls += layoutShift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto('/');
    await page.getByRole('heading', {
      name: 'Groceries you know, delivered across Chittagong.',
    }).waitFor();
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(
      () =>
        (window as unknown as Window & {
          __homepageAuditMetrics: { lcp: number; cls: number };
        }).__homepageAuditMetrics,
    );
    expect(metrics.lcp).toBeGreaterThan(0);
    expect(metrics.lcp).toBeLessThanOrEqual(2500);
    expect(metrics.cls).toBeLessThanOrEqual(0.1);
  });
});
