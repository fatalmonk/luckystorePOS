# Lucky Store POS
Stack: Next.js 15 App Router, TS 5.9, Tailwind v3, Supabase, Node 24, Playwright
Current: customer_storefront homepage + category page refresh
Done: Departments dropdown + thematic pills in CategoryGrid; FilterSidebar wired with price range accordion + URL params; two-column CategoryShell desktop layout; price filtering in CategorySwimlanes; price-first ProductCard redesign; SkeletonGrid mirrors new card; HomeShell reordered; corrected Playwright test.skip signatures to resolve type errors; handled missing/offline Supabase client gracefully in Proxy and data fetchers to fix CI/CD build/prerender failures; verified `npx tsc --noEmit` and `npm run lint` pass; configured Vercel preview env variables; Playwright tests pass (4 passed, 4 skipped); fixed admin_web (lucky-store-pos) React 19 type errors and downgraded Zod to ^3.23.8 to fix Vercel build; optimized PromoGrid layout columns and spacing on homepage; resolved Next.js workspace root inference/runtime bundling errors by configuring outputFileTracingRoot in next.config.js; integrated interactive dropdown filters (Price, Availability, Sort By) directly on the top yellow bar and removed the redundant left FilterSidebar for a full-width storefront category layout; enabled top yellow bar filters globally across all storefront pages with smart redirection to `/category` upon interaction.
Blocker: none
Next: Final review and handoff of the feature/server-boundary-refactor branch
---
ctx: server boundary refactor & test fix | done: compile, lint, E2E tests, CI build fix, admin_web fix, PromoGrid style, Vercel preview deploy, workspace root fix, top yellow bar filters, global header filters | next: final handoff




