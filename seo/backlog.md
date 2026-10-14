# SEO opportunity backlog

Only evidence-backed tasks may advance to implementation. Ranking is by likely eligible completed orders per engineering hour, not traffic volume alone.

| Priority | Query / intent | Page | Proposed change | Evidence | Verification | Status |
|---|---|---|---|---|---|---|
| Implemented | Lucky Store 1947 / brand | / | Add reciprocal English/Bengali homepage hreflang metadata after code verification | 2026-10-14 repository inspection: English homepage inherited only root canonical; Bengali homepage declared reciprocal alternates | Run storefront typecheck/tests/build and inspect both rendered homepages; production HTML remains unverified in this run | review required |
| Investigate | grocery delivery Chawkbazar / transactional | /delivery | Reconcile visible FAQ and JSON-LD output against live policy; do not duplicate FAQ schema | 2026-10-14 technical report did not list FAQPage on sampled delivery HTML; repo baseline asserts implementation | Inspect production HTML and route code, validate only visible claims | needs verification |
| Future | online grocery delivery Chattogram / transactional | / | Improve buyer-facing delivery eligibility clarity only where verified | `seo/state.md` existing hypothesis | Confirm actual customer question and production policy | backlog |
