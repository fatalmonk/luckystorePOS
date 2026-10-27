# Lucky Store
## Stack
- Storefront: Next.js 15/React 19; admin: React 19/Vite
- Mobile: Flutter, Expo SDK 57; backend/assets: Supabase, Cloudflare Workers/R2

## Current Task
Keep the category rail hidden on phones and visible at tablet widths; use desktop category navigation at large breakpoints.

## Decisions
- 20261027-65: Category routes render the horizontal category rail from `md` to `lg`; it stays hidden below `md`, and the desktop category nav remains at `lg` and above.
- 20261027-64: Render the delivery coverage link after the category grid/catalog and before the footer on all category routes, including mobile and Bengali.
- 20261027-62: Superseded: React Bits Pro registry setup was removed when the user clarified they want the visual design without a license.
- 20261027-63: Implement the split sign-in directly with existing Supabase auth, storefront warm tokens, logo, and an original responsive orbital trust graphic; preserve auth and `next` redirect behavior.
- 20261027-61: Mobile category detail routes hide the full global header and its spacer, delivery link, and breadcrumb so the photographic CategoryHero begins at the top; all remain on desktop. `/category` overview and non-category mobile header behavior remain unchanged.
- 20261027-60: The category pill rail is omitted on `/category` routes at mobile breakpoints; desktop category navigation and the rail on non-category routes remain available. Header tests cover English and Bengali category paths.
- 20261027-52: Category pages use CategoryShell, canonical catalog metadata, existing responsiveHeroBanner assets, and CatalogLayout for filters/sort/product cards. New CategoryHero replaces only the banner slot; catalog controls, breadcrumbs, and global Header remain. Show a count only when repository search confirms there are no additional pages; preserve the existing result limits.
- 20261027-55: User requested five category-page updates and review after implementation; use the shared CategoryShell/CategoryHero architecture on a new branch and verify five real category routes responsively.
- 20261027-57: Triggered manual CodeRabbit review after the five-route update; review completed with no actionable comments.
- 20261027-51: User selected visual refinement plus 4K export. Short design: `docs/superpowers/specs/2026-10-27-luckystore-intro-4k-design.md`; 10 s/30 fps, asymmetric product panels, coordinated transitions, native 4K text/shapes. No prior MP4 exists.
- 20261027-50: Built `videos/luckystore-intro` (1080p/30 fps, 10 s) from live storefront logo, imagery and fonts; three scenes, no audio. HyperFrames check passed; inspected beats, phone and cut sheets. Preview: http://localhost:3002/#project/luckystore-intro; export awaits preview approval.
- 20261027-49: Ran `npx hyperframes skills update`; exit 0, installed skills already up to date.
- 20261027-48: Installed all seven `heygen-com/hyperframes` skills via `npx skills add heygen-com/hyperframes --agent codex --yes`; project scope under `.agents/skills`.
- 20261027-47: PR #555 (`feat/homepage-motion-nav-refinements`) merged to `main` via commit `99888b57`. Switched local branch to `main`, pulled latest commit, and pruned deleted local branch.
- 20261027-46: Pushed all accumulated review fixes and E2E audit repairs to `origin/feat/homepage-motion-nav-refinements` (commit `af81ad2d`).
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
- 20261027-63: No React Bits Pro license is available; removed the unused private registry config and proceeded with an original local design implementation.
- 20261027-59: Merged #557 (`c44350f`) then retargeted #558 to `main`; after verifying its four-file intended diff, mergeability, and successful Vercel checks, merged #558 (`5eb372c`). Automatic production deployment `dpl_ExrEhzTWeMjb489jZSeSSeVMnF2E` is READY for that commit. Live five-route English/Bengali checks at 320/390: one labeled H1, no overflow, hero/product images loaded, navigation/filter/sort present; localized counts 134/16/48/65/28 matched remaining counts. No manual deploy.
- 20261027-58: Fixed Bengali product-count localization in #557; #558 adds React `useId`, Bengali count/unique-ID/omitted-count tests, complete-result count semantics, and mobile discovery refinements. Storefront regression suite: 98 files/666 tests; typecheck, scoped ESLint, and build pass. Final preview for #558 head 9b3e84c is READY and both Vercel checks pass. Five routes verified at 320/390px in light/dark: one H1 each, no page overflow, header/breadcrumb/category and bottom navigation, filters and sort retained. First-product Y: at 320 snacks 794.5, cold beverages 816.5, biscuits 944.5, ice cream 814.5, rice 836.5; at 390 snacks 794, cold beverages 794, biscuits 912, ice cream 794, rice 816. Four Biscuits screenshots captured. Regression suite 98 files/666 tests; typecheck/build pass with restricted-network data-fetch warnings. No merge/deploy.
- 20261027-56: Refined shared CategoryHero mobile height to 192px and named its region from the H1. PR #558 is draft on `feat/category-hero-five-pages-556`, stacked on #557; five category routes passed 320/390/768/1440px layout checks.
- 20261027-53: PR #557 opened as draft from `feat/category-hero-556` at `5860a2cd`; local branch aligned to the PR commit after the Git CLI push returned HTTP 403. Production build and mobile/desktop Chrome checks passed; screenshots are in `/private/tmp/category-hero-mobile.png` and `/private/tmp/category-hero-desktop.png`.
- 20261027-54: Applied shadcn/design-system review to CategoryHero: use storefront warm tokens for saffron and radius, use layout-only overrides on the existing custom Button. shadcn add-button dry-run would overwrite that shared custom component; Animate UI CLI found no supported primitive. Keep the page heading visible on first paint; no new motion requested.
- 20261027-36: `jev setup-key` saved verified key into OS secret store. Resolved auth_failed by identifying literal unexpanded `TYPESAFE_API_KEY` in environment overriding secret store.

## Next
Resume intro 4K work when requested; production category hero release is verified.
