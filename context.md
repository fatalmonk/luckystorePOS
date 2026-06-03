# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**Inventory Inline Editing — Production Fixes (Merged PR #182)**
- Fixed RLS: Restored `items_manage_authorized` policy (dropped by prior migration)
- Fixed PGRST204: Removed non-existent `last_purchased_date` from update payload
- Fixed `set_stock` RPC: Changed reason from `'Inline stock edit'` → `'correction'` (valid enum)
- Fixed `get_low_stock_items` RPC: `i.active` → `i.is_active` column reference
- Fixed Vercel PWA: Added rewrite rules for `sw.js`, `manifest.json`, PWA icons
- Removed legacy `store_id` filters on tenant-scoped `items` table
- Fixed `tsconfig.app.json` path aliases (relative `./src/*`)
- Fixed `seed.sql` to match current schema (`is_active`, removed invalid columns)
- DB migrations pushed to remote: `20260603223000`, `20260603232500`
- Build: ✅ passing, merged to main

## Previous
- Purchase Receiving: Fixed `record_purchase_v2` to update `items.cost`
- Inventory Dashboard: Phases 1-4 complete (inline editing, component extraction, type centralization)

## Done
- PR #182 merged (inventory-ui-ux-improvements)
- RLS policies restored on production DB
- Vercel routing fixed for PWA assets
- CI pipeline credentials fixed
- All inline edit errors resolved (price, cost, mrp, stock qty)

## Next
- Verify Vercel deployment with all fixes live
- Monitor for any remaining RPC 400 errors

## Blocker
None

---
ctx: PR#182 merged | RLS+RPC+Vercel fixed | done: 8 | next: verify production
