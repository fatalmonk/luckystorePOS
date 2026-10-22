# Admin Horizontal Width Constraints — Task List

## Progress

- Inventory sizing code has been reviewed and tightened; focused tests (2 files, 7 tests), typecheck, and production build pass.
- Shell sizing has been traced. A prior 27-route load sweep found no document overflow at 390px, but the reported swipe has not been reproduced in the scoped worktree.
- POS mobile layout is corrected so the product grid uses one bounded column while billing is presented by the existing mobile cart sheet; dashboard/product grid tracks and cells now allow shrinkage.
- Scoped-worktree browser verification is blocked because its local Supabase environment is missing. The existing user session stays untouched.

## Phase 1: Inventory and shell

- [x] **Task 1a — Constrain inventory card/feed sizing.** Review the edits in `InventoryCardFeed.tsx` and `InventoryProductCard.tsx`; grid tracks/cells shrink, titles wrap, currency values wrap without truncation, and the margin badge can move to another row. Focused tests, typecheck, and build pass. Branch-specific narrow/desktop browser confirmation remains open because the scoped worktree has no Supabase environment.
- [x] **Task 1b — Trace shell constraints.** The shell columns and `.main-content` have zero-minimum sizing and bounded width; route-load evidence found no document-width overflow at 390px. The reported swipe still needs reproduction in the scoped worktree.
- [ ] **Task 2 — Reproduce the shell swipe.** Verify the user's horizontal swipe against the scoped worktree, preserving vertical scrolling and intentional local horizontal scrollers.

### Checkpoint: Inventory and shell

- [ ] Inventory content remains readable with long strings and large values.
- [ ] Mobile swipe does not shift the page, or the remaining cause is isolated to a specific element/route.
- [ ] Review results before widening scope.

## Phase 2: Admin route coverage

- [ ] **Task 3 — Audit admin routes for intrinsic-width content.** Build on the existing 27-route, 390px load sweep; inspect desktop and long-content/interacted states, separating reproduced defects from static risks.
- [x] **Task 4a — Correct POS mobile grid sizing.** Remove the fixed mobile billing track; constrain POS shell/product grid and retain the existing cart sheet for billing. Build passes; runtime browser check remains blocked by missing worktree environment.
- [x] **Task 4b — Constrain shared dashboard/product grids.** Replace flexible `1fr` tracks with zero-minimum tracks and constrain direct grid children; preserve the dashboard's intentional mobile horizontal scroller. Build passes.
- [ ] **Task 4c — Fix additional reproduced route boundaries.** Correct only the route-specific sources verified by Task 3; preserve bounded table scrollers.

### Checkpoint: Route coverage

- [ ] All admin routes have recorded mobile and desktop overflow results.
- [ ] Intentional scrollers remain usable and bounded.
- [ ] No new browser console errors appear during the checked routes.
- [ ] Human review before any broader shadcn migration.
