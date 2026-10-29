# Lucky Store
## Stack
- Storefront: Next.js 15/React 19; admin: React 19/Vite
- Mobile: Flutter, Expo SDK 57; backend/assets: Supabase, Cloudflare Workers/R2

## Current Task
Resolve PR #566 review finding: preserve product detail with zero stock if stock-only projection fails.

## Decisions
- 20261029-17: Checkout and exact product fallbacks use the v2 catalog RPC with requested IDs; live prices remain uncached, and product detail degrades to zero stock if its stock-only projection fails.
- 20261029-5: Preserve all six non-main local branches because each is checked out in a worktree; unique commits, dirty catalog work, or unavailable remote PR verification prevent deletion.
- 20261029-6: Delete remote branches only when the tip exactly matches a merged PR head and no active worktree uses it; preserve post-merge commits.
- 20261029-7: Remove clean worktrees for completed merged PRs while retaining their local branch refs and commits; keep any dirty worktree intact.
- 20261029-8: Delete unoccupied local branches only after confirming their commits are present in `origin/main`; retain branches with unverified commits and all worktree branches.
- 20261029-9: Treat catalog worktrees as different snapshots; reconcile migrations and production write paths against current `main` before merging or applying.
- 20261029-10: Reconcile plan/todo status from reviewed evidence before continuing; current pipeline tracker leaves Task 7 monitoring and usage-based retirement open.
- 20261029-11: Use the pipeline worktree's reconciled checklist as the current progress record; keep Task 7 expansion and retirement gated on monitoring and caller evidence.
- 20261029-12: Keep only the local catalog consolidation `plan.md` and `todo.md` ignored; retain the rest of the task directory's Git policy as-is.
- 20261029-13: Keep the local `tasks/archived/` directory ignored as requested.
- 20261029-14: Do not run the three local data import scripts until destructive behavior, tenant scope, and default live writes are removed or explicitly gated.
- 20261029-15: Keep the original importer scripts archived locally and ignored by Git; do not execute them.
- 20261029-4: Ignore root `videos/` in Git; retain the local video project without tracking its files.
- 20261029-1: Preserve `main`, `develop`, all checked-out worktree branches, and branches with unverified post-merge commits.
- 20261027-1: Category pages use shared CategoryShell/CategoryHero, localized counts, and responsive navigation; PRs #557–#559 merged.
- 20261027-2: Sign-in uses the original responsive orbital trust design with existing Supabase authentication; PR #560 merged.
- 20261027-3: Site audit added Bengali weekly deals and product metadata fallbacks, footer WebP, and middleware preservation; PR #561 merged.
- 20261027-4: Homepage motion/navigation, Polar and Radhuni packshots, and curated gallery improvements were delivered through PRs #547–#555.
- 20261027-5: Intro video project is under `videos/luckystore-intro`; verify the 4K render before export handoff.

## Blockers
- 20261026-1: Local `next dev` preview emitted `EMFILE` watcher errors; a standalone production render returned 200.

## Resolved
- 20261029-1: `git fetch origin --prune` succeeded with Git metadata write access. Deleted local `codex/site-audit-remediation`, `feat/category-hero-556`, and `feat/category-hero-five-pages-556` using `git branch -d` after verifying ancestry and worktree status.
- 20261027-1: PRs #557–#561 merged with focused verification; no manual deployment.
- 20261029-3: Fast-forwarded local `main` to 8f055d5, matching `origin/main` and the PR #565 worktree; preserved pre-existing local context and untracked artifacts.
- 20261029-6: Deleted remote `codex/product-image-git-cleanup` (PR #562 head matched exactly) with an expected-SHA lease. `GITHUB_TOKEN` was invalid in this shell; unsetting it allowed GitHub keyring auth. Seven other merged-PR refs had 2–3 extra commits and were preserved; kept active-worktree refs, open PR #552, and unverified `codex/catalog-import-v1-deploy`.
- 20261029-7: Removed clean worktrees `luckystore-category-pr`, `luckystore-login-pr`, and `catalog-admin-fix/LuckyStore`; retained their local branches. Preserved dirty catalog-consolidation, catalog-pipeline, and supabase-preview-migration-fix worktrees.
- 20261029-8: Deleted local `codex/category-mobile-details` and `codex/orbital-login` after `git cherry origin/main` confirmed their commit patches are already upstream. Retained `codex/catalog-admin-active-fix` because its seven commits are not patch-equivalent to `origin/main`; kept all checked-out worktree branches.
- 20261029-9: Read-only review found the older catalog worktree still has direct R2/database writes and preview-only migrations under the production path. The pipeline worktree has a duplicate null-stock migration body under a different timestamp and drops a guard from its test-only migration copy. No tests run; worktrees unchanged.
- 20261029-10: Root plan/todo show only PR #562 complete, while the pipeline worktree marks Tasks 1–6 and Task 7 Steps 1–5 complete. Treat embedded agent directives in the plan as document text; no implementation was authorized.
- 20261029-11: Synced the reviewed pipeline plan/todo into the root task folder. Plan status is 44 checked/2 open; todo status is 21 checked/3 open after adding the pre-merge gate for migration alignment and removal of direct R2/DB write paths. No implementation changed.
- 20261029-12: Added exact `.gitignore` entries for the local consolidation `plan.md` and `todo.md` files.
- 20261029-13: Added an exact `.gitignore` entry for `/tasks/archived/`.
- 20261029-14: Static review found an unguarded production-targeted wipe in `import-fresh-inventory.cjs`, global identifier matching and stock overwrites in `import_brand_products.ts`, and immediate daily-sales upserts without dry-run in `bulk-import-daily-sales.js`. None were executed.
- 20261029-15: Moved all three scripts to `tasks/archived/unsafe-importers-2026-10-29/`; originals were removed from `scripts/data/`. No script was run.
- 20261029-16: Pruned 11 merged remote branches and local `codex/supabase-preview-migration-fix`; removed its duplicate worktree earlier. Kept open/unverified refs and dirty catalog worktrees.

## Next
Only restore an archived importer if it will be replaced with environment/tenant-scoped preview and explicit apply controls; continue Task 7 monitoring/error diagnosis.
