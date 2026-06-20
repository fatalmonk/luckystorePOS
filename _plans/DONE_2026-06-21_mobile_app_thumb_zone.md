# Implementation Plan: Thumb Zone & Touch Target Fixes

## Overview
Fix critical thumb-reach violations and sub-48px touch targets across the Lucky Store mobile app, prioritized by business impact. Three core problems: ManagerShell 9-item bottom nav (P1), tiny CartPanel touch targets (P0/WCAG violation), and top-bar action placement in hard thumb zones.

## Business Objectives
- Reduce mis-taps on manager shell → faster tab switching, less frustration for 9-item nav
- Fix WCAG 2.1 AA touch target violations → fewer accidental cart item removals and qty errors
- Reposition primary nav controls → reduce time-to-first-product-interaction on customer app
- Increase add-to-cart rate → smaller, unreachable targets are friction

## Success Metrics
- ManagerShell bottom nav: items ≥48px wide (WCAG 2.1 AA)
- CartPanel: all tap targets ≥44px (WCAG 2.1 AA)
- Primary navigation (hamburger) moved from top-left to thumb-accessible zone

## Architecture Decisions
- Group ManagerShell tabs into 4 primary + "More" sheet (standard Material BottomNavigationBar pattern)
- Enlarge CartPanel qty buttons and remove icon via BoxConstraints.minWidth/minHeight (no layout restructure)
- Remove print-label button from customer-facing ProductCard (manager feature, not customer feature)
- Move drawer access to 4th bottom-nav tab, eliminate top-left hamburger

## Task List

### Phase 1: P0 Fixes — WCAG 2.1 AA Touch Targets (6 tasks)

#### Task 1.1: Enlarge CartPanel remove button (24→44px)
**Description:** Remove item button in `_CartItemTile` is ~24px tap target. Enlarge to 44×44px minimum.
**Acceptance criteria:**
- [ ] Remove icon container is ≥44×44px
- [ ] Tap area covers full 44×44px without visual change to existing layout
- [ ] `flutter test` still passes
**Verification:** `flutter analyze` + visual check on device
**Dependencies:** None
**Files touched:** `cart_panel.dart` (_CartItemTile remove IconButton)
**Scope:** S — 1 file

#### Task 1.2: Enlarge CartPanel qty buttons (32→44px)
**Description:** Qty +/− buttons in `_buildQtyControl` are 32×36px. Enforce 44×44px min.
**Acceptance criteria:**
- [ ] Minus/plus button containers ≥44×44px
- [ ] Layout still works within cart item tile row
- [ ] No overflow on small screens (test 320px width)
**Verification:** `flutter analyze` + layout test on 320px device
**Dependencies:** Task 1.1
**Files touched:** `cart_panel.dart` (_buildQtyControl, _qtyButton)
**Scope:** S — 1 file

#### Task 1.3: Remove print-label button from customer ProductCard
**Description:** Top-right print button (32px) on customer ProductCard is a manager-only feature shown to all users. Remove the `Positioned(top: 8, right: 8)` print icon block.
**Acceptance criteria:**
- [ ] Print icon no longer appears in shop ProductCard
- [ ] Manager POS ProductTile (in `product_grid.dart`) still has its own UI unaffected
- [ ] No import errors from removing `label_printer_screen` reference
**Verification:** `flutter analyze` + run app, confirm product cards show no print button
**Dependencies:** None
**Files touched:** `product_card.dart`
**Scope:** S — 1 file

### Checkpoint: Phase 1
- [ ] `flutter analyze` passes with no new errors
- [ ] All CartPanel tap targets ≥44px
- [ ] Customer ProductCard has no print button

### Phase 2: P1 Fixes — Navigation Layout (4 tasks)

#### Task 2.1: Replace ManagerShell 9-tab bottom nav with 4 primary + "More" sheet
**Description:** Refactor portrait bottom nav from 9 items to 4 primary: POS, Dashboard, Inventory, More. "More" opens a bottom sheet grid with the remaining 5 tabs (Labels, Dues, Purchase, Cust Ledger, Supp Ledger, Expenses). Reduce nav item width from ~40px to ~80px.
**Acceptance criteria:**
- [ ] Portrait bottom nav shows exactly 4 items: POS, Dashboard, Inventory, More
- [ ] Each item ≥80px wide (9-tab min was ~40px)
- [ ] Tapping "More" opens a bottom sheet with icon grid of remaining tabs
- [ ] Selecting a tab from "More" sheet navigates to that page
- [ ] Landscape NavigationRail unchanged (already handles 9 items with scroll)
**Verification:** `flutter analyze` + manual test portrait/landscape
**Dependencies:** None
**Files touched:** `manager_shell.dart` (_tabs list, _buildPortraitLayout, bottom nav items)
**Scope:** M — 1 file, new BottomSheet widget inline

#### Task 2.2: Replace top-left hamburger with 4th bottom-nav tab (Customer App)
**Description:** Add "Menu" as 4th item in MainScaffold BottomNavigationBar, remove AppBar hamburger button and drawer. Opens SideDrawer directly.
**Acceptance criteria:**
- [ ] Bottom nav shows 4 items: Home, Categories, Search, Menu
- [ ] Hamburger icon removed from AppBar leading
- [ ] Tapping "Menu" opens SideDrawer (use Scaffold.of(context).openDrawer())
- [ ] AppBar leading: null, actions unchanged (notification bell stays)
**Verification:** `flutter analyze` + run app, confirm drawer opens from Menu tab
**Dependencies:** None
**Files touched:** `main_scaffold.dart` (BottomNavigationBar items, AppBar leading)
**Scope:** S — 1 file

#### Task 2.3: Make HomeScreen search bar float (not pinned)
**Description:** Change SliverAppBar from `pinned: true` to `pinned: false, floating: true` so search drops to natural thumb zone when user scrolls down. Search remains accessible at top when at top of page.
**Acceptance criteria:**
- [ ] SliverAppBar `pinned: false, floating: true`
- [ ] Toolbar height stays 80
- [ ] Search bar collapses and reappears on scroll-down
- [ ] Content doesn't jump layout when app bar hides
**Verification:** `flutter analyze` + run app, scroll behavior expected
**Dependencies:** None
**Files touched:** `home_screen.dart`
**Scope:** S — 1 file

### Checkpoint: Phase 2
- [ ] `flutter analyze` passes
- [ ] ManagerShell portrait has 4-item bottom nav with More sheet
- [ ] Customer app has Menu tab instead of hamburger
- [ ] HomeScreen search floats on scroll

### Phase 3: P3 Fixes — Discovery Friction (3 tasks)

#### Task 3.1: Move CategoryBar chips to bottom of screen on CategoriesTab
**Description:** Reposition the horizontal category chip bar from top of CategoriesTab to near the bottom (floating above the bottom nav area), so category switching happens in the natural thumb zone without requiring a full hand stretch upward.
**Acceptance criteria:**
- [ ] Category chips positioned at bottom 1/3 of screen (above bottom nav)
- [ ] Chips remain horizontally scrollable
- [ ] Product grid adjusts padding to account for chip bar at bottom
- [ ] No Z-fighting with FloatingCheckoutBar (coordinate with existing bottom positioning)
**Verification:** `flutter analyze` + visual check
**Dependencies:** None
**Files touched:** `categories_tab.dart`
**Scope:** M — 1 file

#### Task 3.2: Verify PosMainScreen behavior is acceptable in landscape (tablet)
**Description:** PosMainScreen is explicitly a landscape tablet split-panel UI. Top-bar actions (search, scan, cashier) are acceptable in landscape (two-handed use). No fix needed. Document this decision.
**Acceptance criteria:**
- [ ] Confirm PosMainScreen top-bar actions left as-is (landscape two-handed use pattern)
- [ ] Document in code comment that portrait/mobile variant is out of scope for POS
**Verification:** Code review
**Dependencies:** None
**Files touched:** `pos_main_screen.dart` (comment only)
**Scope:** XS — 1 file, comment only

### Checkpoint: Phase 3
- [ ] `flutter analyze` passes
- [ ] Category chips in thumb zone on CategoriesTab
- [ ] PosMainScreen decision documented

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| More sheet navigation feels buried for frequent actions | Medium | Put Labels & Dues (most-used secondary tabs) at top of More sheet grid |
| Hamburger removal breaks existing user muscle memory | Low | Menu tab has standard icon, clearly labeled; drawer function preserved |
| Category chip repositioning conflicts with FloatingCheckoutBar | Medium | Chip bar uses bottom padding > FloatingCheckoutBar height; test z-order |
| Cart button enlargement causes overflow on small screens | Low | Use flexible sizing: min width 44, shrink gracefully |

## Open Questions
- Which secondary tabs should appear first in the More sheet grid? (Most-used: Labels, Dues, then Purchase, Ledgers, Expenses)
