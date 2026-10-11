[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Committed env template sanitization and gitignore security rules
Done: Sanitized customer_storefront/.env.example with standard placeholders, verified secret_scan passes clean (0 leaks), committed 8f5fb452
Branch: feat/catalog-enrichment-and-faq-ld
Health: 118 admin_web tests pass (19 files), 387 storefront tests pass (67 files), 0 typecheck errors, secret scan green
Last Synced: 2026-10-12
ctx: env security committed | done: commit 8f5fb452 | next: push branch & open PR for feat/catalog-enrichment-and-faq-ld
