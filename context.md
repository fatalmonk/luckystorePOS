[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Fixed PR #442 cubic review comments (Meta Pixel sensitive route filtering, duplicate PageView elimination, immediate stub init)
Done: Consent-gated Meta Pixel immediate stub init, removed duplicate reload invocation, skipped sensitive query routes, added MetaPixel unit tests, all 385 storefront and 118 admin tests pass
Branch: feat/catalog-enrichment-and-faq-ld
Health: 118 admin_web tests pass (19 files), 385 storefront tests pass (67 files), 0 typecheck errors
Last Synced: 2026-10-12
ctx: PR #442 review feedback resolved and tested | done: cubic review violations resolved | next: review & merge PR #442
