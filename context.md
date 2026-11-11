# Lucky Store
## Stack
- Storefront Next.js 16.4.5 / React 19; admin React 19 / Vite; mobile Flutter / Expo SDK 57; backend Supabase, Cloudflare Workers / R2
## Current Task
- Storefront Lighthouse follow-up is on PR #619. Chromium E2E and the other CI checks passed on `ba0f05e6`. Not merged.

## Decisions
- 20261111-lighthouse: Public catalog HTML is ISR (120s) with `public, max-age=0, s-maxage=120`. Cart, checkout, login, profile, order, and wishlist stay `private, no-store`. Hashed `/_next/static` files get a one-year immutable cache. Unhashed public images cache for 30 days, and web manifests for one hour. Security headers are applied in Next config, middleware, the Node response hook, and LiteSpeed `.htaccess`.
- 20261111-csp: CSP is report-only because the storefront uses inline scripts and third-party tags. `upgrade-insecure-requests` is omitted there; browsers ignore it in report-only mode and log an error. HSTS max-age is 31536000 in the app; Cloudflare currently sends 15552000 and must be changed in the dashboard.
- 20261111-e2e-static: Storefront E2E copies standalone `public` and `/_next/static` with `cp -a src/. dest/` so traced font and CSS files already in those directories do not nest the chunk folder.
- 20261111-lazy-image: ProductImage treats a lazy image as failed only after the browser has selected a source. An unfetched image stays mounted so it can load when it enters the viewport.
- 20261111-unoptimized: Next image optimization stays off unless `NEXT_PUBLIC_IMAGE_RESIZE=1`. A custom loader that returns one URL for every width produces a duplicate srcset and the browser drops the image.
- 20261111-fonts: Geist Mono is not loaded; prices use the system monospace stack. Noto Sans Bengali is a Bengali-only file and loads on `/bn` pages only.
- 20261111-htaccess-escape: Apache header values escape backslashes before quotes so a quoted `.htaccess` value cannot break out.
- 20261111-review-fixes: Hostinger's entry file loads the header bootstrap. Unhashed public files cache for 30 days without `immutable`; manifests cache for one hour. Image resizing is on only when `NEXT_PUBLIC_IMAGE_RESIZE=1`, which the Hostinger build sets. Authenticated responses keep private cache headers.
- 20261110-pr609-post-merge: Production smoke of `9c19c5f5b` passed indexing, canonical, and header spot checks. Remaining PerfBee groups need a fresh crawl after this release.

## Blockers
- 20261108-e6r-production-parity: production migration evidence is not a full version set.
- 20261108-committed-db-secret: `scripts/db/backup_db.mjs` still contains a connection string; rotate separately.

## Resolved
- 20261111-e2e: Chromium E2E passed after fixing nested standalone static files, report-only CSP noise, lazy-image failure detection, and the duplicate image srcset.
- 20261111-soft-404: unknown product, brand, and blog slugs return HTTP 404 from middleware, including `/bn` product and brand URLs.
- 20261109-security-headers-config: frame, referrer, and nosniff headers now also cover static files and non-HTML responses.

## Next
- After merge, deploy through the Hostinger workflow and confirm Cloudflare HSTS, HTML cache rules, and LiteSpeed `.htaccess` as noted in the PR.
