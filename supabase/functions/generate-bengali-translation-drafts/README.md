# Bengali AI draft generator

Set `OPENAI_API_KEY (preferred, using gpt-4o-mini), or OPENROUTER_API_KEY (fallback)` as a Supabase Edge Function secret in the **Testing** project `grxxenvdhfwzafzyykgo` separately. Never copy it into the browser, repository, logs, or a production project. Production setup or invocation requires separate approval.

Deploy this function only to the Testing project when authorized. `verify_jwt = true` is configured in `supabase/config.toml`. An authenticated tenant admin or manager can generate up to ten draft product or category translations per click. The function uses the caller's JWT for all database access. Existing translations are skipped, including existing drafts and published rows. AI output is checked before insertion. Provider failure produces an error and no fabricated drafts. The review and publication steps remain manual and require evidence.

Local checks: `deno test supabase/functions/generate-bengali-translation-drafts/validation_test.ts`; `cd apps/admin_web && npm test -- src/features/translations/TranslationsPage.test.tsx`.
