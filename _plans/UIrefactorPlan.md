# Lucky Store 1947 — Storefront UI Refactoring Plan

> **Status:** Execution-Ready  
> **Version:** 1.0.0-Hermes  
> **Target:** `apps/customer_storefront`  
> **Execution Model:** Hermes Agent Loop (Machine-Verifiable Phases)  
> **Checkpoint File:** `/tmp/ui_refactor_checkpoint.json`  

---

# EXECUTION MODEL: Hermes Agent Loop

Each phase in this plan is **idempotent**, **machine-verifiable**, and **fails independently**. 
A phase that fails halts execution. The agent must correct the issue and re-run the phase. 

### Checkpoint Lifecycle
At the start of each phase, the agent must check `/tmp/ui_refactor_checkpoint.json`. If the phase is marked as completed, the agent must skip directly to the next phase. Upon successful verification of a phase, the agent must write the updated phase state to the checkpoint file before proceeding.

```json
{
  "phase_1_tokens": true,
  "phase_2_stores": false,
  "phase_3_navbar": false,
  "phase_4_mobile_menu": false,
  "phase_5_search": false,
  "phase_6_ui_components": false,
  "phase_7_quality_gate": false
}
```

---

# PHASES OF REFRACTORING

---

## Phase 1: Tailwind Tokens & Fonts Integration

### Objective
Configure the Tailwind theme extensions and CSS variables in the Next.js storefront to support the yellow-locked color palette, Geist and Geist Mono typography (with Noto Sans Bengali fallback), and custom warm shadows.

### Tasks
1. Verify `layout.tsx` loads `Geist`, `Geist_Mono`, and `Noto_Sans_Bengali` from `next/font/google`.
2. Update `tokens.css` to define exact CSS variables:
   - `--color-paper`: `#FDFBF7`
   - `--color-surface`: `#FFFFFF`
   - `--color-foreground`: `#1A1A1A`
   - `--color-muted`: `#6B6B6B`
   - `--color-dim`: `#6B6B6B`
   - `--color-border`: `#E8E4DC`
   - `--color-border-light`: `#FDFBF7`
   - `--color-accent`: `#F5C518`
   - `--color-accent-hover`: `#E2B40D`
   - `--color-accent-ghost`: rgba(245, 197, 24, 0.08)
   - `--color-accent-text`: `#1A1A1A`
   - `--color-accent-muted`: `#FFF8E1`
   - `--color-accent-dark`: `#C79400`
   - `--color-success`: `#16A34A`
   - `--color-danger`: `#DC2626`
   - `--shadow-warm-rest`: `0 4px 24px rgba(245, 197, 24, 0.03), 0 1px 2px rgba(26, 26, 26, 0.02)`
   - `--shadow-warm-hover`: `0 12px 32px rgba(245, 197, 24, 0.08), 0 4px 8px rgba(26, 26, 26, 0.04)`
3. Update `tailwind.config.js` to map colors (`warm-bg`, `warm-surface`, `warm-fg`, `warm-muted`, `warm-border`, `warm-accent`, `warm-accent-hover`, `warm-accent-muted`, `warm-accent-dark`, `warm-success`, `warm-danger`) and custom shadows (`warm-rest`, `warm-hover`).

### Verification Gate (Agent-Run Command)
```bash
# 1. Compile Tailwind and run Next.js build
npm run build --prefix apps/customer_storefront
# 2. Confirm zero type errors
npm run lint --prefix apps/customer_storefront
```
*If successful, write `{"phase_1_tokens": true}` to `/tmp/ui_refactor_checkpoint.json`.*

---

## Phase 2: Zustand Reactive State Management

### Objective
Create global stores for cart state (`useCartStore`) and UI states (`useUIStore` for managing search expansion, mobile menu toggles, and scroll-aware sizing thresholds) using Zustand.

### Implementation Blueprint
Create two store files:
1. `apps/customer_storefront/app/stores/useCartStore.ts`:
   - Persists state in `localStorage` with a 7-day expiration.
   - Syncs cart state with the database upon user authentication.
2. `apps/customer_storefront/app/stores/useUIStore.ts`:
   - Tracks `searchExpanded` (boolean), `mobileMenuOpen` (boolean), and `scrollDirection` (up/down).

### Verification Gate (Agent-Run Command)
```bash
# Verify store compilation by compiling TypeScript files in app/stores
npx tsc --noEmit --project apps/customer_storefront/tsconfig.json
```
*If successful, write `{"phase_2_stores": true}` to `/tmp/ui_refactor_checkpoint.json`.*

---

## Phase 3: NavIsland Component Refactoring

### Objective
Replace the sticky header in [Header.tsx](file:///Users/mac.alvi/Desktop/Projects/Lucky%20Store/apps/customer_storefront/app/components/updated/Header.tsx) with a responsive, floating, height-capped (`64px`) `NavIsland` component.

### Implementation Blueprint
1. **Scrolling Physics:** Use a custom React hook `useScrollDirection` to trigger the scroll-aware class bindings:
   - Scroll Down: Apply `scale-[0.96] h-[52px] bg-white/95 border-[#E8E4DC]/80 shadow-[0_4px_24px_rgba(245,197,24,0.04)]` with a transition of `300ms cubic-bezier(0.32, 0.72, 0, 1)`.
   - Scroll Up: Revert to `scale-100 h-[64px] bg-white/80 border-[#E8E4DC]/50`.
2. **Responsive Logo Structure:**
   - Width ≥ 1024px: Full "LUCKY STORE" wordmark + gold dot + "1947" label.
   - Width 768px - 1023px: "LUCKY" wordmark + gold dot.
   - Width < 768px: Gold dot only.
3. **Active Category Indicators:** Map over category links and render a `bg-brand-gold` 4px circular dot underneath the text for active links.

### Verification Gate (Agent-Run Command)
```bash
# Verify component import structures and JSX compilation
npm run build --prefix apps/customer_storefront
```
*If successful, write `{"phase_3_navbar": true}` to `/tmp/ui_refactor_checkpoint.json`.*

---

## Phase 4: MobileMenu Full-Screen Glass Overlay

### Objective
Implement the mobile hamburger button morph transition and full-screen menu overlay with staggered fade-up link reveals.

### Implementation Blueprint
1. **Hamburger Morph Button:** Render a button with two HTML spans. When `mobileMenuOpen` is true:
   - Span 1: Apply `rotate-45 translate-y-[3px]`
   - Span 2: Apply `-rotate-45 -translate-y-[3px]`
   - Perform animations via GPU-safe transforms.
2. **Mobile Menu Overlay (`MobileMenu.tsx`):**
   - Background: `bg-[#FDFBF7]/95` with a CSS `@supports` fallback checking for `backdrop-filter: blur(24px)`.
   - Scroll Lock: Apply `document.body.style.overflow = 'hidden'` on mount, and restore `'auto'` on unmount.
   - Staggered Links: Map categories and links using delayed class states (`delay-75`, `delay-150`, `delay-225`).
3. **Typography:** Set headers to `text-2xl font-extrabold tracking-tight text-charcoal`.

### Verification Gate (Agent-Run Command)
```bash
# Run ESLint to ensure no syntax/import errors are present in the new mobile components
npm run lint --prefix apps/customer_storefront
```
*If successful, write `{"phase_4_mobile_menu": true}` to `/tmp/ui_refactor_checkpoint.json`.*

---

## Phase 5: Inline Expanding Search & Suggestions

### Objective
Build the inline expanding search input for desktop viewports and the full-screen search overlay for mobile devices.

### Implementation Blueprint
1. **Desktop Inline Expander:**
   - Animate *only* `width` and `opacity` properties using custom transition speeds (`transition-[width,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]`).
   - Category links must be set to `opacity-0 pointer-events-none` when search is active.
   - Provide explicit close triggers: Escape key press, outside click hook, and a custom "X" close icon button inside the search pill.
2. **Search State Mockups:**
   - Loading State: Render a 16px yellow spinning icon inside the input on submit, navigate to `/search`, and display a 6-card pulsing skeleton grid.
   - Empty State: Render a centered panel stating *"No products found for 'query'"*, suggest standard search topics (e.g. *milk, rice, snacks*), and a prominent full-width *"Browse All Categories"* CTA button.



---

## Phase 6: Double-Bezel Card & Pull-to-Refresh

### Objective
Integrate the double-bezel card structure across all product grids, implement mobile gesture animations (pinch-to-zoom on detail views, swipe-to-delete in cart), and configure pull-to-refresh on mobile lists.

### Implementation Blueprint
1. **Double-Bezel Card Container:**
   - Outer shell: `border border-[#E8E4DC]/50 padding-[6px] rounded-[20px] bg-white`.
   - Inner core: `rounded-[14px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] padding-[16px] bg-white`.
   - Radii for mobile: Scale down to `rounded-[12px]` outer shell and `rounded-[8px]` inner core.
2. **Pull-to-Refresh:**
   - Touch-down threshold: 60px on grids.
   - Visual Feedback: Render a yellow 24px spinner on a bone-white backdrop, triggering a `50ms` haptic vibration on mobile devices.
3. **Pulsing Skeletons:** Set loading grids to animate via `bg-[#E8E4DC] animate-pulse` for images, titles, prices, and buttons.

### Verification Gate (Agent-Run Command)
```bash
# Run production build and verify complete static page rendering
npm run build --prefix apps/customer_storefront
```
*If successful, write `{"phase_6_ui_components": true}` to `/tmp/ui_refactor_checkpoint.json`.*

---

## Phase 7: Quality Gate & Performance Budgets

### Objective
Run automated verification suites to ensure LCP, INP, CLS, accessibility compliance, and browser matrices meet target metrics.

### Performance Target Budget
- **LCP (Largest Contentful Paint):** < 2.5s (verify all hero images load with `priority` and prefetch tags).
- **INP (Interaction to Next Paint):** < 200ms (verify Zustand state updates execute under `16ms`).
- **CLS (Cumulative Layout Shift):** < 0.1 (ensure all skeletons and containers have explicit dimensions).
- **Bundle JS Size:** < 150KB (initial payload).

### Verification Gate (Agent-Run Command)
```bash
# 1. Run all linting checks
npm run lint --prefix apps/customer_storefront
# 2. Execute full Next.js production build and trace checking
npm run build --prefix apps/customer_storefront
# 3. Check for any remaining console.log or debugger statements in app directory
! grep -rn "console.log" apps/customer_storefront/app/components --exclude-dir=node_modules
```
*If successful, write `{"phase_7_quality_gate": true}` to `/tmp/ui_refactor_checkpoint.json`.*
