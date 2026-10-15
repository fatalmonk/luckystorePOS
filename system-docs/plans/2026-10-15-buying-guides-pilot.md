# Lucky Store Buying Guides: audit and pilot implementation plan

Status: pilot infrastructure implemented locally with three review-only research records. Publication, merge and deployment require separate approval.

## Objective and source context

Build a permanent `/best/[slug]` product-discovery feature in the existing customer storefront. The first milestone is one useful, server-rendered guide connected to real shopping actions and existing consent-aware analytics. AI citations and Google AI Overview placement are measured outcomes, not acceptance guarantees.

Sources reviewed on 2026-10-15:

- User's buying-guide brief and attached `Pasted text.txt`.
- Shared conversation: https://chatgpt.com/share/6ad0e45f-7588-83ec-9286-1f8452301ea4 (original 14-step framework plus the adapted brief).
- Repository source paths listed below and anonymous public-catalogue reads. No database changes.
- Google Article guidance: https://developers.google.com/search/docs/appearance/structured-data/article
- Google AI features guidance: https://developers.google.com/search/docs/appearance/ai-features

Retain useful bylines, honest publication/revision dates, an answer-first introduction, five takeaways, category explanation, measurable methodology, product details, semantic comparison and use-case tables, FAQs and shopping CTAs. Do not mechanically import SaaS demos, G2 scores, forced word counts, fabricated case studies, bot-only claims, or self-awarded rankings. Use video, portraits and testimonials only when real approved assets and evidence exist.

## Verified architecture and gaps

| Area | Existing integration | Pilot decision |
| --- | --- | --- |
| Routes | Next.js 15 App Router under `apps/customer_storefront/app/(english)` | Add `/best` and `/best/[slug]`; preserve blog and product routes. |
| Blog | `lib/notfair-client.ts`, `/blog/[slug]`, server-only API credential, sanitized article HTML | Keep existing NotFair articles intact. Structured catalogue comparisons need a typed guide model, not arbitrary blog HTML. |
| Product data | `search_storefront_catalog` public RPC scoped by fixed storefront ID and store tenant | Use the same public projection with the fixed Lucky Store ID. Do not use service-role keys, broaden RLS or accept a caller-selected tenant/store. |
| Product URLs | `app/lib/products/slugify.ts` | Reuse canonical product slug generation. |
| Catalogue fallbacks | `getCachedProductBySlug` can return `FALLBACK_PRODUCTS`; product adapter also derives brands and defaults units to `pc` | Guides must not treat fixtures, inferred brands or `pc` as authoritative pack-size/specification evidence. |
| Evidence | Product enrichment registry separates factual content and source references | Use source references and exact catalogue IDs; keep editorial revisions separate from mutable prices/stock. |
| SEO | `app/sitemap.ts`, `JsonLd.tsx`, product structured data, middleware canonical rules | Share guide publication eligibility across detail, index and sitemap. Escape JSON-LD through the existing component. |
| AI content negotiation | Middleware rewrites some AI user agents and Markdown requests to `/api/markdown`; that endpoint has no guide renderer | Serve complete HTML for buying guides instead of a generic Markdown fallback. Test AI user agents as well as normal requests. |
| Analytics | `app/lib/analytics.ts` gates Zaraz/GA4 behind consent; existing cart/checkout/purchase emitters and purchase deduplication | Add guide views/clicks and consent-aware session attribution to existing commerce events. Do not install another pixel or emit purchases from guide pages. |
| Hosting | `next.config.js` uses standalone output; `.github/workflows/storefront-hostinger.yml` builds once and promotes the same artifact through staging checks | Reuse Hostinger runtime and packaging. No new Vercel dependency. No deployment in this task. |
| Editorial workflow | No structured buying-guide workflow identified | Pilot uses version-controlled typed records with draft/review/published/archived states and explicit verification/approval. Git review supplies history; avoid a second CMS/admin application. |

The code audit establishes intended behavior, not successful live Hostinger deployment or current analytics dashboard configuration. Search Console baselines, event custom dimensions, current CDN cache rules, hosting runtime and actual crawler responses still need live release evidence.

## Content readiness and release boundaries

Public catalogue reads confirmed milk-powder and biscuit products with current prices and stock. Names include pack sizes; these are catalogue declarations, not packaging/manufacturer verification. Duplicate-looking milk-powder listings require SKU-level reconciliation before a ranked comparison. An exact `ice cream` search returned zero rows, but the category-scoped follow-up found 56 active Ice-Cream products, all with positive stock at the check. Product names such as `Igloo Chocolate 1 L` explain why the text query was insufficient.

Candidate order:

1. Biscuits: first unranked comparison pilot; confirm exact pack sizes, product types, labels and evidence with the editor.
2. Milk powder: second candidate after separating full-cream products, other milk powders and any infant products; no nutritional superiority or medical suitability claims.
3. Ice cream: three exact Igloo catalogue IDs and declared 500ml/1000ml quantities are recorded for review. Compare volume with volume, separately from the mass-based biscuit and milk-powder guides. Do not make a multi-brand ranking from a single-brand cohort.

Drafts and review records must not appear on public guide routes, indexes, sitemap or structured data. No real guide is marked published, and no editor approval, author identity or publication timestamp is invented. An accountable author/approver is still to be confirmed by the owner. Public, approved content requires its own reviewed revision.

## Smallest production-safe pilot

### 1. Typed editorial records and publication validation

- Reuse Zod and TypeScript already installed in the storefront.
- Record stable slug, title, description, revision, author/profile, methodology, takeaways, category definition, evidence references, product IDs and verified pack sizes, use cases, FAQs and related guides.
- Support draft, review, published and archived states. Publishing requires real publication/modification dates, factual verification and approval explicitly tied to the same revision.
- Reject invalid/duplicate product IDs, unsafe links, missing evidence and invalid chronology. Revision changes invalidate prior approval.
- Prefer unranked comparisons until equivalent product specifications and reproducible scoring inputs are verified. Ranked mode requires documented criteria, per-product rationale and evidence; price updates must not reorder an approved ranking silently.

### 2. Server-rendered catalogue integration

- Read the existing anonymous public RPC from the server with the fixed Lucky Store identity; validate returned rows.
- Resolve only the editorially selected IDs and category. Bound pagination and reject incomplete or malformed responses.
- Fetch current price/availability for each request; never fall back to demo products or last-known prices on upstream failure.
- Fail upstream errors as errors, not false 404s or successful empty product comparisons.
- Show unavailable/removed products explicitly, with no unqualified purchase recommendation. Do not silently promote the next-ranked product.
- Derive price per 100g/100ml only from verified positive net quantities and the same unit; label the calculation. Never compare mass against volume or fabricate missing measures.

### 3. Reusable storefront UI and SEO

- Use existing branding, navigation, design tokens and canonical host.
- One H1; answer-first introduction; author and dates; disclosure; takeaways; methodology; product sections; semantic comparison/use-case tables; FAQs; links to category, delivery and product pages.
- Display real product names, prices and stock in initial server HTML; progressive client tracking must not control article visibility.
- Tables remain keyboard accessible and usable at narrow mobile widths without page-level overflow.
- Reuse safe JSON-LD for Article and BreadcrumbList. Any Product/Offer markup must match visible, current product details; do not invent review/aggregate ratings or assume FAQ rich results.
- Unknown, invalid, draft, review and archived slugs return 404 and cannot enter the sitemap. Canonical guides use evergreen slugs; year labels are edited with substantive revisions, not generated annually.
- An index links only eligible published guides. Do not expose empty feature navigation globally before content is approved.

### 4. Conversion measurement

- Reuse the existing consent gate and Zaraz/GA4 selection/fallback.
- Track a guide view and product selection, attaching guide slug/revision as list/context identifiers.
- Save guide attribution only with analytics consent, with a bounded same-session lifetime. Recheck consent before attaching it to commerce events.
- Add guide context to the existing add-to-cart, checkout and purchase emitters; retain purchase deduplication and existing Meta behavior.
- No additional purchase event, personal identifiers, cart mutations or order writes from the guide route.
- Gross-profit attribution requires an approved server-side reporting join to actual order cost/profit records; client analytics must not expose costs or pretend revenue is gross profit. This reporting work follows the pilot.

### 5. Verification and delivery

1. Unit tests: publication gates, stale approvals, invalid slugs, evidence/quantity validation, ranking preservation and catalogue row validation.
2. Server-render tests: one H1, escaped schema, semantic tables, valid shopping links, out-of-stock behavior, unknown/draft 404s, upstream failures and missing data. Synthetic approved guides exist only in tests.
3. Analytics tests: no tracking/storage without consent, guide context on existing commerce emitters, session expiration and purchase deduplication.
4. Sitemap/middleware regressions: only approved guides listed; existing product/blog canonical behavior preserved; AI-bot requests receive the full guide.
5. Focused lint, storefront TypeScript and production standalone build. Broaden tests where shared analytics/middleware/sitemap changes justify it.
6. Local desktop/mobile browser verification and JavaScript-disabled HTML checks on a clearly identified test fixture/preview, with no fixture published to production.
7. Submit the reviewed pilot through a pull request with evidence, remaining content approvals and release checklist. Do not merge or deploy.

## Subsequent milestones

After an editor approves the first guide, validate Hostinger staging runtime, response caching, raw HTML, real product URLs, canonical, sitemap, crawler access, mobile behavior and analytics in the actual configured environment. Obtain approval before production promotion. Record publication only at actual release.

Then establish Search Console indexing/query baselines and guide landing-page reports; monitor product clicks, cart rate, checkout rate, orders, AOV and attributable gross profit where supported. Track AI citations as observable evidence with source/date, without claiming complete coverage. Expand to the second and third guides only after their data and review gates pass.

Review facts when catalogue/specifications change; review editorial content at a practical 30–90 day interval. Stock or price refreshes do not manufacture a new article modification date. Archive inaccurate guides rather than leaving unsupported purchase recommendations live.

## Implementation evidence and remaining release work

- Three research records use nine exact catalogue IDs: biscuits, selected full-cream milk powder and selected Igloo ice cream. None is approved or published. Pack quantities currently cite catalogue declarations; packaging verification and useful category-specific editorial research are still required.
- Approval includes a SHA-256 digest of the exact editorial content, evidence, author, dates and revision. Node rendering and Edge middleware share canonical content encoding. Content edits invalidate approval. Original publication dates survive subsequently approved revisions.
- HTTP smoke testing caught streamed `200` responses for unpublished/missing slugs. An early middleware gate now returns actual `404` responses with `X-Robots-Tag: noindex`, including AI user agents. Guide detail rendering also checks publication eligibility.
- Production standalone build, focused lint and TypeScript passed. The full storefront suite passed after adding server-only mocking to its shared test setup. Synthetic approved-guide fixtures validate initial HTML, schema, offers, unavailable products and safe escaping; they are not publication records.
- A clearly labelled synthetic HTML render was inspected at 390px and 1440px. It had one H1, no page-level overflow, and independently scrollable semantic comparison tables. This verifies article layout, not a live published guide or production checkout.
- Local standalone HTTP checks: guide index `200` with `noindex`, all three review guides and an unknown slug `404`, editorial policy `200`, sitemap `200` with no unpublished guide entries.
- Existing cart, checkout and purchase events retain their dispatch/deduplication behavior; optional guide slug/revision context is consent-gated and expires after 30 minutes. No order/cost data is exposed.
- Before publication: confirm accountable author/profile and approver; verify packaging/claims; replace review-only copy with approved category-specific recommendations; record real approval/dates and content digest; validate the actual published guide on Hostinger staging. Gross-profit reporting, Search Console baseline and live analytics configuration remain separate verified follow-ups.

No production database, hosting, DNS, marketing budget or publication state was changed.
