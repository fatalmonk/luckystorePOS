<!-- markdownlint-disable MD041 -->
[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Supabase, Cloudflare Workers/R2
Current: Phase 2 (Indexing & Sitemap Hygiene)
Done: Phase 0 complete; Phase 1 deployed; branch feat/indexing-sitemap-hygiene; restored leaf-category product querying; unified canonical category slugging; verified search_items_pos RPC WHERE i.is_active = true contract; edge 308 redirect for unnormalized category slugs; full 621-URL crawl verifying 200, 0 redirects, 0 noindex & self-canonical match; 199/199 vitest passing; reverted next.config.js htmlLimitedBots
Branch: feat/indexing-sitemap-hygiene
Health: 199/199 tests passing; typecheck passing; secret scan clean; 10/10 smoke test assertions passing (full 621 sitemap URLs validated)
Last Synced: 2026-09-08
ctx: Phase 2 PR 360 Review Fixes | done: full 621 sitemap crawl + self-canonical check, verified RPC active contract, removed htmlLimitedBots | next: push branch & update PR #360


