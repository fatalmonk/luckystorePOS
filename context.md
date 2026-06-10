# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**Inventory Card Visibility Fix (Main Branch)**
- Fixed `border-warm-border-warm` → `border-warm` (invalid class)
- Fixed `text-warm-muted` → `text-warm-fg` for metrics row contrast
- Card now shows: image, name (2-line clamp), stock badge, stock count, price (৳), SKU
- Hover state: scale + cursor-pointer | Top-left checkbox for selection
- Committed and pushed to main (a0c1f97)

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
ctx: Card visibility fixed | done: 5 | next: verify prod deployment
