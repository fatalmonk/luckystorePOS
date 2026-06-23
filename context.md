# Lucky Store POS
Stack: Next.js 15 App Router, TS 5.9, Tailwind v3, Supabase, Node 24, Playwright
Current: none
Done: replaced Next.js Image with plain img in storefront; backed up all 72 database tables; pruned old import_runs and idempotency_keys; executed VACUUM ANALYZE to clear all dead tuples; backed up images; pushed updated items to Supabase and removed inventory_items table
Blocker: none
Next: update app configuration to use new Supabase DB and verify storefront/POS functionality
---
ctx: pushed items to Supabase & removed inventory_items | done: 6 | next: update app config & verify storefront/POS