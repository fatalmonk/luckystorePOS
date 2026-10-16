[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Meta catalog export compliance, Playwright high-res image pipeline, and image host security
Done: strict CDN host check in admin_web, cart price reconciliation in storefront, Playwright high-res scraper added, meta-catalog-ready.csv fully reconciled (172 rows, pack prices & headers fixed, Nescafe 1000px JPEG resolved)
Branch: codex/ui-improvements
Health: all tests pass (admin_web 118/118, storefront 533/533, export-meta-catalog 7/7)
Last Synced: 2026-10-17
ctx: ui-improvements | done: playwright scraper, meta-catalog-ready reconciled | next: upload meta-jpg images to R2 and submit feed to Meta


