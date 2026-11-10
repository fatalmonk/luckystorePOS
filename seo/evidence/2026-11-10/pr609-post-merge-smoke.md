# PR #609 Post-Merge Production Smoke

- Checked: 2026-11-10 UTC, bounded read-only GETs and PerfBee URL rechecks
- Expected/observed release: `9c19c5f5b57a4d24526696390d9cd33158c1321f`
- Release evidence: `https://www.luckystore1947.com/api/health` returned HTTP 200 with `buildSha` equal to the merge SHA.
- Method: raw HTML and response-header parsing with `scripts/seo/technical_monitor.py`; targeted URL facts cross-checked with PerfBee `recheck_url`.
- Response sizes below are monitor body bytes, not compressed transfer sizes.

## Sampled routes

| URL | HTTP | Body bytes | Canonical / robots | Hreflang and head placement |
|---|---:|---:|---|---|
| `https://www.luckystore1947.com/` | 200 | 674,864 | One self-canonical; no robots directive observed | `en-BD`, `bn-BD`, `x-default`; SEO metadata in `<head>` |
| `https://www.luckystore1947.com/product/aarong-standardized-milk-500-ml--3d7c76cf` | 200 | 262,197 | One self-canonical; no robots directive observed | `en-BD`, `bn-BD`, `x-default`; alternates match Bengali partner; in `<head>` |
| `https://www.luckystore1947.com/bn/product/aarong-standardized-milk-500-ml--3d7c76cf` | 200 | 179,959 | One self-canonical; no `noindex` | Reciprocal `en-BD`, `bn-BD`, `x-default`; in `<head>` |
| `https://www.luckystore1947.com/bn/product/aarong-pasteurized-liquid-milk-1000ml-pouch--d95c2e81` | 200 | 167,425 | Bengali self-canonical; `noindex, follow`; no `X-Robots-Tag` observed | No hreflang; SEO metadata in `<head>`. Read-only production query confirmed no `bn` translation row for this active item. |
| `https://www.luckystore1947.com/category/dairy-and-eggs` | 200 | 395,955 | One self-canonical; no robots directive observed | Three locale alternates; SEO metadata in `<head>` |

No duplicate title, description, or canonical tags were observed in these raw responses. No inline `<style>` payload was observed in the sampled bodies; this is not a matched before/after measurement.

## Security headers

All five sampled HTML responses included:

- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: upgrade-insecure-requests`

`X-Robots-Tag` was absent on the tested routes; the unpublished translation's HTML robots directive supplied the expected `noindex, follow` behavior.

## PerfBee follow-up and limits

PerfBee's latest full crawl available during this check was completed 2026-11-08, before PR #609. Targeted rechecks on 2026-11-10 reproduced matching title, description, and H1 values for two distinct active Dove SKU URLs; the data investigation is being handled in a separate worktree. Other historical grouped findings are not cleared by this small sample. Obtain a fresh bounded crawl before sitewide reconciliation.

The earlier files in `seo/evidence/2026-11-09/` are pre-merge captures. Their build attribution is recorded in the contemporaneous local notes as `18fbc3ac`; the raw files themselves do not bind to a build SHA. The captured Bengali product and weekly-deals responses place metadata in `<body>`, while homepage, English product, and brand samples place it in `<head>`. The English category capture is a 9-byte HTTP 404 body and is invalid for SEO review.
