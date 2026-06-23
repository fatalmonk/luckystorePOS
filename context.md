# Lucky Store POS
Stack: Next.js 15 App Router, TS 5.9, Tailwind v3, Supabase, Node 24, Playwright
Current: verify Neon DB connection and plan migrations
Done: replaced Next.js Image with plain img in storefront; backed up all 72 database tables; pruned old import_runs and idempotency_keys; executed VACUUM ANALYZE to clear all dead tuples; backed up images
Blocker: none
Next: run schema migration on Neon DB
---
ctx: database & images backed up | done: 5 | next: run schema migration on Neon DB