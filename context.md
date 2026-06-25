# Lucky Store POS
Stack: Next.js 15 App Router, TS 5.9, Tailwind v3, Supabase, Node 24, Playwright
Current: setup agent worker CI/CD pipeline fixes
Done: replaced Next.js Image with plain img in storefront; backed up all 72 database tables; pruned old import_runs and idempotency_keys; executed VACUUM ANALYZE to clear all dead tuples; backed up images; pushed updated items to Supabase and removed inventory_items table; created agent worker, vitest tests, and resolved ESLint CI configuration errors
Blocker: none
Next: verify successful CI run and test Cloudflare worker routing
---
ctx: fixed agent worker ESLint CI configuration and updated node-version | done: 7 | next: verify CI run & test routing