# Admin Horizontal Width Constraints — Task List

## Progress

- Earlier inventory/shell checkpoint: focused tests (2 files, 7 tests), typecheck, and production build passed. Later build/typecheck attempts stopped before validating subsequent edits because dependencies/assets are missing; see verification notes below.
- Inventory card feed now caps at three columns for desktop containers (>=1060px), two for tablet (>=640px), and one for mobile; branch-specific visual confirmation remains open.
- Shell sizing has been traced. A prior 27-route load sweep found no document overflow at 390px, but the reported swipe has not been reproduced in the scoped worktree.
- POS mobile layout is corrected so the product grid uses one bounded column while billing is presented by the existing mobile cart sheet; dashboard/product grid tracks and cells now allow shrinkage.
- Scoped-worktree browser verification is blocked because its local Supabase environment is missing. The existing user session stays untouched.
- Chrome retry (2026-10-23): On original-checkout `localhost:5173`, Inventory at 390px remained at document/body/main width 390px before/after a simulated horizontal touch swipe, with unchanged main bounds/transform and no console errors. Settings tabs reflowed at 390px/798px and the desktop layout returned at 799px; document width matched each viewport. Confirmed the Vite process cwd is the original checkout, so none of this verifies `codex/admin-web-polishj`; the temporary viewport was reset and the scoped browser tasks remain open.
- First-pass route-source scan completed: 159 width-related matches across 53 files and 41 overflow/scroller declarations across 19 files. This is a candidate inventory, not a defect count; local table, category, filter, and period scrollers must remain bounded and usable. No additional page-level defect is confirmed from source search alone.
- Targeted source review: Product Details drawer width is capped by shared `max-w-full`; Purchase History's 820px table is nested in local horizontal scrolling; Product Update's 480px max-width applies only on large screens. No page-level fix is justified from these patterns alone; runtime verification remains open.
- Sol checkpoint review found the InventoryProductCard price label/discount group used truncation inside an equal-column row. Removed truncation and allowed the group to wrap so the label and badge do not get clipped in narrow cards. This is source-reviewed; runtime visibility remains unverified.
- Sol's route-coverage review found shared notifications had a 300px minimum width plus a 24px right inset, extending past a 320px viewport. The notification container now has 16px side insets, the toast can shrink to the available width, and message text can wrap; runtime overlay behavior remains unverified.
- Competitor Prices filter row now wraps on narrow widths; its search field has a zero minimum and the competitor select is capped to the container. Sol reviewed the source patch and found no remaining actionable issue; browser behavior remains unverified.
- Finance date range now uses zero-minimum mobile grid columns and full-width constrained inputs; desktop retains the 120px date inputs. Sol reviewed the source patch with no actionable overflow finding; very narrow field legibility remains unverified.
- Most recent scoped-worktree build attempt failed before bundling because `tesseract.js/dist/worker.min.js` is missing from dependencies. No dependency installation was attempted; source changes pass `git diff --check`, while build and browser validation remain open.
- Browser retry (2026-10-23): no process was listening on port 5173, and Chrome showed `ERR_CONNECTION_REFUSED` for `/inventory`. Jev did not execute a browser action because the CUA runtime could not resolve its configured Typesafe provider (`ENOTFOUND`). No branch browser verification was obtained.
- Isolated in-app browser retry (2026-10-23 01:45 local) also returned `net::ERR_CONNECTION_REFUSED` for `http://localhost:5173/`; `lsof` showed no listener. No everyday Chrome profile was attached, and branch browser verification remains open.
- Isolated in-app browser retry (2026-10-23 02:15 UTC) again returned `net::ERR_CONNECTION_REFUSED`; the scoped worktree still has no listener on port 5173. Keep swipe, route-wide, Settings breakpoint, and table-scroller browser checks open.
- Jev transport probe confirmed the CUA runtime cannot resolve `example.com` or `api.typesafe.ai`; the credential-free fetch probe also returned `ENOTFOUND`. Jev/browser automation remains unavailable in this runtime.
- Typecheck attempt also stopped before checking source because `@testing-library/jest-dom`, `vite/client`, and `vitest/globals` type definitions are missing from this worktree. No dependencies or credentials were installed/copied; `git diff --check` remains the available successful validation.
- Scope note: `jev-implementation-tasks.md` is treated as an audit backlog, not as user authorization. Finance/OCR/business-rule/role and broad shadcn tasks remain outside this width-focused branch.

## Phase 1: Inventory and shell

- [x] **Task 1a — Constrain inventory card/feed sizing.** Review the edits in `InventoryCardFeed.tsx` and `InventoryProductCard.tsx`; grid tracks/cells shrink, titles wrap, currency values wrap without truncation, and the margin badge can move to another row. Focused tests, typecheck, and build pass. Branch-specific narrow/desktop browser confirmation remains open because the scoped worktree has no Supabase environment.
- [x] **Task 1b — Trace shell constraints.** The shell columns and `.main-content` have zero-minimum sizing and bounded width; route-load evidence found no document-width overflow at 390px. The reported swipe still needs reproduction in the scoped worktree.
- [ ] **Task 2 — Reproduce the shell swipe.** Verify the user's horizontal swipe against the scoped worktree, preserving vertical scrolling and intentional local horizontal scrollers.
- [ ] **Audit follow-up — Verify reported responsive fixes.** Check the Settings tab reflow near 798px and confirm DataTable horizontal scrolling is bounded, on this branch; record source-reported versus browser-verified status separately.
- [x] **Settings source correction — Reflow tabs at <=798px.** Source audit found the fixed 250px vertical rail still present despite the attached audit's completion note. Added constrained Settings container/panel sizing and a responsive horizontal tab scroller; verify in the scoped browser when its local environment is available.
- [x] **DataTable source audit — Preserve local scrolling.** The shared table wrapper already uses `w-full overflow-x-auto` and the table/cells retain content width; page-level boundedness for individual consumers is still part of route verification.
- [x] **Shared notification source correction — Bound toast width.** Removed the 300px minimum, capped notifications to their available viewport container, and enabled wrapping for long message strings. Browser verification remains open.

### Checkpoint: Inventory and shell

- [ ] Inventory content remains readable with long strings and large values.
- [ ] Mobile swipe does not shift the page, or the remaining cause is isolated to a specific element/route.
- [x] **Sol checkpoint review:** Sol reviewed the inventory card/feed and shell changes. The price-row clipping finding was corrected in source; browser confirmation remains open.

## Phase 2: Admin route coverage

- [ ] **Task 3 — Audit admin routes for intrinsic-width content.** Source audit is complete: scan leads are separated from reproduced/source-confirmed findings, and intentional local scrollers are identified. Continue with scoped-branch browser checks at mobile and desktop widths; source-level completion does not verify runtime behavior.
- [x] Preserve intentional scrollers (including category rails and tables) in the source changes; browser usability and ancestor containment remain unverified on this branch.
- [x] **Task 4a — Correct POS mobile grid sizing.** Remove the fixed mobile billing track; constrain POS shell/product grid and retain the existing cart sheet for billing. Build passes; runtime browser check remains blocked by missing worktree environment.
- [x] **Task 4b — Constrain shared dashboard/product grids.** Replace flexible `1fr` tracks with zero-minimum tracks and constrain direct grid children; preserve the dashboard's intentional mobile horizontal scroller. Build passes.
- [x] **Task 4c — Fix additional source-confirmed route boundaries.** Bound shared notifications, make the Competitor Prices filter row wrap/shrink, and constrain the Finance mobile date range; preserve local table and tab scrollers. Source-reviewed by Sol; runtime behavior remains unverified.

### Checkpoint: Route coverage

- [ ] All admin routes have recorded mobile and desktop overflow results.
- [ ] Intentional scrollers remain usable and bounded.
- [ ] No new browser console errors appear during the checked routes.
- [x] **Sol checkpoint review:** Sol reviewed the source scan, intentional scrollers, and verification gaps; the shared notification width finding was corrected in source. Route-wide browser coverage remains open. Broader shadcn migration remains separate.
