# Lucky Store
## Stack
- Storefront: Next.js 15/React 19; admin: React 19/Vite
- Mobile: Flutter, Expo SDK 57; backend/assets: Supabase, Cloudflare Workers/R2

## Current Task
Addressed all remaining code review comments and accessibility suggestions for PR #555.

## Decisions
- 20261027-45: Verified review comment on `vitest.setup.ts`: confirmed `configurable: true` is already present on `window.matchMedia` property descriptor (added in `fbb16d20`). Verified `ThemeProvider.test.tsx` (3/3 tests) passes cleanly without redefinition errors.
- 20261027-44: Fixed Playwright E2E `homepage-audit.spec.ts` failure: restored section `aria-label` to `'Why shop with Lucky Store'` / `'কেন লাকি স্টোরে কেনাকাটা করবেন'` and reinstated the 4th trust fact `Trusted since 1947` with `ShieldCheck` in `HomeTrustStrip.tsx`. Verified typecheck and 97/97 test suites pass.
- 20261027-43: Verified review comment on `ActiveLink.tsx`: confirmed CartBadge is already positioned outside the `aria-hidden` wrapper, exposes count to assistive tech, accepts `badgeLabel`, and `BottomNav` supplies `dict.bottomNav.cartBadge` (already implemented in commit `b6bdf1e6`). Verified 97 test suites (661 tests) and typecheck pass.
- 20261027-42: Addressed code review comments: (1) Added `## Resolved` to `AGENTS.md` context template; (2) exposed CartBadge outside `aria-hidden` with localized `badgeLabel` from `dict.bottomNav.cartBadge`; (3) disabled `LiquidButton` inline transitions when `reduce` motion preference is active; (4) replaced unsupported `scale-108` with `scale-[1.08]` and handled null `leadDiscount` in `DealOfTheWeek.tsx`; (5) normalized path with `stripLocalePrefix` in `WhatsAppFloat.tsx`; (6) guarded product card hover `z-index` and transforms inside `@media (hover: hover) and (pointer: fine)` in `globals.css`; (7) updated E2E hover contrast check with `expect.poll`; (8) removed `./flutter` local SDK fallback in `apps/mobile_app/build.sh`; (9) made `PopularBrandsSection` card/logo hover effects `motion-safe`; (10) added unmount cleanup for active timers in `ToastProvider`. Verified 97 test suites (661 tests) and typecheck passing.
- 20261027-41: Resolved CodeRabbit major suggestions: (1) Switched Header compact and main bars at `md` instead of `lg` in `Header.tsx` to restore global search on tablets; (2) restored canonical `/search` and `/profile` routes in `BottomNav.tsx` to prevent 404s on non-English locales.
- 20261027-40: Addressed all review findings and E2E assertions: matchMedia configurable descriptor, restored warm-sheet radius token, none iconLibrary, card hover media query guards, HeritageSection restoration, text-xs subtitle, and delivery CTA contrast.
- 20261027-38..39: Created PR #555 (`feat/homepage-motion-nav-refinements`), ran Jev 5-gate policy check (PASS).
- 20261027-5..37: Implemented Animate UI motion/liquid integrations, instant language switcher, Dynamic Island bottom nav fold, WhatsApp float, desktop quick rail, and theme toggler.
- History: PR #554 merged as `cd5071c2`; preceding catalog/image work summarized in Git history.

## Blockers
- 20261026-21: Local `next dev` preview emitted repeated `EMFILE` watcher errors and only registered `/_not-found`, so `/` returned 404 (also with Turbopack). A standalone production render returned 200; `next start` warned that standalone output should use its generated server. 20261026-37: CUA's raw CDP adapter rejected animation playback-rate control, so 10% speed motion review remains unverified.

## Resolved
- 20261027-36: `jev setup-key` saved verified key into OS secret store. Resolved auth_failed by identifying literal unexpanded `TYPESAFE_API_KEY` in environment overriding secret store.

## Next
Push latest review comment fixes to PR #555 branch and monitor CI.
