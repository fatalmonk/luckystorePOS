# SEO Autopilot — homepage hreflang review — 2026-10-14

## Verified source change

- Evidence: `apps/customer_storefront/app/(english)/page.tsx` had no page-level language alternates and inherited only the root canonical. The Bengali homepage at `/bn` already declared reciprocal `en-BD`, `bn-BD`, and `x-default` URLs.
- Change: added the same reciprocal alternate set to the English homepage (`/`).
- Affected URL: `https://www.luckystore1947.com/` and its language pair `https://www.luckystore1947.com/bn`.
- Conversion relevance: preserves the correct language entry point for shoppers arriving through search and reduces avoidable locale mismatch risk.

## Delivery FAQ verification

No change made. The visible English delivery accordion and FAQ JSON-LD both consume `DELIVERY_FAQS` from `app/lib/deliveryData.ts`, so their questions and answers are code-level single-sourced. Production HTML and current external delivery-policy records were not available to this run and remain unverified.

## Tests needed

- Run `npm run typecheck`, the relevant Vitest suites, lint, and the storefront build.
- Inspect rendered `/` and `/bn` HTML for reciprocal canonical and hreflang tags.

## Unverified assumptions

- This run verifies repository metadata generation only; it does not prove deployed production HTML, indexability, or HTTP status for either homepage.
- No ranking, conversion, indexing, or AI-citation impact is claimed.
