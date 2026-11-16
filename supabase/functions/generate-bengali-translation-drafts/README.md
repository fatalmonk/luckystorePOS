# Bengali AI draft generator

Set only `OPENROUTER_API_KEY` as a Supabase Edge Function secret in the **Testing** project `grxxenvdhfwzafzyykgo` separately. Never copy it into the browser, repository, logs, or a production project. Production setup or invocation requires separate approval.

Deploy this function only to a specifically authorized Testing or Production environment. Before the new admin UI relies on the manager-scoped evidence endpoint, deploy this updated function in the same environment. `verify_jwt = true` is configured in `supabase/config.toml`. An authenticated tenant admin or manager can generate up to three draft product or category translations per click (older clients requesting ten are capped to three on the server). The function uses the caller's JWT for all database access. Existing reviewed/published translations are never regenerated. Existing drafts with null descriptions can be completed without changing their names or prior review state. AI output is checked for format, canonical identity, protected variants and numeric/package claims before insertion. These mechanical checks do NOT independently verify every nonnumeric factual claim; human source review remains mandatory. When only registry facts exist and canonical English description is empty, a nonempty Bengali description is accepted only if it matches an exact-product vetted template. If the pinned provider fails, only two exact, manufacturer-source-backed Samyang template descriptions can be drafted as a fail-closed fallback; other items fail closed, rather than making unreviewed factual assertions. The review and publication steps remain manual and require evidence.

Local checks: `deno test supabase/functions/generate-bengali-translation-drafts/validation_test.ts`; `cd apps/admin_web && npm test -- src/features/translations/TranslationsPage.test.tsx`.

Pinned model: `nvidia/nemotron-3.5-super-vl:free`, a recently live-qualified free OpenRouter model with structured JSON Schema support and a successful live three-item JSON test. The prior Nemotron Ultra free endpoint did not advertise structured output and produced zero saved drafts despite successful HTTP requests. Direct hosted OpenRouter HTTPS endpoint, paid/provider fallback disabled. OpenAI secrets are ignored. Provider deadline is 55 seconds; output budget is 6,000 tokens; all returned rows are validated and saved only as drafts. Protected variants Original, 2X and Best of must be preserved.

Managers can request one tenant-scoped product evidence record from the same JWT-protected function using kind=evidence and itemId=UUID. This fetch is read-only and does not invoke the AI provider. Full registry data remains server-side, out of the browser bundle. Category review uses the same canonical snapshot shape with HTTPS source URLs entered and checked by the reviewer in the admin panel; no category is publishable until that snapshot is saved and the existing database evidence guard accepts it. The review UI requires preparing the evidence snapshot and separately saving, confirming and publishing it.

Provider diagnostics: the Edge Function logs a content-free summary (`providerOutcome`, candidate count, generated and failure counts). The admin UI displays short validation reasons. Structured JSON is enforced at the provider when supported and validated independently per product; invalid or missing rows never publish.

The admin button requests at most three products per click. This reduces provider response latency and lets a single malformed item fail independently without discarding the valid drafts. Repeated clicks generate additional drafts, which always require manual review and publication.

For evidence-only sources, only exact manufacturer-backed vetted templates can authorize model-generated descriptions. Invalid model claims return their specific validation error (rather than a misleading empty-description error). Provider outcomes distinguish truncated valid-looking content, malformed HTTP 200 JSON, and network failures. The provider output ceiling is 6,000 tokens for a maximum three-item batch; this is a cap, not a target.
\nName generation repair: require Bengali-script product words, not merely Bengali numerals. A single same-provider correction attempt is permitted ONLY for exact-ID rows rejected because their names contain no Bengali letters; it shares the original 55-second deadline and all identity/quantity/evidence validation. This does not repair other rejection types or permit automatic publishing. Log only the repair attempt/recovery counts, never model text.\n
### Free-model envelope and candidate progression (Nov 15, 2026)
An isolated replay of the pinned free model via Kilo/OmniRoute returned
a one-key 'rows' JSON envelope instead of 'translations'. Direct production
OpenRouter responses were not captured, so the live cause needs deployment
verification. The parser accepts ONLY
these two known wrappers; every item must still pass the unchanged strict
UUID, brand, numeric, package, description, alias, and evidence checks.
An isolated three-product live model replay produced 'rows' and all three
translations passed the strict validator with that one-key normalization.
This does not certify the live production provider or independently verify
semantic marketing claims; human review and exact-source evidence remain
mandatory.

The admin Generate AI Drafts button selects up to three NEW untranslated
canonical item IDs through the existing tenant-guarded itemIds parameter.
It advances its UUID cursor after each attempted batch, including completely
rejected responses, and wraps through the untranslated catalog on subsequent
clicks. It deliberately does not keep retrying empty pre-existing draft rows
or the first failing items. Reviewed/published products are never targeted;
the Edge Function independently rechecks tenant, roles and existing statuses.
Candidate progression is scoped to the current admin page session and
to products; category generation retains server-default selection.
