# NotFair SEO blog integration

## Current release status — October 12, 2026

Implementation is validated, but the public launch is incomplete.

- Reviewed release commit: `d255a9f40f64aa1a4d21ea550602afa86b67d723` on the local
  `codex/notfair-seo-blog` branch in the attached isolated worktree. It has not
  been pushed to GitHub or merged into main.
- Vercel deployment `dpl_GK67d1VtTaC7VYG5R5nAGrc9DSyt` is READY:
  `https://lucky-store-6nqvxvilo-mac-alvis-projects.vercel.app`.
- Its `/blog` route was verified through the existing signed-in browser, with the
  Blog heading and the zero-published-posts state. No authentication bypass link
  was created: automatic approval review rejected the bypass-fetch tool, and
  verification continued through the normal authenticated browser session.
- The public `https://www.luckystore1947.com/blog` still returns HTTP 404.
  Cloudflare's apex A record targets `88.223.84.66`; `www` aliases the apex. No
  storefront Worker route intercepts these requests. The response reports
  `cf-cache-status: DYNAMIC` with no Vercel response headers. The public origin
  therefore differs from the new Vercel deployment; neither DNS nor origin
  settings were changed.
- Hostinger's website inventory read failed with
  `timed out awaiting tools/call after 300s`. The user confirmed no sign-in prompt
  appeared. The native Chrome inspection also timed out. No Hostinger write,
  environment replacement, archive upload, or deployment was performed.
- The latest NotFair content request returned HTTP 200 and zero posts. A real
  published article's hero, HTML styling, table-of-contents navigation, mobile
  table scrolling, and attribution still require live verification.
- The initial archive `/private/tmp/luckystore-notfair-seo-d255a9f.zip` includes
  84 tracked entries matched by the release commit's `.gitignore` and must not
  be used for Hostinger deployment. The clean replacement is
  `/private/tmp/luckystore-notfair-seo-d255a9f-clean.zip` (22,117,112 bytes), with
  1,655 source files and zero ignored, private environment, dependency, or build
  entries. Its SHA-256 is
  `5762377d50ae64aabf54c671bf66fd9e2c1b9e2908c76995f875bfc8be3f7ddb`.
  Review active hosting settings before using it; neither archive has been
  uploaded to Hostinger.
- The previous Vercel production deployment was
  `dpl_HFDDvsmfQcaTe9MBQyc6zJKicDTc`. No rollback was performed; the public origin
  remains unchanged.

Next step: restore access to the active hosting service, identify the exact
website and Node.js build settings, and add only `NOTFAIR_SEO_API_KEY` while
preserving every existing environment value. Hostinger's API environment update
is a full replacement with masked readback, so do not send an incomplete set or
masked placeholder values. Prepare the matching source release for review before
any further hosting write. A move of production DNS to Vercel is a separate
decision requiring explicit authorization.

The final build's 110 client JS/JSON/HTML assets contained zero occurrences of
the private NotFair key. Both local environment files remain ignored by Git.

First scheduled heartbeat received at 12:29 UTC on October 12. The public blog
was rechecked and still returned 404. Archive ignore-rule validation found and
removed the packaging issue above without changing the release code or rerunning
passed application tests. The standalone server entry exists at
`apps/customer_storefront/.next/standalone/apps/customer_storefront/server.js`
in the validated local build; the active host's matching startup settings still
need verification.

The narrowed Hostinger website inventory retry also timed out after 300 seconds.
The private Codex browser dashboard opens the Hostinger login page. The user
reported signing in, but refreshing that browser session still returned the login
page. That specific tab was then made visible, and a private sign-in handoff was
requested. No credentials were read or requested in chat. Further repeated API
calls are deferred until authentication changes or a longer backoff has elapsed.

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

## Hostinger dashboard verification — 2026-10-12 13:14 UTC

The user's sign-in restored legitimate read access in Codex browser tab 9.
The dashboard greeting is Mohammed. Production `luckystore1947.com` and existing
staging `next.luckystore1947.com` both use manually uploaded `app.zip` with root
`./`, framework Other, Node 22.x, `npm run build`, output `.next`, and entry
`apps/customer_storefront/server.js`. The build command only verifies an already
compiled standalone release. Production current build is
`01a12d0d-d5dc-72e2-9d64-28f4fb9076c2`; staging current build is
`01a12d0c-b5f4-73ff-bb28-fa4ca47b3592`. The production environment table contains
13 variables, with no `NOTFAIR_SEO_API_KEY`; it offers an individual Add control.

Prepared matching runtime package from validated commit d255a9f:
`/private/tmp/luckystore-notfair-runtime-d255a9f.zip`, 18,809,035 bytes,
SHA-256 `de405bbdc8dbac3fb6e6e29470bd245c5443c60521f25b9a98aea97f819f0118`.
It contains compiled standalone output, static/public assets, an npm lockfile,
and the existing verification/entry interface. It excludes node_modules and
private environment files; private NotFair-key occurrence scan passed. This is
for the manually configured standalone deployment, not the generic source-only
automatic deployment tool. The source-only archive remains a separate artifact.
Dependencies installed successfully in a private temporary runtime directory;
audit reported 10 advisories (3 moderate, 7 high). A matching Node 22.23.3 runtime
check returned 200 for `/` and `/blog`, correct titles and empty blog state, with
no runtime errors. No source code changed or passed tests repeated.

Staging redeploy form was prepared without submitting: Other, Node 22.x,
root `./`, npm build, `.next`, and the verified entry above. The form initially
defaulted to Next.js despite the current release being Other, so these choices
must be checked again before saving. No archive uploaded or Hostinger settings
saved. Approval must name staging and the addition of the server-only key;
production release requires its own concrete review after staging verification.

The redeploy form unexpectedly exposed an existing service credential in its
accessibility output. Further form inspection was limited to build fields;
the credential is not copied into this report or release. Rotation is recommended.
Automatic approval review rejected a screenshot because the form could expose
unmasked secrets. No screenshot workaround was attempted. Use the release
manifest and explicit build-field comparison for review.

The user approved the staging release and server-only key addition. Browser tab 9
is now at staging Environment variables with the Add dialog open. Only the key
name `NOTFAIR_SEO_API_KEY` has been entered; the value remains for private human
entry and submission under the browser credential handoff rule. No environment
value has been saved by the agent. Navigating away discarded the unsaved build
form; reapply and verify matching settings after the authorized upload.

## Established GitHub Actions release path — user correction

The staging key is now saved; this was verified by its name in the environment
table without inspecting the value. The approved runtime archive was uploaded,
but Hostinger unexpectedly started a Next.js/default build immediately. Build
`01a13057-4d47-72e4-a12a-ee4167ff12e5` failed with
`ERROR: Next.js build produced no standalone server or static output`.
The deployment list verifies the previous `app.zip` build remains Completed
Current. No manual retry, rollback or production deployment occurred.

The user explicitly directed use of the usual GitHub Actions Hostinger pipeline.
The live workflow `.github/workflows/storefront-hostinger.yml` builds on Node 22,
deploys staging, validates smoke behavior, and gates production. Latest run
`38179809946` succeeded for all five jobs at main commit 6ba806d4. Remote main
still matches that baseline. `HOSTINGER_CUTOVER_DONE=true`, so pushing main can
promote production; do not push or merge main under staging-only approval.
Use workflow_dispatch on the focused branch with `promote_to=staging`.

Local focused release now includes commit `87db9f0` after d255a9f. It adds exactly
one server-only secret reference to each of the Hostinger build and same-repo
storefront E2E workflow, because the SDK requires the key during blog prerendering:
`NOTFAIR_SEO_API_KEY: ${{ secrets.NOTFAIR_SEO_API_KEY }}`.
Both YAML files parse, `npm ci --dry-run --ignore-scripts` passes without legacy
peer flags, whitespace validation passes, and repository secret scan passes.
The existing storefront checks remain valid; no application source changed.
No GitHub NotFair secret currently exists. Publishing this branch and adding the
private key to GitHub Actions requires approval for the new credential destination
and branch publication before dispatching the already approved staging target.
The key pasted into chat should be replaced privately; never reproduce it in
reports, workflow files or commands.

## Approved Actions staging run — 2026-10-12 14:17 UTC

The user approved branch publication, private GitHub Actions secret storage and
the staging dispatch. `NOTFAIR_SEO_API_KEY` was read only from the private local
environment and piped to `gh secret set` stdin; no value entered command text or
output. GitHub secret-name metadata confirms the entry exists. The focused branch
was published at `87db9f0171701396557561fe61c46a7aa336afcd`.

Workflow run [38261762593](https://github.com/fatalmonk/luckystorePOS/actions/runs/38261762593)
was dispatched with `promote_to=staging`. Target resolution passed and immutable
bundle installation started. Completion and live `/blog` verification remain
pending; do not redispatch this run on heartbeat while it is active. Main was not
merged or pushed, and production promotion is not authorized by this approval.

## Actions staging result — 2026-10-12 14:23 UTC

Run 38261762593 completed successfully at commit
`87db9f0171701396557561fe61c46a7aa336afcd`: context, immutable build, Hostinger
staging deploy and staging smoke validation passed; production was skipped.
Smoke output reports 6 passed, 0 failed. Staging `/blog` returns 200 and renders
the correct title, Blog heading, preserved storefront shell and empty state.
Browser CSS is inlined (3 stylesheets); heading font is 36px normally and 30px at
390px mobile width, with no horizontal overflow. Canonical remains
`https://www.luckystore1947.com/blog`. Production `/blog` still returns 404.

The current private local key now returns HTTP 401 from the exact SDK API endpoint,
`https://notfair.co/api/seo/content`, using its Bearer authorization scheme.
The SDK source returns an empty array for any failed index API response, so the
live empty state does not establish successful authentication or zero posts.
Current published-post count is unknown; earlier 200/zero-post evidence is stale.
No article, hero/body/table/TOC/attribution verification can be claimed.
Before production, the user must privately save a valid replacement in local
`.env.local` and Hostinger staging, then confirm. Updating the already approved
GitHub secret and rerunning staging uses the existing approval scope. Do not
request, repeat, log or put the key in commands. Production approval is still
separate, and no main merge or production dispatch has occurred.

### Replacement-key follow-up — 2026-10-12 14:40 UTC

The user confirmed a replacement was saved privately in both places. A fresh API
read from the expected local storefront `.env.local` still returned 401.
The file modification time remains `2026-10-12T03:56:58Z`; one declaration is
present, and standard dotenv parsing matches the prior reader, so quoting or
duplicate declarations do not explain the result. The isolated worktree has no
storefront/root `.env.local`; primary root `.env.local` has no NotFair key.
No secret value was output. Opened the expected local file in Codex for private
editing and requested only the actual saved file path. No GitHub secret update
or staging rerun occurred with the invalid key; existing approval is retained.

The user clarified `line 40`. Safe inspection confirms line 40 is the sole
`NOTFAIR_SEO_API_KEY` declaration in the expected storefront file. Standard dotenv
parsing and a fresh authenticated API read still return 401; this establishes
the file/line location but not a valid credential. Do not request its value.
The next input is a valid privately replaced key, not another file-location check.
