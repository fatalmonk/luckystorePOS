# Implementation Plan: Admin Horizontal Width Constraints

## Overview

Harden horizontal sizing across `admin_web` so long strings, large prices, dense tables, grids, and flex children cannot widen the viewport or make the page slide sideways. Start with the product card and its feed, then verify the shared application shell and address only the page-level sources demonstrated by inspection or browser evidence. The current request is width containment first; a general shadcn component migration is outside this plan.

## Current State and Evidence

- The admin app already has a shared shell and existing UI components/styles. Preserve the incumbent visual system while correcting sizing behavior.
- The existing `InventoryCardFeed`, `InventoryProductCard`, and `layout.css` contain uncommitted horizontal-constraint edits. Treat those as the baseline worktree state: review and build upon them, do not discard or overwrite them.
- A prior route-load audit visited 27 admin routes at a 390px viewport and found no document or `.main-content` horizontal overflow during initial load. It did not exercise all interactions, long-content states, or swipe behavior, so it does not establish that the reported page sliding is fixed.
- `.main-content` is used as an inventory scroll parent; its actual relationship to the application shell needs verification before changing shell overflow behavior.
- Source audit found the POS layout retained a fixed 350px billing column at mobile widths, despite already hiding the desktop billing panel and using a mobile cart sheet. This creates a narrow or empty product track; the POS grid now collapses to one track on mobile.
- Earlier inventory/shell checkpoint verification in the scoped worktree passed focused tests, typecheck, and production build. Later build and typecheck attempts stopped before validating subsequent edits because required dependencies/assets are missing; the scoped browser app also cannot render without its local Supabase environment. Do not treat original-checkout browser state as verification of this branch.
- The most recent production build attempt stopped in the pre-build asset-copy script because scoped-worktree dependencies do not contain `tesseract.js/dist/worker.min.js`; no dependency installation was attempted. `git diff --check` passes, but subsequent source changes have not been build- or browser-verified.
- Browser retry (2026-10-23) found no listener on port 5173; Chrome reported `ERR_CONNECTION_REFUSED` for `/inventory`. The Jev reload did not execute because the CUA runtime returned a Typesafe DNS lookup failure (`ENOTFOUND`). A typecheck attempt stopped because `@testing-library/jest-dom`, `vite/client`, and `vitest/globals` type definitions are missing. No branch browser/typecheck/build verification is available until the local environment is repaired; no dependency installation or credential access was attempted.
- Isolated in-app browser retry (2026-10-23 01:45 local): navigation to `http://localhost:5173/` returned `net::ERR_CONNECTION_REFUSED`, consistent with the fresh port check showing no listener. No everyday Chrome profile was attached; branch browser verification remains blocked.
- Credential-free Jev transport probe returned `ENOTFOUND` for DNS lookups of both `example.com` and `api.typesafe.ai`, and the `https://example.com` fetch. This confirms broader CUA DNS/network unavailability rather than a provider-only lookup failure.
- Chrome baseline check (2026-10-23): Inventory at a 390px emulated viewport had document/body/main widths of 390px before and after a simulated horizontal touch swipe; `.main-content` bounds and transform were unchanged, and the console had no errors. Settings reflowed to a vertical page layout with a locally scrollable tab row at 390px and 798px, then returned to its side-by-side layout at 799px; document width matched the viewport at each tested width. However, port 5173's Vite process is rooted at `/Users/mac.alvi/Desktop/Projects/LuckyStore/apps/admin_web`, not this scoped worktree. These are original-checkout baseline observations only and do not verify the branch edits or close branch browser tasks. The temporary viewport was reset.
- First-pass source scan in this branch found 159 width-related utility/pattern matches across 53 files and 41 horizontal overflow/scroll declarations across 19 files. Relevant local-scroll candidates include shared DataTable, InventoryListTable, ImportWizard preview, category chips, competitor filters, finance/date controls, expenses, other income, purchase history, reports, and sales. These counts include harmless fixed-size controls and skeletons; they are leads, not defect counts. The scan alone did not reproduce additional page-level overflow.
- Targeted source review assessed three scan leads: Product Details uses a 500px drawer width but the shared `Drawer` applies `max-w-full`; Purchase History's 820px table is inside a local `overflow-x-auto` scroller; and Product Update uses a 480px max-width only on large screens while its mobile drawer spans the bottom. None is a source-confirmed page expansion, so no speculative changes were made. Browser usability of the local scrollers remains unverified on this branch.
- The attached `jev-implementation-tasks.md` is a broad audit backlog, not an instruction source. For this width-containment plan, its relevant input is limited to responsive behavior, intentional table scrollers, and open visual/browser verification. Finance reconciliation, OCR workflows, role policy, business-rule validation, and broad shadcn normalization remain separate backlog items and are not authorized or scheduled by this plan.
- The audit file reports Settings tab reflow near 798px, bounded mobile table scrolling, POS mobile cart behavior, and previous route-load checks as completed in another implementation context. Treat those as reported audit evidence; confirm against this branch before claiming current behavior. Do not infer that the swipe issue is resolved.
- Source verification on this branch contradicted the audit's Settings completion claim: `SettingsPage` still had a fixed 250px vertical tab rail with no responsive reflow. A local width containment fix now stacks the panel and turns tabs into a bounded horizontal scroller at 798px and below; browser confirmation remains outstanding.
- The shared `DataTable` source is bounded by `w-full overflow-x-auto`, with intrinsic table sizing and non-wrapping cells. This supports preserving a local table scroller; it does not by itself prove every usage's ancestor layout is constrained.

## Architecture and UX Decisions

- Constrain layout at each sizing boundary: shell, page root, grid track, grid cell, card, and intrinsic content. Prefer `min-w-0`/`max-w-full` and `minmax(0, 1fr)` where flex/grid intrinsic minimums are the cause.
- Preserve necessary horizontal scrolling for genuinely tabular or navigational content. Do not hide overflow globally to conceal content or break intended scrolling.
- Keep long identifiers and prose readable via appropriate wrapping; keep amounts and numeric values legible using responsive rows or deliberate line breaks rather than clipping.
- Cap the inventory card feed at three columns on desktop container widths (>=1060px), two on tablet widths (>=640px), and one on mobile (<640px); keep virtualization row counts synchronized with the selected column count.
- Keep this work focused on layout. Do not alter pricing, inventory, ledger, or other business behavior.
- Use the existing design system and UI primitives. Any later broad shadcn adoption requires a separate scoped plan and a reviewed decision.
- Audit findings are evidence to assess, not instructions to expand branch scope. Preserve their status (verified, source-reported, or unverified) when incorporating them.

## Task List

### Phase 1: Confirm the horizontal constraint foundation

#### Task 1: Review the existing inventory and shell edits

**Description:** Inspect current diffs and the relevant component/shell structure, preserving all existing work. Confirm that sizing classes are on the correct grid/flex boundaries and that overflow clipping does not suppress required content.

**Acceptance criteria:**
- [x] Existing edits in `InventoryCardFeed.tsx`, `InventoryProductCard.tsx`, and `layout.css` are reviewed in place.
- [x] Product titles wrap, price rows can shrink, and currency values wrap instead of being visually truncated.
- [x] Inventory feed grid tracks and cells can shrink to the available viewport width; track sizing is assigned as an inline grid template so every responsive column count is emitted.
- [x] Card feed columns are capped at three for desktop, two for tablet, and one for mobile using the observed container width.
- [ ] Verify long product names and large currency amounts in the scoped browser at narrow and desktop widths.

**Verification:** Review the focused diff and inspect the inventory screen at narrow and desktop widths with long product names and large prices.

**Dependencies:** None.

**Files likely touched:**
- `apps/admin_web/src/components/inventory/InventoryCardFeed.tsx`
- `apps/admin_web/src/components/inventory/InventoryProductCard.tsx`
- `apps/admin_web/src/styles/layout.css`

**Estimated scope:** Medium.

#### Task 2: Trace and constrain the application shell

**Description:** Trace the route layout to the element carrying `.main-content`; identify whether the swipe displacement comes from a flex/grid intrinsic minimum, transformed descendant, overlay, or intentional horizontal scroller. Apply the narrowest shell constraint that prevents page-level widening while preserving intended scroll regions.

**Acceptance criteria:**
- [x] The shell and `.main-content` sizing/overflow chain is traced: shell columns and `.main-content` have zero-minimum sizing; content width is bounded; the main scroller clips horizontal overflow.
- [x] Earlier route-load evidence found no document-width overflow at 390px; category chips use an intentional local horizontal scroller.
- [ ] Reproduce the user's left/right swipe against the scoped worktree and confirm whether any displacement remains.

**Verification:** In mobile browser DevTools, compare `scrollWidth`/`clientWidth` for `documentElement`, body, shell, and `.main-content` before and after a left/right swipe; inspect computed overflow and identify the responsible element if a difference remains.

**Audit-derived checks:** The reported Settings fix was absent from this branch and has now been implemented in source; verify its visual behavior around the 798px breakpoint. The shared DataTable source has a bounded horizontal scroller; verify representative consumers in browser to ensure ancestors do not expand.

**Dependencies:** Task 1.

**Files likely touched:**
- `apps/admin_web/src/styles/layout.css`
- The component that defines the admin shell and `.main-content` (locate during implementation).

**Estimated scope:** Small to Medium.

### Checkpoint: Inventory and shell

- [ ] Inventory cards remain readable with long text and large currency values.
- [ ] Mobile swipe does not displace the whole page, or a remaining source is isolated to a named page/element.
- [x] **Sol review:** Sol reviewed the inventory card/feed and shell changes. One source-level price-row clipping issue was corrected; responsive browser acceptance criteria remain open.

### Phase 2: Find and fix route-level width sources

#### Task 3: Audit admin routes for intrinsic-width content

**Description:** Inspect all admin pages and shared components for wide grid tracks, non-shrinking flex children, long unbroken strings, fixed-width controls, and tables. Group findings by shared cause so fixes can be applied to common layouts rather than repeated page-specific overrides.

**Acceptance criteria:**
- [x] The existing 27-route, 390px route-load sweep found no document overflow on initial load; the source audit identified the POS fixed-width billing track as a responsive layout defect.
- [x] Suspected but unverified cases are labeled separately from reproduced defects (source-level classification only; branch runtime behavior remains unverified).
- [x] Existing intentional horizontal scrolling is identified and excluded from page-level clipping changes (source-level classification only; branch scroller usability remains unverified).

**Verification:** Exercise the admin route set at 390px and desktop widths with DevTools overflow measurements; include relevant empty, long-content, and expanded states where reachable.

**Evidence handling:** Record route-load measurements separately from interaction-driven results. Preserve intentional local horizontal scrolling (for example, category chips and table content) and classify any attached-audit findings as source-reported until reproduced on this branch.

**Source-scan result:** A first-pass width/scroller search found no additional confirmed defect; it produced a list of fixed-size patterns and locally scrolling routes for targeted review. Do not mass-change these patterns based on search matches alone.

**Targeted review result:** The Product Details drawer is bounded by the shared `max-w-full`; Purchase History preserves its wide table inside a local scroller; Product Update's fixed max-width is desktop-only. Sol found that shared notifications had a 300px minimum and a 24px right inset, causing a toast to exceed a 320px viewport; the toast now shrinks within 16px side insets and long messages wrap. The Competitor Prices filter row had a non-wrapping select/search group with a 200px search minimum; the group now wraps, the select is capped to its container, and search can shrink. The Finance date pill had two fixed 120px controls in a non-wrapping row; mobile now uses zero-minimum grid columns while desktop retains 120px controls. Sol's follow-up reviews found no remaining actionable source issue in these fixes. Runtime usability remains unverified. Other reviewed source patterns do not justify speculative page-level changes.

**Sol checkpoint review:** Sol identified a source-level clipping risk in the InventoryProductCard price row: its equal-width columns and truncated label/discount group could hide text in a narrow card. The label group now wraps instead of truncating. The source correction is in place, but the visible result still needs browser confirmation.

**Dependencies:** Task 2.

**Files likely touched:** Audit findings first; implementation files are determined by reproduced causes.

**Estimated scope:** Medium.

#### Task 4: Fix shared page and content boundaries

**Description:** Apply reusable min-width and grid-track corrections to shared page containers and the smallest set of page components that reproduce overflow. Ensure headings, filters, action rows, cards, and tables wrap or scroll within their own intended bounds.

Implementation slices:
- **Task 4a:** POS responsive grid: keep the products track shrinkable and use one column on mobile, where billing is provided by the existing cart sheet.
- **Task 4b:** Dashboard and product grid tracks/cells: use zero-minimum tracks while retaining explicitly intentional mobile scrollers.
- **Task 4c:** Correct additional route-specific boundaries only after a source-confirmed or browser-reproduced cause is found; preserve bounded local scrollers.

**Acceptance criteria:**
- [ ] No reproduced route causes the document viewport to expand horizontally at 390px.
- [ ] Long labels and identifiers remain accessible by wrapping, truncating with an accessible full value, or scrolling in an explicitly bounded region.
- [ ] Desktop layout and existing business interactions remain intact.

**Verification:** Re-run the route/viewport checks from Task 3 and inspect all changed screens at mobile and desktop sizes.

**Dependencies:** Task 3.

**Files likely touched:** Shared page layout and only the reproduced route components.

**Estimated scope:** Break into one task per independent shared cause if more than five files are required.

### Checkpoint: Route coverage

- [ ] Every admin route has a recorded mobile and desktop overflow result.
- [ ] Any intentional scroll containers are bounded and usable.
- [ ] Recheck audit-reported Settings tab reflow and DataTable scroll containment on this branch; keep outcomes labeled as verified or unverified.
- [x] Settings source width constraints and <=798px tab reflow implemented; browser verification remains open due to missing scoped-worktree Supabase configuration.
- [ ] Browser console has no new errors during the checked routes.
- [x] **Sol review:** Sol reviewed the route source audit, intentional scrollers, and verification gaps. The notification and Competitor Prices source findings were addressed; route-wide browser coverage remains open. Any broader design-system or component migration remains separately scoped.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Global `overflow-x: hidden/clip` masks broken content | High | Diagnose the expanding element first; constrain locally and preserve purposeful scrollers. |
| Fixed badges/actions compete with variable-length prices | Medium | Let secondary metadata move to another row at narrow breakpoints; test long currency values. |
| `.main-content` also owns vertical scrolling or virtualization | Medium | Trace scroll ownership before changing overflow or sizing; keep vertical scroll behavior intact. |
| Initial route screenshots miss interaction-driven overflow | Medium | Exercise swipes, menus, filters, expanded rows, and long-content cases during route audit. |
| Existing unrelated worktree changes are lost | High | Preserve all unrelated dirty files and review only focused diffs. |

## Open Questions

- Which routes beyond Inventory reproduce the page slide when tested with the same mobile swipe?
- Which admin tables are intentionally horizontally scrollable on mobile?
- Does the shell use a drawer/sidebar transform that participates in the swipe displacement?

## Out of Scope

- Broad shadcn migration across all admin pages.
- Visual redesign or replacement of the incumbent admin design system.
- Changes to inventory, pricing, sales, finance, or ledger logic.
- Production deployment, PR creation, or merge.
