[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: PR 435 Complete Issue Remediations
Done: Fixed cart zero-stock adds & clamping, catalog complete search pagination, WCAG headers & labels across order/wishlist/account/product/category/shop screens, direct slug/UUID routing in mobile product resolver, real delete flow handling with alerts, secure session persistence via expo-secure-store, guest order token preservation, RPC price pagination in checkout, trusted IP rate limiting & map bounding, mobile Bearer token checkout client, orderNumber preservation across retries, 8+ char alphanumeric trivial-blocked password policy, CORS headers on mobile API routes, chunked translation queries to eliminate HeadersOverflowError
Branch: codex/customer-mobile-app
Health: 0 tsc errors across workspaces, 63 storefront vitest files / 364 tests passing, 23 customer_mobile unit tests passing
Last Synced: 2026-10-08
ctx: PR 435 issue fixes complete & dev server CORS configured | done: all fixes pushed | next: reload Expo app to verify products load

