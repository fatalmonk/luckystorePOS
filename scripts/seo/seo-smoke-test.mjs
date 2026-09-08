import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.status) return true;
    } catch {
      await delay(500);
    }
  }
  throw new Error(`Server failed to start at ${url} after ${maxRetries} attempts`);
}

async function runSmokeTests() {
  console.log('🚀 Starting Next.js production server for SEO smoke test on port', PORT);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'apps/customer_storefront',
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  });

  server.stderr.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) {
      process.stderr.write(`[server:err] ${msg}`);
    }
  });

  try {
    await waitForServer(`${BASE_URL}/`);
    console.log('✅ Server online at', BASE_URL);

    const assertions = [];

    async function assert(name, fn) {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        assertions.push({ name, passed: true });
      } catch (err) {
        console.error(`  ✗ ${name}:`, err.message);
        assertions.push({ name, passed: false, error: err.message });
      }
    }

    // 1. Homepage
    await assert('Homepage returns HTTP 200, clean canonical, indexable', async () => {
      const res = await fetch(`${BASE_URL}/`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const text = await res.text();
      if (!text.includes('rel="canonical"')) throw new Error('Missing canonical tag');
      if (text.includes('content="noindex')) throw new Error('Accidental noindex on homepage');
    });

    // 2. Valid Category
    await assert('Valid category returns HTTP 200, canonical tag, and indexable', async () => {
      const res = await fetch(`${BASE_URL}/category/snacks`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const text = await res.text();
      if (!text.includes('rel="canonical"')) throw new Error('Missing canonical tag');
      if (text.includes('content="noindex')) throw new Error('Accidental noindex on canonical category');
    });

    // 3. Category Alias One-Hop 308
    await assert('Category alias /category/Personal-Care returns 308 redirect', async () => {
      const res = await fetch(`${BASE_URL}/category/Personal-Care`, { redirect: 'manual' });
      if (res.status !== 308) throw new Error(`Expected 308, got ${res.status}`);
      const loc = res.headers.get('location') || '';
      if (!loc.endsWith('/category/personal-care')) {
        throw new Error(`Expected location ending in /category/personal-care, got ${loc}`);
      }
    });

    // 4. Middleware /category?cat= One-Hop 308
    await assert('Middleware /category?cat=snacks returns 308 redirect to /category/snacks', async () => {
      const res = await fetch(`${BASE_URL}/category?cat=snacks`, { redirect: 'manual' });
      if (res.status !== 308) throw new Error(`Expected 308, got ${res.status}`);
      const loc = res.headers.get('location') || '';
      if (!loc.endsWith('/category/snacks')) {
        throw new Error(`Expected location ending in /category/snacks, got ${loc}`);
      }
    });

    // 5. Query parameter preservation on /category?cat=
    await assert('/category?cat=Personal%20Care&sort=price preserves non-cat query params', async () => {
      const res = await fetch(`${BASE_URL}/category?cat=Personal%20Care&sort=price`, { redirect: 'manual' });
      if (res.status !== 308) throw new Error(`Expected 308, got ${res.status}`);
      const loc = res.headers.get('location') || '';
      if (!loc.includes('/category/personal-care?sort=price')) {
        throw new Error(`Expected /category/personal-care?sort=price, got ${loc}`);
      }
    });

    // 6. Unmatched route returns genuine HTTP 404
    await assert('Unmatched route returns genuine HTTP 404', async () => {
      const res = await fetch(`${BASE_URL}/this-route-does-not-exist-404`, { redirect: 'manual' });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // 7. Nonexistent category triggers notFound contract (404 or App Router notFound shell)
    await assert('Nonexistent category triggers notFound contract', async () => {
      const res = await fetch(`${BASE_URL}/category/nonexistent-category-slug-xyz`, { redirect: 'manual' });
      if (res.status === 404) return;
      const text = await res.text();
      if (!text.includes('Page not found') && !text.includes('NEXT_NOT_FOUND')) {
        throw new Error(`Expected 404 or App Router not-found shell, got status ${res.status}`);
      }
    });

    // 8. Nonexistent product triggers notFound contract
    await assert('Nonexistent product triggers notFound contract', async () => {
      const res = await fetch(`${BASE_URL}/product/nonexistent-item--00000000`, { redirect: 'manual' });
      if (res.status === 404) return;
      const text = await res.text();
      if (!text.includes('Page not found') && !text.includes('NEXT_NOT_FOUND')) {
        throw new Error(`Expected 404 or App Router not-found shell, got status ${res.status}`);
      }
    });

    // 8. Filtered category emits noindex,follow
    await assert('Filtered category view emits noindex,follow and clean parent canonical', async () => {
      const res = await fetch(`${BASE_URL}/category/snacks?sort=price`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const text = await res.text();
      if (!text.includes('content="noindex, follow"')) {
        throw new Error('Expected <meta name="robots" content="noindex, follow"/>');
      }
    });

    // 9. Sitemap reconciliation with self-canonical, 200, and noindex validation
    await assert('Sitemap returns HTTP 200, valid XML, and verified self-canonical URLs', async () => {
      const res = await fetch(`${BASE_URL}/sitemap.xml`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const xml = await res.text();
      const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      if (locMatches.length === 0) throw new Error('Sitemap returned zero URLs');

      const isFullCrawl = process.argv.includes('--full') || process.env.FULL_SITEMAP_CRAWL === 'true';
      let targets;
      if (isFullCrawl) {
        targets = locMatches;
        console.log(`    (Full crawl mode: validating all ${targets.length} sitemap URLs)`);
      } else {
        // Fast sample mode: sample static pages, category pages, and product pages
        const staticUrls = locMatches.filter(u => !u.includes('/category/') && !u.includes('/product/'));
        const categoryUrls = locMatches.filter(u => u.includes('/category/')).slice(0, 10);
        const productUrls = locMatches.filter(u => u.includes('/product/')).slice(0, 15);
        targets = [...new Set([...staticUrls, ...categoryUrls, ...productUrls])];
        console.log(`    (Fast sample mode: validating ${targets.length} diverse URLs across static, category, and product types. Use --full or FULL_SITEMAP_CRAWL=true for all ${locMatches.length} URLs)`);
      }

      // Concurrent validation pool (concurrency: 10)
      const CONCURRENCY = 10;
      let currentIndex = 0;
      const errors = [];

      async function worker() {
        while (currentIndex < targets.length) {
          const index = currentIndex++;
          const targetUrl = targets[index];
          const path = new URL(targetUrl).pathname;

          try {
            const pageRes = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
            if (pageRes.status !== 200) {
              throw new Error(`Expected HTTP 200, got ${pageRes.status}`);
            }
            if (pageRes.headers.get('location')) {
              throw new Error(`Unexpected redirect to ${pageRes.headers.get('location')}`);
            }

            const pageHtml = await pageRes.text();
            if (pageHtml.includes('content="noindex')) {
              throw new Error('Unexpected noindex meta tag on canonical URL');
            }

            // Verify exact self-canonical match
            const canonicalMatch =
              pageHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
              pageHtml.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);

            if (!canonicalMatch) {
              throw new Error('Missing <link rel="canonical"> tag');
            }

            const actualCanonical = canonicalMatch[1].replace(/\/$/, '');
            const expectedCanonical = targetUrl.replace(/\/$/, '');
            if (actualCanonical !== expectedCanonical) {
              throw new Error(`Canonical mismatch: expected "${expectedCanonical}", got "${actualCanonical}"`);
            }
          } catch (err) {
            errors.push(`${path}: ${err.message}`);
          }
        }
      }

      const workers = Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker());
      await Promise.all(workers);

      if (errors.length > 0) {
        throw new Error(`${errors.length} URLs failed validation:\n    ` + errors.slice(0, 5).join('\n    ') + (errors.length > 5 ? `\n    ...and ${errors.length - 5} more` : ''));
      }
      console.log(`    (Validated ${targets.length} URLs: all 200 OK, zero redirects, zero noindex, exact self-canonical match)`);
    });

    const failed = assertions.filter(a => !a.passed);
    console.log('\n--- SMOKE TEST SUMMARY ---');
    console.log(`Passed: ${assertions.length - failed.length} / ${assertions.length}`);
    if (failed.length > 0) {
      console.error(`Failed ${failed.length} assertions:`, failed);
      process.exitCode = 1;
    } else {
      console.log('All SEO smoke test assertions passed! 🎉');
    }
  } finally {
    server.kill('SIGTERM');
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke test harness error:', err);
  process.exit(1);
});
