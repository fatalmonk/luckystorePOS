# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**Production Stability Fixes (Main Branch)**
- Fixed `set_stock` RPC: Changed reason from `'Inline stock edit'` → `'correction'` (pushed directly to main)
- Fixed Vercel PWA assets: Added rewrite rules for `sw.js` and `manifest.json` in `vercel.json`
- Fixed SW caching: Updated `OFFLINE_URL` in `sw.ts` to use relative path `offline.html` instead of absolute `/offline.html`
- Fixed Manifest: Used relative icon paths and `/admin/` start_url
- Verified all recent UI/UX fixes merged to main

## Previous
**Inventory Inline Editing — Production Fixes (Merged PR #182)**
- Fixed RLS: Restored `items_manage_authorized` policy
- Fixed PGRST204: Removed `last_purchased_date` from payload
- Fixed `get_low_stock_items` RPC: `i.active` → `i.is_active`
- DB migrations pushed to remote: `20260603223000`, `20260603232500`

## Done
- PR #182 merged (inventory-ui-ux-improvements)
- Stale PR branches cleaned up
- PWA deployment and caching bugs fixed
- Inline edit stock adjustment errors resolved

## Next
- Verify new Vercel deployment completes successfully
- Monitor for any remaining PWA/SW caching issues

## Blocker
None

---
ctx: Main branch stabilized | done: 4 | next: verify deployment
