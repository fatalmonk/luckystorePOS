# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**Inventory Card Refactor + Parallel Stock Lookups (Main Branch)**
- InventoryProductCard: complete rewrite, removed image upload/edit panel, inline stock/price editing, compact layout, lucide Package icon, aspect-square image
- InventoryListPage: virtualizer estimateSize 320→340
- usePosSale: parallel stock lookups via Promise.all
- Committed and pushed to main (e820bdd)

## Previous
**Production Stability Fixes**
- Fixed `set_stock` RPC reason, Vercel PWA assets, SW caching, Manifest
- Inventory inline editing: RLS, PGRST204, `get_low_stock_items` RPC fixes

## Done
- Inventory card visibility fix (a0c1f97)
- PR #182 merged, PWA bugs fixed, inline edit errors resolved

## Next
- Verify Vercel deployment with card fix
- Check production inventory grid renders correctly

## Blocker
None

---
ctx: Card refactor + parallel lookups pushed | done: 6 | next: verify prod deployment
