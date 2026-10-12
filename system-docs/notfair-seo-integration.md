# NotFair SEO blog integration

The storefront has no native `/blog` index, dynamic article route, blog renderer,
or MDX source in the inspected App Router tree. New routes are under
`apps/customer_storefront/app/(english)/blog`, so they inherit the existing English
root document, theme, providers, and site metadata. The blog layout reuses the
existing header, footer, bottom navigation, and WhatsApp control.

## Implementation

- `notfair-nextjs-blog` is pinned to the supplied v0.4.1 release archive.
- `sanitize-html` and its types are installed in the storefront workspace.
- `/blog` lists published NotFair summaries, cover images, descriptions, and links.
- `/blog/[slug]` renders `NotFairPostHero`, then the exact supplied sanitizer.
- Scoped CSS covers headings, lists, links, quotes, images, tables, table-of-contents
  hooks, and attribution using existing design tokens in both themes.
- Both routes and upstream content fetches revalidate after 3600 seconds.
- Per-article metadata uses the existing `www.luckystore1947.com` canonical host.
- `notfair.co/api/seo/**` is appended to the existing image allowlist. The existing
  global `images.unoptimized: true` setting is preserved.
- Existing product, category, translation, sitemap, and metadata sources are unchanged.

## Secret setup

Set `NOTFAIR_SEO_API_KEY` privately in
`apps/customer_storefront/.env.local`. That file is ignored by Git. Do not use a
`NEXT_PUBLIC_` prefix and do not paste the value into chat or commit it.

Set the same variable in the existing Vercel **lucky-store** project, under
**MAC Alvi's projects**, for the intended development, preview, and production
environments. The verified project identifier is `prj_OXYSWyhB0307xKWe7BYSoZ2C1VIh`.
The apex domain redirects to `www.luckystore1947.com` in that project.

The user configured the local key privately. The live content API returned HTTP
200 with zero published posts. The key was added to the verified Vercel project
as a server-side Secret for production and preview, and its metadata was read
back without decrypting it. Production builds intentionally fail when
the SDK cannot find the key; do not disguise this as an empty live blog.

## Release verification checklist

1. Confirm the key is present without printing it. Check the live content endpoint
   status and published post count without exposing the authorization header.
2. Run storefront typecheck, tests, lint, build, scoped whitespace validation, and
   secret scan. Inspect the dependency audit before release.
3. Prepare a clean source containing only the reviewed integration changes and root
   lockfile. Preserve unrelated local work. Verify Vercel project linkage.
4. Deploy the storefront to the verified existing project after all checks pass.
5. Verify `/blog` and an actual published `/blog/{slug}` publicly on the production
   domain, including redirects, featured images, full body, table-of-contents
   navigation, attribution, headings, and list markers.
6. At a mobile viewport, confirm wide tables scroll inside their wrapper without
   overflowing the article. Check both light and dark themes.

Fixture tests verify route rendering and sanitization; they do not constitute
live NotFair API, browser, crawler, or production deployment verification.

## Tooling observations

Initial npm install failed with `EPERM` in the user's npm cache. Installation
succeeded using `/private/tmp/luckystore-notfair-npm-cache` without modifying cache
ownership. npm hoisted the same Next.js version (15.5.25) to satisfy the SDK peer
dependency and regenerated the root lockfile.

Vercel MCP access and CLI login are verified. CLI login needed a retry with
permission to save its credential file. CLI version 60.1.3 is outdated; upgrading
with `npm i -g vercel@latest` is recommended.

The final storefront dependency audit reported 12 advisories (2 moderate, 8 high,
2 critical), including the existing Next.js, Sharp, lint and test dependencies.
None were keyed to the newly added NotFair/sanitizer packages in the returned audit.
Unrelated Sharp upgrades introduced by installation were removed and the installed
tree synchronized to the reviewed lockfile. No broad audit fix was applied.
The unscoped whitespace check also reported the
pre-existing unrelated `context.md:9: new blank line at EOF.`

Validation: 393 tests passed across 69 files; storefront typecheck, lint, build,
scoped whitespace validation and secret scan passed. The SDK is inlined in the
Vitest runner to normalize its `next/image.js` CommonJS import for ESM tests.
