# SEO autopilot report — 2026-10-15

## Selected improvement

At PR #481's base commit, `/bn/delivery` emitted English FAQPage JSON-LD without visible Bengali FAQs. Since PR #480 merged, current `main` has four visible Bengali buyer FAQs and no Bengali FAQPage JSON-LD, so PR #481's code change is already present in current `main`. The English `/delivery` route continues to render `DeliveryFaqAccordion`, which consumes the same `DELIVERY_FAQS` source used by its JSON-LD.

## Evidence

- Repo-confirmed: `apps/customer_storefront/app/(english)/page.tsx` and `apps/customer_storefront/app/(bengali)/bn/page.tsx` both declare reciprocal `en-BD`, `bn-BD`, and `x-default` homepage alternates; no homepage hreflang change was needed.
- Repo-confirmed: `/delivery` renders the shared FAQ data visibly and emits `getDeliveryFaqSchema()`.
- Repo-confirmed at PR #481's base: `/bn/delivery` emitted `getDeliveryFaqSchema()` without a matching visible Bengali FAQ section. After PR #480 merged, current `main` renders Bengali buyer FAQs and emits no Bengali FAQPage JSON-LD.
- Search Console evidence: property `sc-domain:luckystore1947.com`, current window 2026-09-14–2026-10-11: 124 clicks, 7,895 impressions, CTR 0.0157, average position 8.24. Previous window 2026-08-17–2026-09-13: 51 clicks, 3,971 impressions, CTR 0.0128, average position 13.62. The current top-page rows include `/delivery` (50 impressions, 0 clicks, CTR 0, average position 32.62) and `/bn/delivery` (4 impressions, 0 clicks, CTR 0, average position 8.25).

These page rows are incomplete top rows; CTR is a fraction, average position is not a guaranteed rank, and Search Console does not establish indexing or conversions. The technical audit is `passed_sample` only: 14 pages fetched, 13 sitemap URLs inspected, 889 discovered sitemap URLs skipped. Production deployment and live rendered HTML remain unverified.

## Affected URL and validation

- Affected URL: `https://www.luckystore1947.com/bn/delivery`
- Needed: storefront lint/typecheck/tests/build, then inspect rendered Bengali delivery HTML to confirm no FAQPage JSON-LD is emitted and confirm the English route still has visible FAQ text matching its schema.
- Unverified assumption: the current checkout and delivery policy remain the source of truth; this change does not alter any delivery policy or customer-facing policy text.
