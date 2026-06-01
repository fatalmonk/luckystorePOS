# Lucky Store POS

## Stack
React, Flutter, Supabase, Tailwind, TypeScript

## Current
**LCP Optimization**: Inventory page LCP 2,708ms → ~1,200ms. First-row images now load eagerly with fetchpriority=high, overscan reduced (grid 3→1, list 10→5), preload `<link>` injection for viewport images.

**Code Simplification**: Replaced 150+ inline `toLocaleString` calls with centralized `formatCurrency` across 19 files. Removed redundant `useMemo` wrapper in ExpensesPage.

**Vercel Build Fix**: Converted `manualChunks` from object to function (Vite 8/Rolldown compat). Added `ignoreDeprecations: '6.0'` for TS baseUrl.

**Merge Conflicts**: Resolved 4 conflicts merging `main` into `reorganize-project-folder`.

## Done
- LCP optimization: loading=eager + fetchpriority=high on first-viewport product images
- Grid overscan 3→1, list overscan 10→5
- Image preload `<link>` injection after inventory data loads
- `useDeferredValue` for search debounce (render thread offload)
- `formatCurrency` centralization across 19 files
- `vite.config.ts` manualChunks function form fix
- `tsconfig.app.json` ignoreDeprecations: "6.0"
- Removed Wikimedia placeholder image URLs from DB (2 products)
- Merged main w/ conflict resolution (4 files)

## Next
- Awaiting next feature requests

## Blocker
None

---
ctx: LCP + simplification + merge | done: LCP, formatCurrency, Vercel fix, merge conflicts | next: Next feature