<!-- markdownlint-disable MD041 -->
[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Supabase, Cloudflare Workers/R2
Current: Hostinger deploy automation & PostCSS CVE remediation
Done: Hostinger security containment, ADR-001, immutable CI/CD pipeline, staging validation (next.luckystore1947.com), production cutover (www.luckystore1947.com), PR #429 merged, Hostinger deploy fixes, PostCSS CVE-2026-73646 / CVE-2026-104844 patched (postcss@8.5.29, postcss-selector-parser@7.1.6)
Branch: main
Health: All unit/contract tests passing (54 files, 336 tests), 0 tsc errors
Last Synced: 2026-10-07
ctx: Hostinger Deployment & PostCSS Remediation | done: deploy automation + PostCSS patches + standalone zip generated | next: Upload and deploy storefront-release.zip on Hostinger



