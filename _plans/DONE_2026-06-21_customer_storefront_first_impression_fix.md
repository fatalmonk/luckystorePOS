# First Impression Friction Fix Plan

## Overview
First-time user audit of the customer storefront. 18 friction points identified across home, category, product detail, cart, checkout, and order confirmation flows. This plan prioritizes by **business impact on conversion** (add-to-cart rate, basket size, checkout completion) rather than technical severity.

## Business Objectives
- Increase add-to-cart rate from product detail and home swimlanes
- Reduce cart abandonment (remove friction in quantity adjustment)
- Improve checkout completion rate (reduce surprise and forced progression)
- Increase homepage CTR to product/category discovery
- Reduce time-to-first-product interaction

## Success Metrics
- Add-to-cart rate improvement (target: +15%)
- Cart-to-checkout initiation rate (target: +10%)
- Checkout completion rate (target: +8%)
- Search-to-category click-through (target: measure baseline first)

---

## Architecture Decisions
- **Vertical slicing:** Each task delivers a complete, testable UX improvement end-to-end.
- **No auth changes:** All fixes stay within CartProvider / localStorage boundaries per Phase 1 rules.
- **Mobile-first:** Fixes target the mobile viewport (≤430px) where most traffic originates.
- **Skeleton parity:** Any async UI change includes matching skeleton updates.

---

## Task List

### Phase 1: Revenue Blockers

#### Task 1: Cart — Add Remove Item Affordance + Fix Bar Collision
**Description:** Add a trash/remove button to each cart item. Reduce floating bottom bar crowding by coalescing the checkout CTA into the cart items area when ≥1 items present.

**Acceptance criteria:**
- [ ] Each cart item row has a visible trash/remove affordance (tap)
- [ ] Removing an item immediately updates totals and badge
- [ ] Fixed bottom bar no longer overlaps cart items on screens ≤375px height
- [ ] Empty cart state still shows "Browse Products" CTA
- [ ] `CartSheet.tsx` synced with same remove pattern

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Add 3 items, remove middle item, verify total updates, verify bar doesn't obscure last item
- [ ] Test: `npm run test` (checkout.spec.ts should still pass)

**Files:**
- `app/cart/page.tsx`
- `app/components/CartSheet.tsx` (sync remove pattern)

**Dependencies:** None
**Scope:** Small (2 files)

---

#### Task 2: Product Detail — Prominent Sticky Add-to-Cart + Dead Code Removal
**Description:** The product detail CTA is buried at `fixed bottom-[68px]`, competing with BottomNav. Elevate the Add-to-Cart to a more prominent position and remove the unused `localQty` state.

**Acceptance criteria:**
- [ ] Add-to-Cart / quantity controls are visually dominant and don't compete with BottomNav
- [ ] `localQty` state and `setLocalQty` references removed from `ProductClient.tsx`
- [ ] Out-of-stock products show a clear "Notify when back" or "Browse Similar" fallback
- [ ] No regression: cart badge updates, toast fires, product page scrolls normally

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: iPhone SE viewport — confirm CTA is reachable, BottomNav is usable
- [ ] Lint: no unused variable warnings

**Files:**
- `app/product/[id]/ProductClient.tsx`

**Dependencies:** None
**Scope:** Small (1 file)

---

#### Task 3: Category Grid — Horizontal Scroll Discovery
**Description:** Users miss categories because `overflow-x-auto` + `scrollbar-hide` provides zero affordance. Add scroll hints (right-edge fade, optional arrow indicator).

**Acceptance criteria:**
- [ ] Category pills show a right-edge fade mask when more content exists
- [ ] Optional: snap-scroll with visible overflow indicator (arrow or "More →" pill)
- [ ] Scroll hint is dismissible or auto-hides after first interaction

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Scroll category grid on home, verify right edge fade visible
- [ ] Manual: Throttle to slow 3G, verify hint appears after skeleton resolves

**Files:**
- `app/components/CategoryGrid.tsx`
- `app/globals.css` (if new utility needed)

**Dependencies:** None
**Scope:** Small (1–2 files)

---

#### Task 3b: Search Routing Guard — BUG FIX (separate from T3)
**Description:** Search redirects to `/category?q=...` but the base category page does not process the `q` param, showing a blank grid. Wire up search term filtering.

**Acceptance criteria:**
- [ ] `/category?q=test` renders filtered product grid (not blank)
- [ ] Search query surfaces in category page title or header
- [ ] URL param preserved when switching sort/filter pills

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Search "rice", verify redirected to `/category?q=rice` with results
- [ ] Manual: Switch sort to "Price Low", verify `q=rice` persists in URL

**Files:**
- `app/category/page.tsx`
- `app/category/[slug]/page.tsx`

**Dependencies:** None
**Scope:** Small (2 files)

---

#### Task 4: Checkout Step 3 — Manual Confirmation Review Screen **[MOVED TO P1]**
**Description:** Step 3 currently auto-submits `placeOrder()` via `useEffect` after 300ms. Users get zero final review. Replace with a tap-to-confirm CTA showing order summary.

**Acceptance criteria:**
- [ ] Step 3 shows a readable order summary (items, delivery fee, total, customer details)
- [ ] "Place Order" button is explicit and requires a tap
- [ ] `useEffect` auto-fire is removed; `ConfirmingStep` only runs AFTER user confirms
- [ ] Loading spinner uses the existing ⏳ animation but with clearer copy
- [ ] Failed order returns user to Step 2 with error toast (not stuck on spinner)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Walk through checkout, verify Step 3 shows summary before confirm
- [ ] Manual: Kill network, tap Place Order, verify graceful error + return

**Files:**
- `app/checkout/page.tsx`

**Dependencies:** None
**Scope:** Small (1 file, complex logic)

---

### Phase 2: Checkout Polish

#### Task 5: Checkout — Phone Validation Scroll + Delivery Slot Picker **[BLOCKS ON T4]**
**Description:** When phone validation fails, user stays mid-page without knowing where the error is. Add auto-scroll to invalid field. Add a simple morning/evening delivery preference selector to meet grocery-buyer expectations.

**Blocker:** T4 must be merged and stable before modifying checkout state machine.

**Acceptance criteria:**
- [ ] Invalid phone input triggers `input.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [ ] Delivery slot picker shows "Morning (9AM–1PM)" and "Evening (4PM–8PM)"
- [ ] Selected slot is sent in the checkout POST body
- [ ] API handler accepts and stores `deliverySlot` (or ignores gracefully if backend not ready)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Enter bad phone, tap Continue, verify screen centers on phone field
- [ ] Manual: Select evening slot, place test order, verify payload includes slot

**Files:**
- `app/checkout/page.tsx`
- `app/api/checkout/route.ts`

**Dependencies:** Task 4 (checkout page modifications must land first)
**Scope:** Medium (2 files)

---

### Phase 3: Trust, Order Confirmation, and Navigation

#### Task 6: Order Confirmation — Web Share API + Cash Reminder + Timeline Clarity
**Description:** Replace `alert()` with Web Share API. Add cash-preparation reminder. Make timeline distinguish actual vs. predicted states.

**Acceptance criteria:**
- [ ] "Share Order" uses `navigator.share()` when available, falls back to clipboard + toast
- [ ] Cash on Delivery section shows exact amount to prepare and a "Have exact change?" tip
- [ ] Timeline steps clearly labeled: completed (checkmark), active (current), upcoming (gray)
- [ ] "Order Confirmed" copy changed from "will confirm shortly" to something accurate for pending state

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Desktop Chrome — verify clipboard fallback works
- [ ] Manual: Mobile Safari — verify Web Share sheet opens (if supported)

**Files:**
- `app/order/OrderContent.tsx`

**Dependencies:** None
**Scope:** Small (1 file)

---

#### Task 7: Header Filters — Layout Shift Prevention
**Description:** `HeaderFilters.tsx` inside the yellow sub-nav strip causes the "Delivery in as soon as 1 hour" text to jump when Suspense resolves. Reserve fixed width or move the text outside the scrollable nav area.

**Acceptance criteria:**
- [ ] Sub-nav strip height remains constant before and after `HeaderFilters` load
- [ ] "Delivery in as soon as 1 hour" does not reposition abruptly
- [ ] Skeleton placeholders for filter pills match final rendered width (≈60–80px per pill)
- [ ] No cumulative layout shift (CLS) > 0.1 on header during load

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Throttle CPU/network, observe header loading — no layout jumps
- [ ] Lighthouse: CLS score for header area measured

**Files:**
- `app/components/Header.tsx`
- `app/components/HeaderFilters.tsx` (if exists)

**Dependencies:** None
**Scope:** Small (1–2 files)

---

### Phase 4: Hygiene & Visual Consistency

#### Task 8: Skeleton Loader Layout Stability
**Description:** `HomeShellSkeleton` renders a different horizontal layout than real `CategoryGrid`, causing a visible snap when content loads. Match skeleton dimensions to real content.

**Acceptance criteria:**
- [ ] Skeleton category pills match real `CategoryPill` dimensions (padding `px-4 py-2`, font-size `text-sm`, approximate width 80–120px)
- [ ] Skeleton hero matches real `HeroBanner` height (`h-32 sm:h-40`)
- [ ] No horizontal layout shift when Suspense resolves

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Slow 3G throttle, watch home load — verify smooth skeleton→content transition

**Files:**
- `app/components/HomeShellSkeleton.tsx`
- `app/components/SkeletonGrid.tsx` (if shared)

**Dependencies:** Task 3 (CategoryGrid final dimensions must be locked)
**Scope:** Small (1 file)

---

#### Task 9: Emoji → Consistent Iconography (SVG Set) **[BLOCKED — see Open Questions]**
**Description:** Heavy emoji use causes visual inconsistency across Android OEMs. Replace key navigation and trust icons with an inline SVG set or a lightweight icon library.

**Blocker:** Requires audit of `public/` and `admin_web` for existing icon assets before committing to a new `icons/` module.

**Acceptance criteria:**
- [ ] BottomNav icons use consistent SVGs instead of emoji
- [ ] Trust reassurance grid icons use SVGs instead of emoji
- [ ] Cart empty state uses SVG illustration instead of 🛒 emoji
- [ ] Fallback: keep emoji as `aria-hidden` decorative only if SVG missing

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Check on Android emulator / device — icons render consistently

**Files:**
- `app/components/BottomNav.tsx`
- `app/components/HomeShell.tsx` (trust grid)
- `app/cart/page.tsx` (empty state)
- `app/components/icons/` (new folder — contingent on asset audit)

**Dependencies:** Resolution of "Existing icon set?" open question
**Scope:** Medium (3 files + new icon module)

---

## Checkpoint: Phase 1 Completion
- [ ] Cart remove + layout verified on real device
- [ ] Product detail CTA passes iPhone SE smoke test
- [ ] Category scroll hint visible
- [ ] Search routing returns results
- [ ] Checkout Step 3 requires explicit user confirmation
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test` (or existing test suite)

## Checkpoint: Phase 2 Completion
- [ ] Phone validation scrolls to field
- [ ] Delivery slot selector visible and functional
- [ ] End-to-end: home → cart → checkout → order confirmation works

## Checkpoint: Phase 3 Completion
- [ ] Order share uses Web Share API or clipboard
- [ ] Cash reminder visible
- [ ] Timeline states are visually distinct
- [ ] Header layout shift eliminated

## Checkpoint: All Phases Complete
- [ ] All acceptance criteria met
- [ ] Lighthouse score not regressed (baseline recorded before changes)
- [ ] Baseline metrics captured (add-to-cart rate, checkout completion via analytics if available)
- [ ] Ready for review / deploy to preview

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Checkout page refactor introduces state machine bugs | High | Task 4 isolated to one file; extensive manual testing of all 3 steps before merge |
| CategoryGrid scroll indicators clash with existing `scroll-edge-mask` CSS | Low | Test on iOS Safari and Chrome Android; CSS-only, easy to revert |
| Delivery slot addition requires DB/API change | Med | POST body sends slot; backend ignores unknown fields safely; add `orders.delivery_slot TEXT NULL` in separate migration |
| SVG icon bundle bloat | Low | Inline SVGs are tree-shaken per-component; no external icon library added |
| Skeleton dimension changes cause other pages to shift | Low | Only `HomeShellSkeleton` touched; other skeletons in `SkeletonGrid.tsx` remain independent |
| T5 modifies checkout state machine while T4 is in-flight | Med | Explicit blocker tag: T5 cannot start until T4 merged and smoke-tested |

## Open Questions — Resolved

| Question | Resolution |
|----------|------------|
| Delivery slot in DB now or later? | **Add column now** — `orders.delivery_slot TEXT NULL`; zero-risk migration; POST body sends it immediately |
| Swipe-to-delete vs trash button? | **Trash button for P1** (simpler, accessible); swipe as enhancement post-launch |
| Existing icon set? | **Audit `public/` and `admin_web` before T9 starts** — block T9 on asset discovery; do not create new `icons/` module prematurely |

**Instrumentation / Baseline Note:**
Before any Phase 1 changes ship, capture current baselines via Google Analytics 4 events (if available) or manual log review:
- Add-to-cart rate (homepage swimlane CTA clicks / product detail CTA clicks)
- Cart-to-checkout initiation rate
- Checkout completion rate (step 3 → order confirmation)
- Search-to-category result page views

If analytics are not instrumented, add a lightweight `console.log`-based tracker in `app/lib/analytics.ts` as a prep task before Phase 1.

## Notes
- **Forbidden areas not touched:** Auth flow, `PosProvider`, Supabase migrations, core business logic (RPC signatures).
- **Allowed files only:** UI components, cart/checkout/order pages, CSS utilities, icon modules.
- **Plan saved per convention:** `apps/customer_storefront/PLAN.md` for cross-platform work; this file is the audit-specific plan.
