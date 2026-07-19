# Lucky Store Customer Storefront — UI Redesign Implementation Plan (v2)

**Date:** 2026-07-16
**Scope:** `apps/customer_storefront` homepage and shared components
**Baseline:** Meena Bazar Online (`meenabazaronline.com`) competitive audit + `design-taste-frontend-v1` skill compliance
**Goal:** Close UX gaps, elevate visual polish, ship incremental improvements without breaking existing cart/auth flows.

---

## 1. Executive Summary

Meena Bazar drives conversion through **urgency**, **themed shortcuts**, and **visual rhythm**. Lucky Store has a superior design system (warm paper/saffron, glassmorphism, micro-interactions) but underutilizes it on the homepage. This plan fixes that by:

1. Adding urgency mechanisms (flash sale countdown)
2. Replacing taxonomy-driven categories with campaign-driven shortcuts
3. Creating visual rhythm via inline promo banners
4. Simplifying ProductCard density (de-emphasize, not remove, key info)
5. Fixing design-taste-skill violations (emojis, generic layouts)
6. Consolidating dual CartSheet mounts

**Estimated effort:** 2–3 days | **Risk:** Low (no auth/state changes)

---

## 2. Competitive Gap Analysis

### 2.1 Meena Bazar Strengths (We Lack)

| # | Feature | Meena Bazar Implementation | Lucky Store Gap | Priority |
|---|---------|--------------------------|-----------------|----------|
| 1 | **Flash Sale Urgency** | H:M:S countdown timer below banner, red accent | None | P0 |
| 2 | **Themed Category Chips** | "Summer Fruits", "Weekend Deals", "Dengue Corner" — campaign names with icon + "New" badge | Generic taxonomy: "Beverages", "Snacks", "Dairy" — no seasonal relevance | P0 |
| 3 | **Mid-Page Promo Banners** | Alternating banner → products → banner → products creates visual pacing | Single hero → single promo grid → products → trust → end. Monotonous. | P1 |
| 4 | **Header Cart Visibility** | Persistent "0 ITEMS · 0.00 TK" in sticky header | Cart only visible via icon in bottom nav + header icon. No monetary visibility. | P1 |
| 5 | **Header Wishlist** | Dedicated wishlist button with count in header | Only per-card heart buttons. No global access. | P2 |
| 6 | **Product Card Simplicity** | Image + name + unit + price + add button. No savings math, no unit-price line. | Has originalPrice strikethrough, savings badge, unit price, wishlist heart — cluttered | P1 |

### 2.2 Lucky Store Strengths (Keep & Double Down)

- **Design system** — Warm paper (#FDFBF7) + saffron (#f0c444) palette is premium vs Meena Bazar's generic white/red.
- **Typography** — Geist Sans/Mono + Noto Sans Bengali is distinctive.
- **Micro-interactions** — Card reveals (`card-reveal`), elastic bounce (`cart-bounce`), cart fly animation. Meena Bazar has zero motion.
- **Hero banner** — Dark overlay + gradient CTA is editorial. Meena Bazar rotates flat promo images.
- **Search UX** — Recent searches + suggestion dropdown. Meena Bazar is basic text input.
- **Trust signals** — "Why Chittagong Trusts Lucky Store" bento grid. Meena Bazar has none.

### 2.3 Design-Taste-Skill Violations (Fix Regardless)

Per `design-taste-frontend-v1` (`DESIGN_VARIANCE: 8`, `MOTION_INTENSITY: 6`, `VISUAL_DENSITY: 4`):

| Violation | Location | Fix |
|-----------|----------|-----|
| **Emojis in code** | `updated/Header.tsx` (`🔍` desktop search button, `🔍` mobile search button, `👤` sign-in), `HeaderCartButton.tsx` (`🛒`), `HomeShell.tsx` (`'🔥 Hot Deals'`, `'⭐ Best Sellers'` strings), `CartSheet.tsx` (`✕`) | Replace with Phosphor Icons SVG or custom SVG primitives |
| **Generic 4-equal-cards trust section** | `HomeShell.tsx` "Why Chittagong Trusts Lucky Store" | Redesign with asymmetric bento layout (2fr 1fr splits, varied card sizes) |
| **No staggered reveals** | Product sections mount instantly | Add CSS `animation-delay: calc(var(--index) * 100ms)` + `@keyframes` (no Framer needed) |

**Note:** `BottomNav.tsx` uses custom SVG icons from `icons/index.tsx` — already clean, no emojis.

---

## 3. Implementation Phases

### Phase 1: Foundation & Cleanup (Day 1)
**Goal:** Remove blockers, establish dependencies, fix skill violations.

#### 3.1.1 Install Dependencies

```bash
cd apps/customer_storefront
npm install @phosphor-icons/react
```

- `@phosphor-icons/react` — Required by design-taste-skill. Stroke-width standardized to `1.5`.
- **Deferred:** `framer-motion` — NOT installed in Phase 1. All motion in Phases 1–5 uses CSS animations, `@starting-style`, or `IntersectionObserver`. Only add `framer-motion` in Phase 6 if CSS-first proves insufficient. Saves ~32kB gzipped from initial bundle.
  - **Rationale:** `CartSheet` uses native `<dialog>` with `showModal()`/`close()` — wrapping in Framer `AnimatePresence` is [notoriously tricky](https://github.com/framer/motion/issues/1647) and can fight the dialog's focus management.
  - **Rationale:** Stagger reveals, scroll-triggered banners, and press-feedback all work perfectly with CSS.

#### 3.1.2 Emoji Replacement — Complete Audit

**Files to edit:**

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `updated/Header.tsx` | 82 | `🔍` (desktop search submit) | `<MagnifyingGlass weight="bold" size={14} />` |
| `updated/Header.tsx` | 110 | `🔍` (mobile search button) | `<MagnifyingGlass weight="bold" size={18} />` |
| `updated/Header.tsx` | 118 | `👤` (sign-in icon) | `<User weight="bold" size={16} />` |
| `HeaderCartButton.tsx` | 31 | `🛒` (cart icon) | `<ShoppingCart weight="bold" size={16} />` |
| `CartSheet.tsx` | 84 | `✕` (close button) | `<X weight="bold" size={18} />` |
| `HomeShell.tsx` | 24 | `'🔥 Hot Deals'` | `'<Fire weight="fill" className="inline" size={14} /> Hot Deals'` (or custom SVG) |
| `HomeShell.tsx` | 25 | `'⭐ Best Sellers'` | `'<Star weight="fill" className="inline" size={14} /> Best Sellers'` (or custom SVG) |
| `HeaderSearch.tsx` | 36 | `🔍` | `<MagnifyingGlass weight="bold" size={16} />` |
| `Header.tsx` (root) | 26 | `🔍` | `<MagnifyingGlass weight="bold" size={18} />` |
| `Header.tsx` (root) | 34 | `👤` | `<User weight="bold" size={16} />` |
| `SearchSuggestions.tsx` | 91 | `🔥` | `<Fire weight="fill" size={14} />` |
| `CategorySwimlanes.tsx` | 118, 147, 154 | `🔥`, `⭐` | `<Fire weight="fill" size={14} />`, `<Star weight="fill" size={14} />` |
| `not-found.tsx` | 7 | `🔍` | `<MagnifyingGlass weight="bold" size={24} />` |

**Note:** `→` is an HTML arrow entity, not an emoji — acceptable but standardize on Phosphor `ArrowRight` for consistency. Policy/content pages (`security-policy`, `terms`, `order/OrderContent`) currently use emojis for decoration; keep them for now since they are static content, not UI chrome. Revisit if a stricter "no emoji anywhere" rule is adopted.

#### 3.1.3 Consolidate Triple CartSheet Mount

**Problem:** `HeaderCartButton.tsx:48` mounts its own `CartSheet`. `HomeSectionsClient.tsx:57` mounts another `CartSheet`. `BottomNavCartPill.tsx:51` mounts a third `CartSheet`. Three `<dialog>` elements for the same cart = z-index conflicts and focus-trap bugs.

**Fix:** Graduate to Option B — create a single global `CartSheetProvider` in `layout.tsx`.

**Option A (Rejected):** Removing `CartSheet` only from `HomeSectionsClient.tsx` leaves the third mount in `BottomNavCartPill.tsx`, so it does not solve the problem.

**Option B (Selected):**
Create a `CartSheetProvider` in `app/components/providers/CartSheetProvider.tsx` and mount it in `layout.tsx`. Export `useCartSheet()` hook returning `{ open, close, isOpen }`. Update `HeaderCartButton`, `HomeSectionsClient`, and `BottomNavCartPill` to call `openCartSheet()` / `closeCartSheet()` from the hook instead of mounting their own `<CartSheet />`. Remove the local `useState` sheet state in each component. `CartSheet` itself renders once at the provider level and is controlled by context.

**Additional decision:** Remove `HomeSectionsClient`'s `onAdd` auto-open behavior. Auto-opening a full cart sheet on every add interrupts browsing flow. Rely on the cart fly animation + `BottomNavCartPill` for feedback instead.

**New files:**
- `app/components/providers/CartSheetProvider.tsx`
- `app/hooks/useCartSheet.ts` (re-exports from provider, or co-located)

#### 3.1.4 CategoryGrid Icon System

**Fix:** Replace emoji-based category icons in `CategoryGrid.tsx` with custom SVG primitives mapped to category slugs. Create `app/components/icons/CategoryIcons.tsx`:

- `beverages` — Coffee cup outline
- `snacks` — Cookie/cracker outline
- `dairy` — Milk carton outline
- `personal-care` — Spray bottle outline
- `rice-grain` — Rice bowl outline
- `electronics` — Monitor/TV outline
- `default` — Package box outline

Style: `strokeWidth="1.5"`, currentColor, `transition-transform duration-500 group-hover:scale-110`.

**Data-driven note:** The `emoji` field comes from the Supabase `categories` table and is passed into `CategoryGrid` via the `categories` prop. The component should use the slug → icon map first, fall back to the `emoji` field only if no icon exists, then finally the default package icon. This fallback chain keeps `/category` working while migrating to SVG icons over time.

#### 3.1.5 Trust Section Bento Redesign

**Current:** `HomeShell.tsx` lines 44–92 — 4 equal cards in a 1→2→4 grid. Banned by skill when `DESIGN_VARIANCE > 4`.

**New design:** Asymmetric 2-row bento:

```
Row 1: [Large Card: Free Same-Day Delivery        ] [Small: Since 1947]
Row 2: [Small: Cash on Delivery] [Small: Fresh Guarantee] [Wide: CTA Banner]
```

- Use `grid grid-cols-1 sm:grid-cols-3 gap-4` with `col-span-2` on large card
- Large card: `rounded-[24px]`, illustration/gradient background, icon + headline + description
- Small cards: `rounded-[20px]`, icon-only + label below
- CTA banner: saffron accent background, "Shop Now →" button
- All cards: `card-hover` class (shadow + lift + press feedback)

---

### Phase 2: Urgency & Themed Shortcuts (Day 1–2)
**Goal:** Add conversion-driving elements Meena Bazar has that we lack.

#### 3.2.1 Flash Sale Countdown Timer

**New component:** `app/components/FlashSaleStrip.tsx`

- Position: Immediately below hero banner in `HomeShell.tsx`
- Design: Full-width saffron gradient strip (`from-[#f0c444] to-[#e8b840]`), dark text (#0B0B0D)
- Content: "Flash Sale — Ends in {HH}:{MM}:{SS}" + "Shop Deals →" link
- Props: `endTime?: Date` — if absent, component renders null (no fake perpetual countdown)
- Behavior: 
  - If `endTime` is provided and in future: countdown ticks
  - If `endTime` is past: render null (hides itself)
  - If no `endTime`: render a subtle "Next sale starts soon" placeholder or null
- Animation: Subtle pulse on the colon separators (`:`), `animate-pulse` on seconds
- SSR safety: Timer state initialized in `useEffect` (client-side only). Server renders placeholder or null.

```tsx
// FlashSaleStrip.tsx pseudo-structure
<section className="w-full rounded-[20px] bg-gradient-to-r from-warm-accent to-[#e8b840] px-5 py-3 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <Lightning weight="fill" size={20} className="text-warm-fg" />
    <span className="font-black text-sm text-warm-fg">Flash Sale</span>
    <div className="flex items-center gap-1 font-mono font-bold text-sm">
      <span>{hours}</span><span className="animate-pulse">:</span><span>{minutes}</span><span className="animate-pulse">:</span><span>{seconds}</span>
    </div>
  </div>
  <Link href="/category?theme=deals" className="text-xs font-bold underline underline-offset-2">Shop Deals →</Link>
</section>
```

**Anti-dark-pattern guard:** Never hardcode "midnight tonight" as a perpetual countdown. The `endTime` prop ensures the strip only appears when a real sale is configured.

#### 3.2.2 Themed Shortcut Chips (Replace CategoryGrid on Homepage)

**New component:** `app/components/ThemedShortcuts.tsx`

Replace the current `CategoryGrid` in `HomeShell.tsx` with campaign-driven shortcuts. These are NOT category taxonomy — they're seasonal/themed entry points.

**Shortcuts:**

| Label | Icon | Theme Param | Badge |
|-------|------|-------------|-------|
| Summer Fruits | `<Sun weight="fill" />` | `?theme=summer` | "New" (red dot) |
| Weekend Deals | `<CalendarCheck weight="fill" />` | `?theme=weekend` | — |
| Hot Deals | `<Fire weight="fill" />` | `?theme=deals` | — |
| New Arrivals | `<Sparkle weight="fill" />` | `?theme=new` | "New" |
| Health Essentials | `<Shield weight="fill" />` | `?theme=health` | — |
| Buy 1 Get 1 | `<Gift weight="fill" />` | `?theme=bogo` | — |

**Design:**
- Horizontal scroll with `scroll-edge-mask` + `scrollbar-hide`
- Each chip: `rounded-[18px]`, border `border-warm-border/60`, `bg-white`
- Active/hover: `bg-warm-fg text-warm-accent`
- Badge: Small red dot or "New" pill in saffron
- Size: `w-[100px] h-[88px]` — icon (24px) + label (10px) stacked vertically

**Migration:** Keep `CategoryGrid` for the `/category` page. On homepage, use `ThemedShortcuts`. Update `HomeShell.tsx` to import and render `ThemedShortcuts` instead of `CategoryGrid`.

**Future:** Make shortcuts data-driven by creating a `campaigns` table in Supabase. For now, hardcode the array with a `TODO:` comment indicating the migration path.

---

### Phase 3: Visual Rhythm — Inline Promo Banners (Day 2)
**Goal:** Break monotony between product sections.

#### 3.3.1 Inline Promo Banner Component

**New component:** `app/components/InlinePromoBanner.tsx`

- Position: Insert between product sections in `HomeSectionsClient.tsx`
- Props: `title`, `subtitle`, `bgImage`, `ctaText`, `ctaHref`, `variant: 'saffron' | 'dark' | 'image'`

**Relationship to `NativeAdBanner`:** `NativeAdBanner` already exists and serves a similar purpose (single configurable banner). `InlinePromoBanner` extends it with:
1. Additional variants (`saffron`, `dark`) beyond `NativeAdBanner`'s image-only approach
2. Specific placement logic (between product sections)
3. Smaller, more compact sizing for inline use

**Recommendation:** Refactor `NativeAdBanner` to accept a `variant` prop (`'image' | 'saffron' | 'dark'`), then rename it to `PromoBanner` and use it both as a standalone section AND inline between products. Deprecate `NativeAdBanner` name, update all imports.

**Usage in `HomeSectionsClient.tsx`:**

After every 2 product sections, inject an inline banner:

```tsx
{sections.map((section, index) => (
  <React.Fragment key={section.title}>
    <ProductSection {...section} />
    {index === 1 && (
      <PromoBanner
        variant="saffron"
        title="Free Same-Day Delivery"
        subtitle="On orders ৳500+. Order before 6 PM."
        ctaText="Shop Essentials"
        ctaHref="/category?theme=essentials"
      />
    )}
  </React.Fragment>
))}
```

**Variants:**

1. **Saffron:** `bg-gradient-to-r from-warm-accent to-[#e8b840]`, dark text, rounded-[20px], py-5 px-6
2. **Dark:** `bg-warm-fg text-white`, saffron CTA button, rounded-[20px], py-5 px-6
3. **Image:** Background image with dark overlay gradient, white text, liquid glass border

**Animation:** Fade up on scroll into view. Use CSS `IntersectionObserver` + class toggle (add `.animate-fade-up` when visible). **Do NOT use `@starting-style` for this** — Safari 16.4 (our browserslist target) does not support `@starting-style`. Use traditional `IntersectionObserver` approach.

```css
/* In globals.css */
.fade-up-hidden {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out);
}
.fade-up-visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

### Phase 4: ProductCard Simplification (Day 2)
**Goal:** Reduce cognitive load while preserving legally/commercially important info.

#### 3.4.1 ProductCard Redesign

**File:** `app/components/ProductCard.tsx`

**Current problems:**
- Line 254–257: Price block has taka + paisa split — visually noisy
- Line 259–263: Savings badge + strikethrough — conversion driver but visually loud
- Line 266–268: Unit-price line (`৳82.50 / 100g`) — comparison aid but adds density
- Line 211–225: Wishlist heart always visible — competes with add-to-cart

**Revised approach (de-emphasize, don't delete):**

```
┌─────────────────────────────┐
│  [Badge]              [♡]   │  ← Wishlist: opacity-100 on mobile,
│                             │     opacity-0 on desktop until group-hover
│         [Image]             │  ← Larger image area, object-contain, p-2
│                             │
├─────────────────────────────┤
│ ৳412.50                     │  ← Single price line, font-black, text-lg
│ ~~৳520~~  Save ৳107.50      │  ← Strikethrough + savings in ONE compact line
│ Beef Bone-In Premium        │  ← Name, line-clamp-2, text-sm
│ 500g                        │  ← Unit, text-xs muted
│                             │
│ [  −  ]  [ 3 ]  [  +  ]    │  ← Qty controls (or "Add to Cart" button)
└─────────────────────────────┘
```

**Changes:**
1. **Price:** Single formatted line `৳412.50` (remove taka/paisa split). Use `formatBdt(price)`.
2. **Sale info (kept, compacted):** Single line: `~~৳520~~ · Save ৳107.50` in `text-[10px] text-stone-400`. Remove green savings badge — the strikethrough alone communicates the deal.
3. **Unit price (kept, de-emphasized):** `text-[9px] text-stone-300` instead of `text-[10px] text-stone-400`. Less visual weight.
4. **Wishlist heart:** 
   - Desktop: `opacity-0 group-hover:opacity-100 transition-opacity`
   - Mobile: `opacity-100` (no hover on touch)
   - CSS: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`
5. **Enlarge image container:** `h-28 sm:h-32 lg:h-36` → `h-32 sm:h-40 lg:h-44`, reduce image padding to `p-2`
6. **Staggered reveal:** Add `animation-delay: calc(var(--index) * 80ms)` to cards in grid

#### 3.4.2 ProductGrid Stagger Animation

**File:** `app/components/ProductGrid.tsx`

Wrap the grid in a CSS custom property index system:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
  {products.map((product, index) => (
    <div key={product.id} style={{ '--index': index } as React.CSSProperties}>
      <ProductCard ... />
    </div>
  ))}
</div>
```

Then in `globals.css`:

```css
@media (prefers-reduced-motion: no-preference) {
  .product-grid > * {
    animation: fadeUp 0.4s var(--ease-out) forwards;
    animation-delay: calc(var(--index) * 80ms);
    opacity: 0;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
```

---

### Phase 5: Header Enhancements (Day 2–3)
**Goal:** Match Meena Bazar's persistent cart/wishlist visibility.

#### 3.5.1 Header Cart with Price Display

**File:** `app/components/HeaderCartButton.tsx` (update)

Current: Just a cart icon with badge count.

New: Icon + count + total price (e.g., "৳1,240"). Collapses to icon-only on very small screens.

```tsx
<button className="flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-full hover:bg-warm-bg transition-colors">
  <ShoppingCart weight="bold" size={18} />
  <span className="hidden sm:inline text-xs font-bold">{formatBdt(total)}</span>
  {count > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
      {count}
    </span>
  )}
</button>
```

#### 3.5.2 Header Wishlist Button

**New:** Add wishlist icon to header actions in `updated/Header.tsx`, between Sign In and Cart.

```tsx
<Link href="/wishlist" className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-warm-bg transition-colors">
  <Heart weight="bold" size={18} />
  {wishlistCount > 0 && (
    <span className="absolute top-0 right-0 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">{wishlistCount}</span>
  )}
</Link>
```

*Note: `/wishlist` page may not exist yet. If so, create a minimal `app/wishlist/page.tsx` that reads `localStorage` wishlist and renders items, or link to `#` with a toast: "Wishlist page coming soon."*

---

### Phase 6: Motion Polish (Day 3) — CSS-First, Framer Optional
**Goal:** Apply design-taste-skill motion requirements (`MOTION_INTENSITY: 6`) without bloating bundle.

#### 3.6.1 CartSheet Spring Animation

**File:** `app/components/CartSheet.tsx`

**CSS-first approach (recommended):**

The current CSS transition `translate-y` + `duration-300 ease-out` is already smooth. To add spring-like physics without Framer:

```css
/* In globals.css */
.cart-sheet-enter {
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cart-sheet-enter-active {
  transform: translateY(0);
}
```

This uses the project's existing `--ease-elastic` curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`) which simulates spring physics without the library.

**Framer Motion fallback:** Only install `framer-motion` and refactor `CartSheet` if the CSS spring feels insufficient after testing on real devices.

#### 3.6.2 InlinePromoBanner Scroll Reveal

Use `IntersectionObserver` + CSS class toggle (see §3.3.1). No Framer needed.

```tsx
// InlinePromoBanner.tsx
const ref = useRef(null);
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
    { threshold: 0.1, rootMargin: '-50px' }
  );
  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);

<section
  ref={ref}
  className={`fade-up-hidden ${isVisible ? 'fade-up-visible' : ''}`}
>
```

#### 3.6.3 ProductCarousel Drag (Conditional)

**File:** `app/components/ProductCarousel.tsx`

Only upgrade to Framer Motion drag if native scroll feels janky on touch devices. Current native scroll with `overflow-x-auto`, `snap-x`, and `scroll-edge-mask` is performant and accessible. Test on mobile first.

---

## 4. File Inventory

### Modified Files

| File | Changes |
|------|---------|
| `app/components/HomeShell.tsx` | Add FlashSaleStrip, replace CategoryGrid with ThemedShortcuts, redesign trust bento, replace section title emojis |
| `app/components/HomeSectionsClient.tsx` | Remove CartSheet mount and auto-open behavior, inject InlinePromoBanner between sections |
| `app/components/BottomNavCartPill.tsx` | Remove local CartSheet mount; use `useCartSheet()` to open sheet |
| `app/components/ProductCard.tsx` | Simplify price block, compact sale info, de-emphasize unit price, conditional wishlist visibility, larger image |
| `app/components/ProductGrid.tsx` | Add stagger index wrapper |
| `app/components/CartSheet.tsx` | Replace `✕` with Phosphor X icon, enhance spring-like CSS transition |
| `app/components/updated/Header.tsx` | Replace emojis (🔍×2, 👤) with Phosphor icons, add wishlist button |
| `app/components/Header.tsx` (root) | Replace emojis (🔍, 👤) with Phosphor icons, or delete if dead code |
| `app/components/HeaderSearch.tsx` | Replace `🔍` with Phosphor MagnifyingGlass |
| `app/components/HeaderCartButton.tsx` | Replace 🛒 with Phosphor ShoppingCart, show total price |
| `app/components/CategoryGrid.tsx` / `updated/CategoryGrid.tsx` | Use CategoryIcons instead of emoji |
| `app/components/SearchSuggestions.tsx` | Replace `🔥` with Phosphor Fire |
| `app/components/CategorySwimlanes.tsx` | Replace `🔥`, `⭐` with Phosphor Fire, Star |
| `app/not-found.tsx` | Replace `🔍` with Phosphor MagnifyingGlass |
| `app/components/NativeAdBanner.tsx` | Refactor into `PromoBanner` with variant prop, deprecate old name |
| `app/globals.css` / `tokens.css` | Add stagger animation keyframes, fade-up classes, cart-sheet spring curve |
| `package.json` | Add `@phosphor-icons/react` |

### New Files

| File | Description |
|------|-------------|
| `app/components/FlashSaleStrip.tsx` | Countdown urgency strip (data-driven, no fake perpetual timer) |
| `app/components/ThemedShortcuts.tsx` | Campaign-driven shortcut chips |
| `app/components/InlinePromoBanner.tsx` | Mid-page promo banner with saffron/dark/image variants |
| `app/components/icons/CategoryIcons.tsx` | Custom SVG icons per category slug |
| `app/wishlist/page.tsx` | Minimal wishlist page (or placeholder) |
| `app/components/providers/CartSheetProvider.tsx` | Global CartSheet context + single `<dialog>` mount |
| `app/hooks/useCartSheet.ts` | Hook to open/close/query the global cart sheet |

### Deleted / Deprecated

| File | Action |
|------|--------|
| `app/components/NativeAdBanner.tsx` | Rename to `PromoBanner.tsx`, add `variant` prop, update all imports |
| `app/components/Header.tsx` (root) | Delete if dead code after confirming no imports; otherwise clean emojis and keep as legacy shim |

---

## 5. Design Specs

### Color Lock
- Primary Text: `#0B0B0D` (Deep Night)
- Brand Accent: `#f0c444` (Saffron)
- Paper: `#FDFBF7`
- Surface: `#ffffff`
- Muted: `#6B6B6B`
- Border: `#E8E4DC`

### Typography
- Display: `var(--font-geist-sans)`, `font-black`, `tracking-tight`
- Body: `var(--font-geist-sans)`, `text-sm`, `leading-relaxed`
- Mono (numbers): `var(--font-geist-mono)`, `font-bold`

### Radius Scale
- Small chips: `rounded-[14px]`
- Cards: `rounded-[20px]`
- Large cards/banners: `rounded-[24px]`
- Pills: `rounded-full`

### Shadows
- Rest: `var(--shadow-rest)`
- Hover: `var(--shadow-hover)`
- Elevated: `var(--shadow-elevated)`

### Motion
- Hover lift: `translateY(-3px)` + shadow-hover
- Press: `scale(0.96)`
- Spring (CSS): `cubic-bezier(0.34, 1.56, 0.64, 1)` (elastic)
- Stagger: `80ms` per item
- **No `@starting-style`** — Safari 16.4 (browserslist target) does not support it. Use `IntersectionObserver` + CSS class toggle for scroll reveals.

---

## 6. Acceptance Criteria

### Phase 1
- [ ] `@phosphor-icons/react` in `package.json` (no `framer-motion` yet)
- [ ] No emojis in any component file, excluding policy/content pages (verified via `grep -r '[\x{1F600}-\x{1F64F}]'`)
- [ ] `CartSheet` mounted once in `CartSheetProvider` inside `layout.tsx`; no local mounts in `HeaderCartButton`, `HomeSectionsClient`, or `BottomNavCartPill`
- [ ] `HomeSectionsClient` no longer auto-opens cart on `onAdd`
- [ ] Trust section uses asymmetric bento (not 4 equal cards)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Phase 2
- [ ] FlashSaleStrip renders with working countdown when `endTime` prop provided
- [ ] FlashSaleStrip hides itself when `endTime` is past or absent
- [ ] ThemedShortcuts replace CategoryGrid on homepage (6 campaign chips visible)
- [ ] CategoryGrid still works on `/category` page

### Phase 3
- [ ] InlinePromoBanner appears between 2nd and 3rd product sections
- [ ] `NativeAdBanner` renamed to `PromoBanner` with `variant` prop
- [ ] Scroll reveal uses `IntersectionObserver` (not `@starting-style`)

### Phase 4
- [ ] ProductCard shows single formatted price line
- [ ] Sale info shown as compact strikethrough + savings text (no green badge)
- [ ] Unit price visible but de-emphasized (`text-stone-300 text-[9px]`)
- [ ] Wishlist heart: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`
- [ ] Product grid has staggered fade-up animation

### Phase 5
- [ ] Header cart shows total price + count
- [ ] Header wishlist icon added with count badge
- [ ] All header emojis replaced with Phosphor icons

### Phase 6 (Conditional)
- [ ] Cart sheet uses CSS spring curve (not installed Framer)
- [ ] If Framer is added: all `AnimatePresence` mounts isolated in leaf components

### General
- [ ] Mobile layout verified: no horizontal scroll, touch targets >= 44px
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Browserslist compliance: `safari 16.4` support verified

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dual CartSheet mount causes z-index / focus-trap conflicts | High | High | **Fixed:** Graduate to `CartSheetProvider` and mount once in `layout.tsx`. Remove local mounts in `HeaderCartButton`, `HomeSectionsClient`, and `BottomNavCartPill`. |
| `@starting-style` has no Safari < 17.4 support | Medium | Medium | **Fixed:** Use `IntersectionObserver` + CSS class toggle instead. Browserslist targets `safari 16.4`. |
| `ThemedShortcuts` hardcoded labels become stale | High | Medium | Ship hardcoded with `TODO:` to migrate to Supabase `campaigns` table. |
| Phosphor icons don't match existing SVGs | Low | Low | Standardize strokeWidth to `1.5`. Custom icons stay in `CategoryIcons.tsx`. |
| Removing `formatUnitPrice` may have legal implications | Low | High | **Fixed:** Keep unit-price, de-emphasize rather than remove. |
| Flash sale perpetual midnight feels like dark pattern | Medium | High | **Fixed:** `endTime` prop only — no fake countdown. Strip hides when no sale is active. |
| Framer Motion bundle bloat | Low | Medium | **Fixed:** Deferred to Phase 6. CSS-first for all motion. |
| Wishlist heart invisible on mobile (hover-only) | Medium | Medium | **Fixed:** `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` — always visible on mobile. |

---

## 8. Post-Launch Metrics to Watch

| Metric | Baseline | Target |
|--------|----------|--------|
| Homepage bounce rate | TBD | -15% |
| Add-to-cart rate | TBD | +20% |
| Category page entries from homepage | TBD | +30% (themed shortcuts effect) |
| Time on page | TBD | +25% |
| Cart abandonment | TBD | -10% (header price visibility) |

---

## 9. Changelog (v1 → v2)

| # | Issue | v1 | v2 Fix |
|---|-------|-----|--------|
| 1 | `framer-motion` installed in Phase 1 | Installed immediately | Deferred to Phase 6 (CSS-first for Phases 1–5) |
| 2 | Missing emojis in audit | Only 4 listed | Added `HeaderCartButton:31` (`🛒`), `Header:110` (`🔍` mobile), `HomeShell:24-25` (`🔥`, `⭐`) |
| 3 | `CartSheet.tsx:84` line ref | Claimed "not found" | Verified: line 84 DOES contain `✕`. Kept in table. |
| 4 | Dual CartSheet mount | Not mentioned | Added §3.1.3 with Option A (remove from HomeSectionsClient) + Option B (provider) |
| 5 | `BottomNav.tsx` audit | Not mentioned | Verified: uses custom SVG icons from `icons/index.tsx` — no emojis. Clean. |
| 6 | `NativeAdBanner` overlap | Not mentioned | Added §3.3.1 — refactor `NativeAdBanner` into `PromoBanner` with `variant` prop |
| 7 | Unit-price removal | Plan said "remove" | Changed to "de-emphasize" (`text-[9px] text-stone-300`) |
| 8 | Savings badge removal | Plan said "remove entirely" | Changed to compact strikethrough + savings text (no green badge) |
| 9 | Wishlist hover-only | `opacity-0 group-hover:opacity-100` | Fixed to `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` for mobile |
| 10 | Flash sale hardcoded midnight | Fake perpetual countdown | Changed to data-driven `endTime` prop — strip hides when no sale active |
| 11 | `@starting-style` for scroll reveals | Recommended in §3.3.1 | Removed. Safari 16.4 doesn't support it. Use `IntersectionObserver` instead. |
| 12 | `typecheck` / `lint` baseline | No current state captured | Added to Phase 1 acceptance criteria: capture before changes |
| 14 | Triple CartSheet mount | Plan identified two mounts in §3.1.3 | Added `BottomNavCartPill.tsx` as third mount; upgraded to `CartSheetProvider` Option B |
| 15 | Incomplete emoji audit | 7 entries across 4 files | Added 6 more entries across 5 files: `HeaderSearch.tsx`, `Header.tsx` (root), `SearchSuggestions.tsx`, `CategorySwimlanes.tsx`, `not-found.tsx` |
| 16 | `CategoryGrid` emoji source | Not specified | Clarified as data-driven from Supabase `categories` table; added slug → icon → emoji → default fallback chain |
| 17 | Root `Header.tsx` ambiguity | Only `updated/Header.tsx` mentioned | Added root `Header.tsx` to modified/deleted inventory; either remove if dead or clean emojis |
| 18 | `HomeSectionsClient` auto-open cart | Mentioned but not decided | Decided to **remove** auto-open; rely on fly animation + `BottomNavCartPill` feedback |

---

**Next Step:** Approve v3 plan, then execute Phase 1 (dependency installation + provider setup + emoji cleanup + CartSheet consolidation) immediately.
