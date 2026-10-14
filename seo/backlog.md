# SEO backlog

Prioritize by verified incremental completed orders per engineering hour. No ranking or traffic estimates without sources.

1. P0 — Confirm production sitemap and robots endpoints from a real HTTP client; inspect source generators and canonical rules. URLs: `/sitemap.xml`, `/robots.txt`. Web tool access failed 2026-10-14; do not label either broken.
2. P0 — Audit indexable product and category routes, soft 404s, canonicalization and internal links; reconcile with Search Console exports.
3. P1 — Verify delivery-area claims against source-of-truth implementation and update location landing pages only if needed.
4. P1 — Connect Search Console and conversion analytics evidence; populate keyword map without invented volume or positions.
5. P2 — Capture competitor sitemap baselines and identify only actionable gaps.

No production fixes shipped in setup PR. Before a functional change: inspect route implementation, lint, typecheck, build and render affected pages.
