[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Resolved code review violations for PR #442 (Meta Pixel consent gating, Bengali titles, r2 error handling, landing asset alignment)
Done: Consent-gated Meta Pixel with client route tracking, preserved Bengali product titles, deduplicated r2 error extraction with Response check, aligned landing metadata to apex host, all 381 storefront and 118 admin tests pass
Branch: feat/catalog-enrichment-and-faq-ld
Health: 118 admin_web tests pass (19 files), 381 storefront tests pass (66 files), 0 typecheck errors
Last Synced: 2026-10-11
ctx: PR #442 review feedback resolved | done: 6 review violations addressed | next: review & merge PR #442
