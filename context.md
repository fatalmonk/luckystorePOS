[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Supabase, Cloudflare Workers/R2
Current: Optimized admin_web bundle splitting and deferred analytics queries for LCP/payload reduction
Done: Split Recharts/D3 into vendor-charts chunk in vite.config.ts; default-collapsed secondary analytics RPCs in InventoryListPage.tsx
Branch: main
Health: TypeScript compilation and Vite build passing (0 errors)
Last Synced: 2026-08-27
ctx: lighthouse audit optimizations | done: bundle chunking & query deferral | next: ready


