[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Fixed image upload authorization in admin_web inventory dashboard
Done: Deployed issue-image-upload-ticket and publish-product-image edge functions, synchronized UPLOAD_SIGNING_SECRET to Cloudflare Worker and Supabase, improved r2.ts error propagation, 118 admin_web tests pass
Branch: feat/catalog-enrichment-and-faq-ld
Health: 118 admin_web tests pass (19 files), 381 storefront tests pass (66 files), 0 typecheck errors
Last Synced: 2026-10-11
ctx: Image upload authorization unblocked | done: edge functions deployed, secrets synchronized, error extraction added | next: test live upload in admin panel
