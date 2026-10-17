[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: SEO Autopilot reliability & state reconciliation
Done: strict CDN host check in admin_web, cart price reconciliation in storefront, Playwright high-res scraper with Jev search integration, meta-catalog-ready.csv fully reconciled (172 rows), 366 assets synced to Cloudflare R2, 3 Chattogram competitor adapters, PR #496 merged (storefront smoke test redirect handling), PR #497 merged (Bengali delivery Header/Footer/BottomNav locale="bn" localization fix & Oct 17 report), decoupled Search Console from blocking autopilot proposals, fixed audit SHA provenance via workflow_run.head_sha, broadened open PR overlap detection to all seo/* branches and labels, updated run_report.py to distinguish check statuses accurately, modernized seo/content-calendar.md and seo/pr-template.md
Branch: fix/seo-autopilot-reliability
Health: all tests pass (admin_web 118/118, storefront 533/533, export-meta-catalog 7/7, images worker 5/5, competitor-scraper 54/54, playwright scraper tests 10/10, seo test suite 60/60, storefront typecheck clean)
Last Synced: 2026-10-17
ctx: SEO autopilot reliability recommendations applied | done: GSC decoupling, SHA provenance, overlap detection, state & template modernization | next: commit and push reliability PR

