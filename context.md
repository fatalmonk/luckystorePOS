# Lucky Store POS
Stack: Next.js 15 App Router, TS 5.9, Tailwind v3, Supabase, Node 24, Playwright
Current: restore Supabase subscription to lift block and run image backup
Done: replaced Next.js Image with plain img in storefront; backed up all 72 database tables; pruned old import_runs and idempotency_keys; executed VACUUM ANALYZE to clear all dead tuples
Blocker: Supabase storage returns 402 Payment Required
Next: pay/upgrade Supabase subscription to backup images
---
ctx: database pruned & backed up | done: 4 | next: restore supabase and run image backup