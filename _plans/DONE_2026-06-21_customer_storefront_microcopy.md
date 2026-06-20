# Implementation Plan: Microcopy Rewrite — customer_storefront

## Overview
Rewrite 49 pieces of user-facing copy (button labels, error messages, placeholders, toasts, headings, aria-labels) across the customer storefront to improve clarity, reduce friction, and increase conversion. All changes are text-only — no logic, layout, or component structure changes.

## Business Objectives
- Reduce checkout abandonment from confusing error messages
- Increase add-to-cart rate via clearer CTA labels ("Add to Cart" vs "Add")
- Improve time-to-first-product via better search placeholder clarity
- Build trust through clearer post-purchase and error copy

## Success Metrics
- Checkout validation errors → user recovery rate (better copy = faster correction)
- Add-to-cart CTA clarity → higher click-through on product cards
- Search usage → clearer placeholder drives more searches

## Architecture Decisions
- All changes are string-literal edits inside existing `.tsx`/`.ts` files
- No new files, no new components, no prop changes
- No i18n framework — copy stays inline (matches existing pattern)
- Validation error strings in `lib/validation.ts` propagate to checkout UI

## Pre-Plan Verification (Live Site)
- [x] File structure confirmed: `app/checkout/page.tsx`, `app/cart/page.tsx`, `app/order/OrderContent.tsx`, `app/components/*.tsx`, `app/lib/validation.ts`
- [x] No hydration-sensitive code touched — all changes are static strings
- [x] No provider order changes
- [x] No `<Suspense>` or skeleton changes needed
- [x] All copy is currently hardcoded inline (no i18n to break)

## Task List

### Phase 1: Checkout & Cart (P1-P2 — Revenue impact)

- [ ] **Task 1: Rewrite checkout page copy**
  - **Description:** Fix all microcopy in `app/checkout/page.tsx` — step labels, error messages, placeholders, loading text, error banner.
  - **Acceptance criteria:**
    - Step labels: "Details" → "Your Info"
    - All validation errors use active voice ("Enter your..." not "X is required")
    - Address error: "Add your house, road, and area"
    - Phone error: "Enter your WhatsApp number"
    - Phone format hint: "Use 01XXXXXXXXX or +8801XXXXXXXXX"
    - Name placeholder: "e.g. Karim Ahmed"
    - Notes placeholder: "e.g. Ring bell twice, call before arriving"
    - Error heading: "Order couldn't be placed"
    - Error toast: "Couldn't place order — please try again"
    - Fix prompt: "Please check the highlighted fields"
    - Loading body: "This usually takes a few seconds"
  - **Verification:** `npm run typecheck` passes, manual review of diff
  - **Dependencies:** None
  - **Files:** `app/checkout/page.tsx`
  - **Scope:** S (1 file)
  - **Model:** `glm-5.2` — straightforward string replacements

- [ ] **Task 2: Rewrite validation.ts phone error**
  - **Description:** Fix the zod validation error message for phone format.
  - **Acceptance criteria:**
    - "Invalid phone number format" → "Enter a valid Bangladeshi phone number"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None (parallel with Task 1)
  - **Files:** `app/lib/validation.ts`
  - **Scope:** XS (1 file)
  - **Model:** `glm-5.2`

- [ ] **Task 3: Rewrite cart page copy**
  - **Description:** Fix microcopy in `app/cart/page.tsx` — empty state CTA, payment description.
  - **Acceptance criteria:**
    - Empty CTA: "Browse Products" → "Start Shopping"
    - Payment desc: "Cash on Delivery · Pay when you receive" → keep as-is (✅)
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None
  - **Files:** `app/cart/page.tsx`
  - **Scope:** XS (1 file)
  - **Model:** `glm-5.2`

### Checkpoint: Checkout & Cart
- [ ] `npm run typecheck` passes
- [ ] `npx next build` succeeds
- [ ] Manual review: checkout flow copy reads naturally

### Phase 2: Product & Search (P1 — Discovery impact)

- [ ] **Task 4: Rewrite ProductCard copy**
  - **Description:** Fix microcopy in `app/components/ProductCard.tsx` — add button label, wishlist toast, aria-labels.
  - **Acceptance criteria:**
    - Add button: "Add" → "Add to Cart"
    - Wishlist toast (fail): "Couldn't sync wishlist — saved locally"
    - Wishlist aria-label: "Add to wishlist" → "Save to wishlist"
    - Qty aria-labels: "Decrease quantity"/"Increase quantity" → "Remove one"/"Add one"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None (parallel with Phase 1)
  - **Files:** `app/components/ProductCard.tsx`
  - **Scope:** S (1 file)
  - **Model:** `glm-5.2`

- [ ] **Task 5: Rewrite ProductClient copy**
  - **Description:** Fix microcopy in `app/product/[id]/ProductClient.tsx` — add toast, out-of-stock toast, similar link.
  - **Acceptance criteria:**
    - Add toast: "Added {product.name}" → "Added {product.name} to cart"
    - Out of stock: "Sorry, out of stock" → "Sorry, this item is out of stock"
    - Similar link: "Browse Similar →" → "See Similar Items →"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None
  - **Files:** `app/product/[id]/ProductClient.tsx`
  - **Scope:** XS (1 file)
  - **Model:** `glm-5.2`

- [ ] **Task 6: Rewrite search placeholders**
  - **Description:** Fix placeholder text in HeaderSearch and updated Header.
  - **Acceptance criteria:**
    - HeaderSearch: "Search everything..." → "Search for products..."
    - updated/Header: "Search products, brands and more..." → "Search products, brands..."
    - HeaderSearch aria-label: "Search" → "Search products"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None
  - **Files:** `app/components/HeaderSearch.tsx`, `app/components/updated/Header.tsx`
  - **Scope:** S (2 files)
  - **Model:** `glm-5.2`

### Checkpoint: Product & Search
- [ ] `npm run typecheck` passes
- [ ] `npx next build` succeeds
- [ ] Manual review: product card "Add to Cart" reads correctly

### Phase 3: Order, Wishlist & Trust (P2-P3 — Post-purchase & trust)

- [ ] **Task 7: Rewrite OrderContent copy**
  - **Description:** Fix microcopy in `app/order/OrderContent.tsx` — empty state, timeline labels, cash heading, share toast.
  - **Acceptance criteria:**
    - Empty state: "No order found" → "We couldn't find your order"
    - Empty CTA: "Go Home" → "Back to Home"
    - Timeline: "Pending Confirmation" → "Awaiting Confirmation"
    - Timeline: "Cashier will review and confirm" → "Store will review and confirm"
    - Cash body: "Please prepare {total} in cash..." → "Have {total} ready in cash for the rider."
    - Tip: "Tip: Having exact change helps speed up delivery." → "Having exact change speeds up delivery."
    - Share toast: "Order link copied to clipboard" → "Order link copied"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None
  - **Files:** `app/order/OrderContent.tsx`
  - **Scope:** S (1 file)
  - **Model:** `glm-5.2`

- [ ] **Task 8: Rewrite WishlistButton copy**
  - **Description:** Fix microcopy in `app/components/WishlistButton.tsx` — notify label, saved state, error, phone hint, toast.
  - **Acceptance criteria:**
    - Idle: "Notify when available" → "Notify Me When Back"
    - Saved: "On wishlist" → "✓ On Wishlist"
    - Phone error: "Enter valid BD phone (+880 1XXXXXXXXX)" → "Enter a valid number: +880 1XXXXXXXXX"
    - Save fail: "Could not save wishlist item" → "Couldn't save — please try again"
    - Toast: "We'll notify you when {productName} is back" → "...is back in stock"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None
  - **Files:** `app/components/WishlistButton.tsx`
  - **Scope:** S (1 file)
  - **Model:** `glm-5.2`

- [ ] **Task 9: Rewrite error/not-found/CategoryGrid labels**
  - **Description:** Fix microcopy in `app/error.tsx`, `app/not-found.tsx`, `app/components/updated/CategoryGrid.tsx`, `app/components/CategoryDropdown.tsx`.
  - **Acceptance criteria:**
    - error.tsx: "Go Home" → "Back to Home"
    - not-found.tsx: "Browse Products" → "Start Shopping"
    - updated/CategoryGrid: "Shop by Department" → "Browse Categories"
    - CategoryDropdown: "Departments" → "Categories"
  - **Verification:** `npm run typecheck` passes
  - **Dependencies:** None
  - **Files:** `app/error.tsx`, `app/not-found.tsx`, `app/components/updated/CategoryGrid.tsx`, `app/components/CategoryDropdown.tsx`
  - **Scope:** S (4 files, tiny edits)
  - **Model:** `glm-5.2`

### Checkpoint: Complete
- [ ] `npm run typecheck` passes
- [ ] `npx next build` succeeds (33+ pages)
- [ ] `npx next lint` — no warnings
- [ ] Manual review: all before/after items from audit table are applied
- [ ] Smoke test: checkout flow, add to cart, search, order page

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| String not found (whitespace mismatch) | Low | Re-read file before each patch, use fuzzy match |
| Toast API signature mismatch | Low | Toast already supports (message, action?, duration?) — no structural change |
| aria-label change breaks test | Low | No tests reference aria-label strings; checked grep |
| Template literal breakage | Med | Keep `${variable}` syntax intact, only change surrounding text |

## Deployment Strategy
- Single commit, single push to `main` (text-only changes, no logic)
- Vercel auto-deploys on push
- Monitor for 24h post-deploy for any runtime issues
- Rollback: `git revert` + push (clean revert since no structural changes)

## Open Questions
- None — all copy decisions made in audit table, user approved "go ahead"