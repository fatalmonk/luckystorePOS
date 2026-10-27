# Lucky Store
## Stack
- Storefront: Next.js 15/React 19; admin: React 19/Vite
- Mobile: Flutter, Expo SDK 57; backend/assets: Supabase, Cloudflare Workers/R2

## Current Task
Resolved all 7 PR review issues and 3 E2E test assertions; ready to push fixes to PR #555.

## Decisions
- 20261027-40: Addressed all 7 review findings and 3 E2E assertions: (1) Added `configurable: true` to `matchMedia` in `vitest.setup.ts`; (2) restored `warm-sheet` in `tailwind.config.js` and defined `--radius-sheet` in `tokens.css`; (3) changed `iconLibrary` to `none` in `components.json`; (4) removed base `will-change: transform` and (5) gated card hover transforms behind `@media (hover: hover) and (pointer: fine)` in `globals.css`; (6) added `[data-bottom-nav-shell]` to reduced motion; (7) narrowed `.gitignore` to `/seo/reports/technical/` and `seo/reports/*.json`; (8) restored `HeritageSection` in `HomeShell.tsx`; (9) updated `text-[11px]` to `text-xs` in `HomeTrustStrip.tsx`; (10) fixed `bg-warm-surface` contrast in `CampaignGrid.tsx`.
- 20261027-39: Committed `86287b57` to `feat/homepage-motion-nav-refinements`, pushed to origin, and created PR #555 (`feat(storefront): integrate Animate UI, dynamic island navigation, and instant language switching`).
- 20261027-38: Ran `jev` completion review and PR review gate: (1) Connected via OS secret store (`latency: 509ms`); (2) evaluated 5-gate policy schema: `scope_contained` (p=0.93), `security_safe` (p=0.88), `verification_sound` (p=0.95), `tokens_compliant` (p=0.81), and `ready_to_merge` (p=0.79) — all verified `yes`; (3) PR review gate marked **PASS**.
- 20261027-37: Code review & deployability audit: stabilized `setTheme` in `theme-toggler.tsx`; verified typecheck, 97 test suites (661 tests), production build (41 routes), secret scan, and project doctor.
- 20261027-36: Simplified `LanguageSwitcher.tsx`: removed motion/wipe, added instant `useTransition` with skeleton pill (`animate-pulse`). Preserved headless API and `onImmediateChange`. All tests passing.
- 20261027-35: Aligned `LanguageSwitcher.tsx` with `ThemeToggler` lifecycle and API: optimistic immediate feedback, explicit targets or dynamic flip, hydration safe.
- 20261027-34: Implemented Animate UI motion fixes across storefront overlays and loops (`Toast.tsx`, `AppDrawer.tsx`, `tokens.css`). Added comprehensive `Toast.test.tsx`.
- 20261027-33: Implemented Dynamic Island Label Fold in `BottomNav.tsx` and `ActiveLink.tsx` on scroll down. Collapses nav from `max-w-[390px]` to `max-w-[280px]` pill without container scale distortion (Rule B9). Preserves screen-reader text (`.sr-only`), active dot, tap press feedback.
- 20261027-32: Implemented 6 high-impact animate-ui fixes: `MotionLink` in `Header.tsx`, internal padding squeeze in `BottomNav.tsx`, `DesktopQuickRail.tsx` opacity transition, fine-pointer hover on `WhatsAppFloat.tsx` and cards, and `tokens.css` hover media rules.
- 20261027-25..31: Integrated `@animate-ui/react` `ThemeToggler`, `LiquidButton`, stashed promo banners in `HomePromoBanners.tsx`, portaled sticky search after hero image, and installed `imskyleen/animate-ui` skill.
- 20261027-5..9: Reverted Header.tsx edits; hero text overlays mobile image; Dynamic Island mobile nav with 30% scroll squeeze; scroll-direction auto-hide header.
- 20261027-10: Configured product cards hover zoom with card container lift/scale (`translateY(-4px) scale(1.03)`) and image zoom (`scale(1.08)`) with GPU will-change acceleration and reduced-motion fallback.
- 20261027-11: Replaced WhatsApp destination in mobile Dynamic Island BottomNav with Cart destination (`/cart`, `/bn/cart`), dynamic cart item count badge, CartIcon, and localized labels.
- 20261027-12: Added Search destination to mobile Dynamic Island BottomNav (`/search`, `/bn/search`) with SearchIcon; layout updated to 5 items in sequence: home-shop-search-cart-profile (`max-w-[390px]`, `gap-0.5`).
- 20261027-13: Mounted floating WhatsApp button globally in RootLayoutDocument at bottom right corner (`bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6`), with route suppression on /checkout and /order and bilingual messaging.
- 20261027-14: Restored visible Search label below SearchIcon (`size={20}`) in Dynamic Island BottomNav for clean alignment across all 5 navigation tabs.
- 20261027-15: Converted AppDrawer into a push drawer portaled to `document.body` with full vertical viewport occupancy (`h-screen h-[100dvh] inset-y-0`), dynamic width (`100vw` mobile, `400px` tablet/desktop), and `.app-container` synchronized push translation via `body.app-drawer-open`.
- 20261027-16: Standardized AppDrawer width across mobile and desktop to `300px` (`min(300px, 85vw)` safeguard on narrow viewports), keeping drawer size and synchronized push translation identical across all screens.
- 20261027-17: Symlinked `stitch-design-taste` into `.agents/skills/stitch-design-taste` for semantic anti-slop design specifications and aesthetic UI refinement.
- 20261027-18: Fixed dynamic bottom nav pinned to bottom of page document instead of viewport. Removed `will-change: transform` from `.app-container` in `tokens.css` which formed an accidental containing block for `fixed` elements; portaled `BottomNavShell` to `document.body` via `createPortal`; added slide-down dismissal on `body.app-drawer-open`; verified with unit test suite (94 files, 645 tests passing).
- 20261027-19: Configured `components.json` in `apps/customer_storefront` and installed `@animate-ui/buttons-liquid` (`liquid.tsx`) with `@animate-ui/react`, `motion`, and `cn`. Cast Component to `React.ElementType` for React 19 compatibility; passed typecheck and vitest.
- 20261027-20: Applied `LiquidButton` to Add to Cart in `GridProductCard.tsx` and `ProductClient.tsx` (`--liquid-button-color: var(--color-accent)`); moved "All" button inside sliding category rail in `Header.tsx` with `LiquidButton asChild` across all rail pills to eliminate static locking; polyfilled `window.matchMedia` in `vitest.setup.ts`; all 94 test files / 645 tests passing.
- 20261027-21: Created `LiquidButtonDemo` in `liquid-demo.tsx`; added `@/components/*` alias to `tsconfig.json`; standardized LiquidButton props across Add to Cart and Category Rail to `delay="0.3s"`, `fillHeight="3px"`, `tapScale={0.97}`. All 94 test files / 645 tests passing.
- 20261027-22: Enforced font color of "All" button in Header.tsx to black (`!text-black hover:!text-black`, `style={{ color: '#000000' }}`); guarded `liquid.tsx` so `asChild` does not inject `text-primary` or button layout classes into wrapped elements. Passed vitest and typecheck.
- 20261027-23: Linked desktop side rail (`DesktopQuickRail`) to scroll-direction auto-hide state (`isHeaderHidden && !isDrawerOpen && !isMobileSearchOpen`). Added `hidden` prop to `DesktopQuickRail` with `-translate-x-full` transition; moved rail out of `<header>` to decouple fixed positioning from header Y-transform. All 94 test files / 647 tests passing.
- 20261027-24: Fixed Home icon and All category button visibility: elevated `DesktopQuickRail` to `z-50` so header background does not bury the top 56px home link; converted `liquid.tsx` background styles to non-destructive sub-properties (`backgroundImage`, `backgroundSize`, etc.) so `asChild` components preserve Tailwind background colors; restored standard `bg-warm-fg text-warm-bg` theme styling to "All" category pill and removed `scroll-fade-x` from category rails. All tests and typecheck passing.
- 20261026-1..43: Reconciled DESIGN.md token contract, trust-strip layout, hero svh clamp, weekly picks, mobile header/rail cleanup, memory tuning audit, and test suite alignment. Full details preserved in Git history.
- History: PR #554 merged as `cd5071c2`; preceding catalog/image work summarized in Git history.

## Blockers
- 20261026-21: Local `next dev` preview emitted repeated `EMFILE` watcher errors and only registered `/_not-found`, so `/` returned 404 (also with Turbopack). A standalone production render returned 200; `next start` warned that standalone output should use its generated server. The Impeccable detector CLI was unavailable in that shell. 20261026-37: CUA's raw CDP adapter rejected animation playback-rate control, so 10% speed motion review remains unverified.

## Resolved
- 20261027-36: `jev setup-key` saved verified key into OS secret store (`latency_ms: 503`, reachable). Resolved auth_failed by identifying literal unexpanded `TYPESAFE_API_KEY` in environment overriding secret store.

## Next
Review `docs/superpowers/plans/2026-10-27-homepage-refinement.md`, confirm design direction, and choose native or subagent-driven execution.
