[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: PR 435 Complete Issue Remediations
Done: Fixed multiple header rows & consolidated storefront-style header (logo, menu, search, language, cart + category pills), replaced NativeTabs with standard bottom Tabs, resolved 10 PR review issues (storage memory fallback & guest token pruning, checkout UUID validation & bounded price lookup, auth hydration generation race guard, cart maxStock lower-stock precedence, stepper accessibility actions, checkout session hydration gate, wishlist accessibility label, product 404 error logging, bearer token removal from navigation params)
Branch: codex/customer-mobile-app
Health: 0 tsc errors, 63 vitest files (364 tests) pass, 23 customer_mobile tests pass
Last Synced: 2026-10-08
ctx: Storefront header consolidated & all PR 435 issues resolved | done: 10 violations fixed, unified header shipped | next: push to PR 435

