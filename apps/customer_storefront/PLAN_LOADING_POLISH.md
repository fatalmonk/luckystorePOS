# Loading & Transition Polish — Async Operation Map

> App: `apps/customer_storefront`  
> Audit date: 2026-06-21  
> Method: every async operation traced from source to UI feedback

---

## Token Reference (from `tokens.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | standard exits, slides |
| `--ease-elastic` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | bounce (cart badge) |
| `--transition-base` | `0.18s var(--ease-out)` | buttons, hovers |
| `--press-scale` | `0.96` | active press feedback |
| `fadeUp` keyframe | `0.25s ease-out` | step transitions, toast |
| `flyToCart` keyframe | `0.55s ease-out` | cart fly animation |
| `elasticBounce` keyframe | `0.5s elastic` | cart badge bounce |
| `shimmer` keyframe | `1.8s ease-in-out infinite` | shimmer skeletons |
| `qtyPulse` keyframe | `0.3s ease-out` | qty number change |
| `toastIn` keyframe | `0.3s ease-out` | toast entrance |

---

## Async Operation Map

### 1. Home page — server-side `fetchProducts()` + `fetchCategories()`

| Field | Value |
|-------|-------|
| **Location** | `app/page.tsx:9` |
| **Type** | Server component data fetch (parallel `Promise.all`) |
| **Current feedback** | `<HomeShellSkeleton />` via `<Suspense>` fallback |
| **Classification** | ✅ Skeleton |
| **Loading copy** | none (skeleton only — correct for server fetch) |
| **Duration/easing** | `animate-pulse` (Tailwind built-in, 2s infinite) |
| **Verdict** | ✅ Good. Skeleton mirrors real layout (header, categories, hero, carousel, trust grid). No action needed. |

---

### 2. Category page (all) — server-side `fetchCategories()` + `fetchProducts()`

| Field | Value |
|-------|-------|
| **Location** | `app/category/page.tsx:25-26` |
| **Type** | Server component data fetch (sequential) |
| **Current feedback** | `<CategoryShellSkeleton />` via `<Suspense>` fallback |
| **Classification** | ✅ Skeleton |
| **Loading copy** | none |
| **Duration/easing** | `animate-pulse` |
| **Verdict** | ✅ Good. Skeleton mirrors layout. No action needed. |

---

### 3. Category slug page — server-side `fetchCategories()` + `fetchProducts()`

| Field | Value |
|-------|-------|
| **Location** | `app/category/[slug]/page.tsx:33-55` |
| **Type** | Server component data fetch |
| **Current feedback** | `<CategoryShellSkeleton />` via `<Suspense>` fallback |
| **Classification** | ✅ Skeleton |
| **Verdict** | ✅ Good. No action needed. |

---

### 4. Product detail page — server-side `fetchProducts()` + `.find()`

| Field | Value |
|-------|-------|
| **Location** | `app/product/[id]/page.tsx:7` |
| **Type** | Server component data fetch (fetches ALL products, filters client-side) |
| **Current feedback** | `<ProductDetailLoading />` via `loading.tsx` |
| **Classification** | ✅ Skeleton |
| **Loading copy** | none |
| **Duration/easing** | `animate-pulse` |
| **Verdict** | ✅ Good. Skeleton mirrors product detail layout (hero, title, price, button, description). |
| **⚠️ Flag** | `fetchProducts()` fetches ALL products to find one — this is a data efficiency issue, not a loading issue. Separate concern. |

---

### 5. Cart hydration — `localStorage` read on mount

| Field | Value |
|-------|-------|
| **Location** | `app/hooks/useCart.ts:16-26` |
| **Type** | Client-side async (localStorage read in useEffect) |
| **Current feedback** | `isLoaded` flag gates all cart-dependent UI |
| **Classification** | ✅ Skeleton (hydration guard) |
| **Components protected** | |
| → `HeaderCartButton` | Gray pulse badge while `!isLoaded` |
| → `BottomNavCartPill` | Gray pulse pill while `!isLoaded` |
| → `DeliveryProgress` | Subtotal forced to 0 while `!isLoaded` |
| → Cart page | Full cart skeleton (3 item cards + summary) while `!isLoaded` |
| → Checkout page | Uses `cart` from context — shows step 1 form (no cart-dependent UI until step 2) |
| **Loading copy** | none (correct — hydration should be instant and invisible) |
| **Duration/easing** | `animate-pulse` |
| **Verdict** | ✅ Good. All cart-dependent surfaces have hydration guards. No flash of empty state. |

---

### 6. Checkout — place order (`POST /api/checkout`)

| Field | Value |
|-------|-------|
| **Location** | `app/checkout/page.tsx:101-137` |
| **Type** | Client-side mutation (fetch POST) |
| **Current feedback** | `isPlacing` state → replaces step 2 content with "⏳ Placing your order…" |
| **Classification** | ✅ Spinner (full content swap) |
| **Loading copy** | "Placing your order…" / "This usually takes a few seconds" |
| **Duration/easing** | `animate-[fadeUp_0.25s_ease]` on the loading state |
| **Error feedback** | `submitError` state → red error banner + toast |
| **Verdict** | ✅ Good. Button is consumed by the loading state (can't double-submit). Error has clear copy + recovery path (stays on step 2). |
| **⚠️ Minor flag** | No `disabled` state on "Place Order" button during transition from step 1 → step 2 (validation happens, but if validation passes, there's a brief moment where user could click "Place Order" while cart data is still settling). Low risk — `isPlacing` catches the actual mutation. |

---

### 7. Order confirmation — `sessionStorage` read

| Field | Value |
|-------|-------|
| **Location** | `app/order/OrderContent.tsx:35-45` |
| **Type** | Client-side async (sessionStorage read in useEffect) |
| **Current feedback** | `loading` state → centered skeleton (circle + two bars) |
| **Classification** | ✅ Skeleton |
| **Loading copy** | none |
| **Duration/easing** | `animate-pulse` |
| **Verdict** | ✅ Good. |
| **⚠️ Flag** | `app/order/page.tsx` wraps in `<Suspense fallback={<div className="p-[18px]">Loading...</div>}>` — this is a **plain text "Loading..." fallback** that could flash before the `OrderContent` skeleton mounts. Should be a proper skeleton or removed (the `OrderContent` internal skeleton is sufficient). |

---

### 8. Wishlist — `createWishlistItem()` server mutation

| Field | Value |
|-------|-------|
| **Location** | `app/components/WishlistButton.tsx:27-54` |
| **Type** | Client-side mutation (Supabase insert) |
| **Current feedback** | `status` state machine: `idle → phone → loading → saved` |
| **Classification** | ✅ Optimistic-ish (button text changes: "Notify Me" → phone input → "Saving..." → "✓ On Wishlist") |
| **Loading copy** | "Saving..." |
| **Duration/easing** | no transition animation on status change (instant swap) |
| **Error feedback** | toast: "Couldn't save — please try again" + revert to idle |
| **Verdict** | ✅ Good. Clear status progression. Error recovery resets to idle. |
| **⚠️ Minor flag** | No transition animation between `phone` → `loading` → `saved` states (instant button text swap). Could add `transition-all duration-200` for smoother visual. |

---

### 9. Wishlist sync — `syncWishlistWithServer()` 

| Field | Value |
|-------|-------|
| **Location** | `app/lib/wishlistHelpers.ts:24-34` |
| **Type** | Client-side async (Supabase fetch) |
| **Current feedback** | NONE — silent fetch |
| **Classification** | ⚠️ Silent (no feedback) |
| **Loading copy** | none |
| **Verdict** | ⚠️ **FLAG: No feedback.** `syncWishlistWithServer` is called on mount but there's no loading state exposed. If the server is slow, wishlist state silently uses `getLocalWishlist()` fallback. This is **acceptable** for background sync (local cache is the source of truth until server responds), but there's no way for the UI to know when sync is complete. Low priority — wishlist is a secondary feature. |

---

### 10. Realtime broadcast — order notification to admin

| Field | Value |
|-------|-------|
| **Location** | `app/lib/orders.ts:42-66` |
| **Type** | Supabase Realtime channel subscription + broadcast |
| **Current feedback** | NONE (fire-and-forget with `console.error` on failure) |
| **Classification** | ⚠️ Silent (intentionally — this is a background side-effect) |
| **Verdict** | ⚠️ **FLAG: No feedback, but intentionally silent.** If broadcast fails, customer's order still succeeds (broadcast is in a try/catch after `return data`). Correct pattern — customer doesn't need to know about admin notification. |

---

### 11. Search — client-side redirect

| Field | Value |
|-------|-------|
| **Location** | `app/search/page.tsx:8-9` |
| **Type** | Server-side redirect |
| **Current feedback** | none (instant redirect — correct) |
| **Classification** | N/A (no loading state needed — redirect is instant) |
| **Verdict** | ✅ Good. |

---

### 12. Search — `HeaderSearch` form submit

| Field | Value |
|-------|-------|
| **Location** | `app/components/HeaderSearch.tsx:8-16` |
| **Type** | Client-side router.push |
| **Current feedback** | none (instant navigation) |
| **Classification** | N/A |
| **Verdict** | ✅ Good. Next.js route transition will show the category skeleton. |

---

### 13. Route transitions (all pages)

| Field | Value |
|-------|-------|
| **Type** | Next.js App Router navigation |
| **Current feedback** | `loading.tsx` files for `/` and `/product/[id]` |
| **Missing** | ❌ No `loading.tsx` for `/category`, `/category/[slug]`, `/cart`, `/checkout`, `/order` |
| **Classification** | ⚠️ Partial |
| **Verdict** | ⚠️ **FLAG: Missing loading.tsx on 5 routes.** Cart and checkout are client components (instant render, no server fetch) — they don't need `loading.tsx`. But `/category` and `/category/[slug]` have server fetches wrapped in `<Suspense>` at the page level, so the Suspense fallback handles it. `/order` has a Suspense fallback in `page.tsx` (the "Loading..." text). |
| **Risk** | Low. Suspense fallbacks cover the server-fetch routes. Client-only routes (`/cart`, `/checkout`) render instantly. The only real issue is the `/order` Suspense fallback showing plain "Loading..." text. |

---

### 14. Cart add/remove/qty — optimistic updates

| Field | Value |
|-------|-------|
| **Location** | `app/hooks/useCart.ts:38-93` |
| **Type** | Client-side state updates (synchronous) |
| **Current feedback** | Multiple feedback layers: |
| → Toast | "Added {product.name}" / "Removed {item.name} from cart" with Undo action |
| → Cart fly animation | Emoji flies from button to cart icon (0.55s) |
| → Cart badge bounce | `elasticBounce` 0.5s on count increase |
| → Qty pulse | `qtyPulse` 0.3s on qty change |
| → Cart sheet | Auto-opens on add (HomeSectionsClient) |
| **Classification** | ✅ Optimistic UI (instant state update + multi-layer feedback) |
| **Duration/easing** | fly: 0.55s ease-out, bounce: 0.5s elastic, pulse: 0.3s ease-out, toast: 0.3s ease-out |
| **Verdict** | ✅ Excellent. Best-in-class feedback. Toast, animation, badge bounce, auto-open sheet. |

---

### 15. CartSheet open/close transition

| Field | Value |
|-------|-------|
| **Location** | `app/components/CartSheet.tsx:58-67` |
| **Type** | CSS transform transition (dialog showModal/close) |
| **Current feedback** | `translate-y-full → translate-y-0` with `transition-transform duration-300 ease-out` |
| **Classification** | ✅ Transition |
| **Verdict** | ✅ Good. 300ms ease-out slide-up. Backdrop blur. |

---

### 16. Step transitions in checkout (step 1 ↔ step 2)

| Field | Value |
|-------|-------|
| **Location** | `app/checkout/page.tsx:174, 255` |
| **Type** | Conditional render with CSS animation |
| **Current feedback** | `animate-[fadeUp_0.25s_ease]` on each step's container |
| **Classification** | ✅ Transition |
| **Verdict** | ✅ Good. 250ms fadeUp on step swap. |

---

## Summary Table

| # | Operation | Type | Feedback | Status |
|---|-----------|------|----------|--------|
| 1 | Home data fetch | Server | Skeleton (HomeShellSkeleton) | ✅ |
| 2 | Category (all) fetch | Server | Skeleton (CategoryShellSkeleton) | ✅ |
| 3 | Category slug fetch | Server | Skeleton (CategoryShellSkeleton) | ✅ |
| 4 | Product detail fetch | Server | Skeleton (ProductDetailLoading) | ✅ |
| 5 | Cart hydration | Client | Skeleton (hydration guards everywhere) | ✅ |
| 6 | Place order | Mutation | Spinner + copy + error banner | ✅ |
| 7 | Order confirmation | Client | Skeleton (circle + bars) | ✅ |
| 8 | Wishlist add | Mutation | Status machine (Saving… → Saved) | ✅ |
| 9 | Wishlist sync | Background | ⚠️ Silent (acceptable — local cache fallback) | ⚠️ |
| 10 | Realtime broadcast | Background | ⚠️ Silent (intentionally) | ⚠️ |
| 11 | Search redirect | Redirect | N/A (instant) | ✅ |
| 12 | Search submit | Client nav | N/A (→ category skeleton) | ✅ |
| 13 | Route transitions | Navigation | Partial (see flags) | ⚠️ |
| 14 | Cart add/remove/qty | Optimistic | Toast + fly + bounce + pulse | ✅ |
| 15 | CartSheet open/close | CSS transition | 300ms slide | ✅ |
| 16 | Checkout step swap | CSS animation | 250ms fadeUp | ✅ |

---

## Flags — States With No/Incomplete Feedback

### 🔴 F1: `/order` page Suspense fallback shows plain "Loading..." text

**Location:** `app/order/page.tsx:6`  
**Current:** `<div className="p-[18px]">Loading...</div>`  
**Problem:** Before `OrderContent` mounts and its internal skeleton renders, users see a bare "Loading..." text. Breaks the visual continuity.  
**Fix:** Replace with a proper skeleton matching `OrderContent`'s loading state (circle + two bars centered on `#faf8f5` background). Or remove the Suspense wrapper entirely since `OrderContent` has its own `loading` state with a skeleton.  
**Priority:** Medium  
**Effort:** 5 min

### 🟡 F2: WishlistButton status transitions have no animation

**Location:** `app/components/WishlistButton.tsx:57-101`  
**Current:** Button text swaps instantly between states (idle → phone → loading → saved)  
**Problem:** Visual jump between states. Not jarring, but could be smoother.  
**Fix:** Add `transition-all duration-200` to the button container, or wrap status text in a `key`-based `fadeUp` animation.  
**Priority:** Low  
**Effort:** 10 min

### 🟡 F3: Wishlist sync is silent (no completion signal)

**Location:** `app/lib/wishlistHelpers.ts:24-34`  
**Current:** `syncWishlistWithServer` returns server IDs but no component tracks its completion  
**Problem:** If server is slow, wishlist UI uses local cache indefinitely with no indication of sync status. Acceptable for a secondary feature, but there's no way to show "synced" vs "local-only" state.  
**Fix:** Optional — add a `syncState` to a `useWishlistSync` hook if wishlist gets promoted to a first-class feature. For now, local-first is the right pattern.  
**Priority:** Low (defer)  
**Effort:** N/A (architectural — defer until wishlist is promoted)

### 🟡 F4: Missing `loading.tsx` on 5 routes

**Location:** `/category`, `/category/[slug]`, `/cart`, `/checkout`, `/order`  
**Current:** No `loading.tsx` files. Server-fetch routes use page-level `<Suspense>` fallbacks. Client-only routes (`/cart`, `/checkout`) render instantly.  
**Problem:** During route transitions, Next.js shows the previous page until the new page's `loading.tsx` or nearest `Suspense` boundary resolves. For `/category` and `/category/[slug]`, the page-level Suspense handles it. For `/cart` and `/checkout`, instant client render is fine. The only real gap is `/order` (F1 above).  
**Fix:** F1 fixes the `/order` case. Optionally add `loading.tsx` to `/category` and `/category/[slug]` for belt-and-suspenders coverage (Suspense already handles it, but a `loading.tsx` would trigger during the route transition before the page component even starts).  
**Priority:** Low  
**Effort:** 15 min (if desired)

### 🟢 F5: Realtime broadcast is intentionally silent

**Location:** `app/lib/orders.ts:42-66`  
**Current:** Try/catch with `console.error` on failure, no UI feedback  
**Problem:** None — this is correct. Customer doesn't need to know about admin notification status.  
**Fix:** None needed. Documented for completeness.  
**Priority:** None

---

## Recommended Actions

| Priority | Flag | Action | Effort |
|----------|------|--------|--------|
| **Medium** | F1 | Replace "Loading..." text in `/order` Suspense fallback with proper skeleton | 5 min |
| **Low** | F2 | Add `transition-all duration-200` to WishlistButton status swaps | 10 min |
| **Low** | F4 | Optionally add `loading.tsx` to `/category` and `/category/[slug]` | 15 min |
| **Defer** | F3 | Wishlist sync state tracking — defer until feature promotion | — |
| **None** | F5 | Realtime broadcast — intentionally silent, no action | — |

**Total estimated effort if all done:** ~30 min

---

## What's Already Excellent

- **Cart operations** (F14): Multi-layer feedback (toast + fly animation + badge bounce + qty pulse + auto-open sheet) is best-in-class.
- **Hydration guards** (F5): Every cart-dependent component has an `isLoaded` check with appropriate skeleton/pulse fallback. No flash of empty state anywhere.
- **Checkout flow** (F6, F16): Full loading state with copy, error banner with recovery, animated step transitions.
- **Skeleton fidelity**: All skeletons mirror their real layout (HomeShellSkeleton, CategoryShellSkeleton, ProductDetailLoading, cart skeleton).
- **Reduced motion**: `prefers-reduced-motion: reduce` is respected globally in `tokens.css`.
- **Error boundary**: `error.tsx` with Try Again + Back to Home buttons.