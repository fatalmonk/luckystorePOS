# Bengali AI draft generator

Set only `OPENROUTER_API_KEY` as a Supabase Edge Function secret in the **Testing** project `grxxenvdhfwzafzyykgo` separately. Never copy it into the browser, repository, logs, or a production project. Production setup or invocation requires separate approval.

Deploy this function only to the Testing project when authorized. `verify_jwt = true` is configured in `supabase/config.toml`. An authenticated tenant admin or manager can generate up to ten draft product or category translations per click. The function uses the caller's JWT for all database access. Existing reviewed/published translations are never regenerated. Existing drafts with null descriptions can be completed without changing their names or prior review state. AI output is checked before insertion. If the pinned provider fails, only two exact, manufacturer-source-backed Samyang template descriptions can be drafted as a fail-closed fallback; other items fail with no fabricated claims. The review and publication steps remain manual and require evidence.

Local checks: `deno test supabase/functions/generate-bengali-translation-drafts/validation_test.ts`; `cd apps/admin_web && npm test -- src/features/translations/TranslationsPage.test.tsx`.

Pinned model: `nvidia/nemotron-3-ultra-550b-a55b:free`, direct hosted OpenRouter HTTPS endpoint, provider fallback disabled. OpenAI secrets are ignored. Provider deadline is 55 seconds; output budget is 6,000 tokens; all returned rows are validated and saved only as drafts. Protected variants Original, 2X and Best of must be preserved.
