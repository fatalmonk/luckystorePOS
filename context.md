<!-- markdownlint-disable MD041 -->
[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Supabase, Cloudflare Workers/R2
Current: Document Request Latency (Restore Static ISR Caching for Storefront Pages)
Done: Enriched 85 products across 5 cohorts, Cloudflare image loader, hero asset downscaled, fixed <dl> a11y tree violation, canonicalized tea-and-coffee hrefs, restored static ISR caching on / and /bn (cutting TTFB from ~1294ms to <50ms), 298 vitest tests passing, 0 tsc errors, secret scan clean
Branch: codex/pr369-followup
Health: 298/298 vitest tests passing, 0 tsc errors, secret scan clean, next build passing (33/33 static pages, ○ / with 1m revalidate)
Last Synced: 2026-09-17
ctx: Document Latency Optimization | done: Removed headers() from RootLayout, restored static ISR caching (saving ~1,190ms) | next: Deploy & verify Lighthouse

