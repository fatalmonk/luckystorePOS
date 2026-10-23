# SEO opportunity backlog

Only evidence-backed tasks may advance to implementation. Ranking is by likely eligible completed orders per engineering hour, not traffic volume alone.

| Priority | Query / intent | Page | Proposed change | Evidence | Verification | Status |
|---|---|---|---|---|---|---|
| Implemented | Lucky Store 1947 / brand | / | Reciprocal English/Bengali homepage hreflang metadata | 2026-10-23 source review: both English `/` and Bengali `/bn` route metadata declare matching `en-BD`, `bn-BD`, and `x-default` alternates with canonical URLs | Run storefront typecheck/tests/build and inspect both rendered homepages; production HTML remains unverified in this run | needs verification |
| Investigate | grocery delivery Chawkbazar / transactional | /delivery | Restore server-rendered delivery content and FAQ JSON-LD while keeping the shared visible FAQ and schema aligned | Vercel confirms production deployment `dpl_FJZYiYbyECn4TAgH3yufUUAqodz6` is READY on `main` at `c44ed1b`; initial HTML contains a loading shell and three client-render bailout templates; FAQPage exists only in escaped Next Flight data | Build and inspect initial HTML after the Header Suspense boundary change; confirm delivery H1, FAQ content, and FAQPage JSON-LD are server-rendered | source fix prepared; needs verification |
| Future | online grocery delivery Chattogram / transactional | / | Improve buyer-facing delivery eligibility clarity only where verified | `seo/state.md` existing hypothesis | Confirm actual customer question and production policy | backlog |

### 2026-10-23 delivery initial-HTML follow-up

The deployed `/delivery` HTML response contains a loading skeleton, no delivery H1, and three `BAILOUT_TO_CLIENT_SIDE_RENDERING` templates. Its parseable JSON-LD contains Store/GroceryStore/Organization only; FAQPage appears only in escaped Next Flight data. The route's `Header` and nested `LanguageSwitcher` call `useSearchParams` without a containing Suspense boundary. A height-reserving Suspense boundary has been added around the Header subtree to contain the client-render bailout. This is a source-level mitigation only; production build and initial-HTML verification remain pending.

### 2026-10-23 delivery FAQ check

Vercel identifies the current production deployment as commit `c44ed1b9982fd604a0874c9a7ff982c1f7dab21b`, matching this worktree's base revision. Fetching that immutable deployment's `/delivery` route returned HTTP 200 (`text/html; charset=utf-8`, 293,955 bytes). The response has one parseable `application/ld+json` block, which parses as `Store`, `GroceryStore`, and `Organization`. `FAQPage` appears only inside an escaped `self.__next_f` payload, not in a parseable JSON-LD script block. The same commit's English route renders `getDeliveryFaqSchema()` through `JsonLd`; shared FAQ content is also used by the visible accordion.

This confirms a discrepancy in the server-delivered HTML at the deployed commit, but does not establish whether hydration materializes FAQ JSON-LD in the browser DOM or how search crawlers process that payload. A local browser check could not run because `localhost:3000` refused the connection, and the worktree cannot start Next.js because its `next` executable is absent. Do not change FAQ copy/schema or deploy until hydrated DOM/crawler behavior is verified.
