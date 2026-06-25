# Lucky Store POS
Stack: Next.js 15 App Router, TS 5.9, Tailwind v3, Supabase, Node 24, Playwright
Current: none
Done: replaced Next.js Image with plain img in storefront; backed up all 72 database tables; pruned old import_runs and idempotency_keys; executed VACUUM ANALYZE to clear all dead tuples; backed up images; pushed updated items to Supabase and removed inventory_items table; created agent worker, vitest tests, resolved ESLint CI configuration errors, resolved all 25 repository, gateway, and configuration violations, resolved storefront ESLint dependencies and invalid rules, aligned admin web Vercel configuration with UI root directory settings, and updated and deployed neon-proxy worker to allow CORS requests from the new admin web domains
Blocker: none
Next: verify successful CI/CD pipeline run and test Cloudflare worker routing
---
ctx: updated neon-proxy allowed origins and deployed | done: 11 | next: verify CI run & test routing