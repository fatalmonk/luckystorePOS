[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Addressed PR review feedback on .gitignore wildcard negations and scanner coverage
Done: Restricted .gitignore template allowlist to explicit filenames, updated secret_scan.js to scan all .example files, added self-test (29/29 pass), verified secret_scan clean
Branch: feat/catalog-enrichment-and-faq-ld
Health: 118 admin_web tests pass (19 files), 387 storefront tests pass (67 files), 0 typecheck errors, secret scan green
Last Synced: 2026-10-12
ctx: PR review feedback addressed | done: explicit .gitignore & full .example scanning | next: push updates to PR #443
