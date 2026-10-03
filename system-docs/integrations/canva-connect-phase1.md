# Canva Connect Phase 1 delivery — 2026-10-03

Phase 1 is implemented locally. The foundation and Canva SQL proof ran successfully
against disposable project `grxxenvdhfwzafzyykgo` in a transaction that rolled back.
Production was not touched. No Canva asset, autofill, editor, export, normalization,
review or publication pipeline was implemented.

## Files and migrations

| File | Change |
| --- | --- |
| `supabase/migrations/20261003020000_harden_product_image_cas.sql` | Foundation repair: store membership, monotonic versions, checksum preservation, safe legacy key handling |
| `supabase/migrations/20261003030000_canva_connect_phase1.sql` | Five tables, RLS/ACLs, scope validation, transactional state/credential transitions |
| `supabase/functions/canva-connect/core.ts` | PKCE, standard encryption, provider protocol, lifecycle, authenticated HTTP routes |
| `supabase/functions/canva-connect/index.ts` | Supabase adapter, session verification, server configuration |
| `supabase/functions/canva-connect/core.test.ts` | 38 focused protocol/security tests |
| `supabase/functions/canva-connect/deno.json` | Function-local pinned Supabase import |
| `supabase/functions/canva-connect/deno.lock` | Dependency integrity lock |
| `supabase/tests/product_image_metadata_test.sql` | Expanded guarded foundation proof |
| `supabase/tests/canva_connect_phase1_test.sql` | Guarded real-role RLS, credentials, state, allowlist and rotation proof |
| `scripts/testing/run_canva_phase1_sql.py` | Explicit disposable URL guard; migration/backfill fixtures; rollback-only runner |
| `apps/admin_web/src/features/canva/CanvaConnectionPage.tsx` | Connection state, connect/reconnect/disconnect and authenticated OAuth callback relay |
| `apps/admin_web/src/features/canva/CanvaConnectionPage.test.tsx` | Four UI tests |
| `apps/admin_web/src/app/App.tsx` | Two scoped admin routes |
| `system-docs/integrations/canva-connect-phase1.md` | This delivery and configuration report |

The existing metadata migration was not rewritten. Apply the original
`20261003010000_add_product_image_metadata.sql`, then the two new migrations in
order when a separately authorized deployment is scheduled. Do not use a bulk
root-linked migration command: the root configuration points to production and
the checkout includes an unrelated untracked Canva social migration.

The excluded `SocialPostPage.tsx`, root package files, `integrations/`,
`canva-social/` and the untracked social identity migration were not edited or staged.

## Foundation findings and resulting behavior

Inspection found a stale test assertion (version 1 after advancing to 2), a
publication checksum overwritten by the metadata trigger, missing store membership
in CAS, insert-time arbitrary versions, and stale/ambiguous legacy object keys.
The repair retains existing URLs. Unknown, external, encoded or ambiguous paths
get a null key, rather than invented provenance. Existing checksums are not fabricated.

Items are tenant catalog records; store availability is represented by
`stock_levels`, not `items.store_id`. CAS now requires the matching store/item
association. Products without that association cannot be published through CAS;
zero-quantity associated products remain eligible. This is an intentional
authorization requirement, not a stock-quantity condition.

The existing security-definer publisher, owned by `postgres`, is the trusted
version/checksum transition. Direct browser/service-role metadata edits cannot
set an arbitrary version or checksum. Insert versions initialize to 0 without an
image or 1 with an image. Matching CAS increments once, including same-URL CAS;
stale key/version and replay do not mutate. Price, stock, name and description
changes do not invalidate image CAS.

## Database authorization model

- `canva_connections`: metadata only; tenant/store/user ownership and constrained
  connection status. Browser SELECT requires the owning authorized staff user.
- `canva_connection_credentials`: encrypted provider tokens and refresh claims;
  RLS enabled, no browser policy and no browser privileges for any CRUD action.
- `canva_oauth_states`: hashed state, encrypted PKCE verifier, generation and
  five-minute expiry. Server-only. Consumption destroys the stored verifier and
  retains a consumed marker until completion/reconnect/disconnect.
- `canva_approved_templates`: explicit allowlist, dimensions/page count/dataset
  schema and approval metadata. Authorized staff in the same tenant/store may
  read it; all writes remain server-only.
- `canva_product_designs`: session/provenance schema only. Composite foreign keys
  bind connections and approved templates to tenant/store/user. A trigger checks
  item membership, an enabled approved template and matching ready Canva identity.
  Browser writes are denied; owning authorized staff may read sessions.

Roles are limited to `owner`, `manager` and `admin`. Server code resolves the
RetailOS user from `auth.getUser` and `users.auth_id`; it never accepts authoritative
tenant/store/user/template IDs from browser parameters. The server-only transition
RPC independently rechecks the staff role and tenant/store assignment.

The design status constraint reserves `created`, `asset_uploading`,
`asset_uploaded`, `autofilling`, `design_ready`, `editing`, `returned`, `exporting`,
`normalizing`, `pending_review`, `published`, `rejected`, `failed`, `cancelled`.
Phase 1 exposes no design creation or downstream transition endpoint. Future
phases must review their transition rules against these reserved statuses.

## OAuth and credentials

Edge Function routes, all requiring the authenticated RetailOS bearer session:

| Method/path within `canva-connect` | Behavior |
| --- | --- |
| `GET /oauth/start` | Fresh state and PKCE; returns only the Canva authorization URL |
| `GET /oauth/callback` | Atomically consumes bound state before accepting success/failure; exchanges code server-side |
| `GET /oauth` | Sanitized connection metadata |
| `DELETE /oauth` | Commits local invalidation first, then attempts provider revocation |

The admin route `/canva-connect` manages the connection. Register
`/canva-connect/callback` on the admin origin as the Canva redirect. That page
removes protocol parameters from browser history and relays only state/code/error
with the current RetailOS session. Canva redirects cannot directly supply an
authenticated RetailOS Authorization header to an Edge Function, which is why
this small relay is required. It is unrelated to future editor return navigation.

State is 32 cryptographically random bytes; verifier is 64 random bytes encoded
as base64url; challenge is SHA-256/base64url with `S256`. SQL enforces one-time
consumption and binds the state to the initiating tenant/store/user and connection
generation. OAuth state is separate from the reserved future editor correlation
field. No editor correlation primitive is generated in Phase 1.

There was no suitable existing provider-token encryption utility. The compatible
choice is the runtime's standard Web Crypto AES-256-GCM, with a fresh 96-bit IV,
nonextractable imported key, and associated data binding the ciphertext to its
connection and access/refresh purpose (or OAuth state hash). No custom cipher is
implemented. A dedicated versioned 32-byte key ring lives in Edge Function secrets,
separate from OAuth client credentials and Supabase keys. The database stores only
ciphertext, version and expiry. Keep old key versions until credentials have been
rotated or invalidated; deleting a required key fails closed and requires reconnect.
Database backups alone cannot decrypt the stored tokens. Runtime/key compromise
remains outside that protection boundary.

`CanvaService.getValidCanvaAccessToken(actor, connectionId)` is server-only and
scoped to the authenticated actor. Tokens have a 90-second validity margin.
PostgreSQL locks the connection row before credentials and atomically claims a
refresh UUID. Concurrent callers wait at most four 250 ms intervals, then return
`CANVA_REFRESH_BUSY`. Only the claimed generation/UUID can replace both tokens and
expiry together. Disconnect/reconnect advances the generation and removes local
credentials, fencing late refresh/callback completion. Reconnect also attempts
revocation of the old lineage before returning the new authorization URL.

A 60-second abandoned claim cannot be taken over: it invalidates credentials and
requires reauthorization. An ambiguous network/provider failure is not retried
with the same one-use refresh token. Invalid refreshes, corrupt ciphertext and
unknown scope/capability state fail closed. This deliberately favors safe lineage
over availability after uncertain provider outcomes. Newly minted tokens that
cannot be saved are revoked on a best-effort basis.

Provider credentials, PKCE verifiers, authorization headers and provider responses
are never logged or returned from HTTP routes. Responses have `Cache-Control:
no-store` and a fixed admin CORS origin. The frontend contains no Canva credentials
and does not persist any provider token in browser storage.

## Scopes, identity APIs and states

Scopes requested for the frozen workflow (future operations remain unimplemented):

| Scope | Purpose |
| --- | --- |
| `profile:read` | Capability detection |
| `asset:write` | Future source-image upload |
| `design:content:read` | Future design content/export |
| `design:content:write` | Future autofill/design creation |
| `design:meta:read` | Future design metadata |
| `brandtemplate:meta:read` | Future approved-template metadata validation |
| `brandtemplate:content:read` | Future approved-template content/dataset use |

The implementation uses `POST /rest/v1/oauth/token`, `POST /rest/v1/oauth/revoke`,
`GET /rest/v1/users/me` (`team_user.user_id`, `team_user.team_id`) and
`GET /rest/v1/users/me/capabilities` (explicit string array). When the optional
token-response scope is omitted, `POST /rest/v1/oauth/introspect` verifies active
status, client where supplied, and granted scopes. Missing/unverifiable required
scopes deny the connection; requested scopes are not assumed to have been granted.

Both `autofill` and `brand_template` produce `connected_ready`; missing autofill
takes precedence when both are missing; otherwise missing brand templates produces
`connected_missing_brand_template`. Provider capability failure leaves
`reauthorization_required`, with no stored credentials. Disconnect produces
`revoked` even if remote revocation fails. Only a ready, scoped connection with
usable credentials can return an access token to trusted server code.

References checked against current official documentation and the starter kit:
[authentication](https://www.canva.dev/docs/apps/rest-apis/authentication/),
[token generation](https://www.canva.dev/docs/apps/rest-apis/reference/authentication/generate-access-token/),
[introspection](https://www.canva.dev/docs/apps/rest-apis/reference/authentication/introspect-access-token/),
[identity](https://www.canva.dev/docs/apps/rest-apis/reference/users/users-me/),
[capabilities](https://www.canva.dev/docs/apps/rest-apis/reference/users/get-user-capabilities/),
[revocation](https://www.canva.dev/docs/apps/rest-apis/reference/authentication/revoke-token/),
[official starter kit](https://github.com/canva-sdks/canva-connect-api-starter-kit).
Its protocol was used as a reference; its demo persistence/server architecture was not imported.

## Exact validation results

All shell commands were invoked through RTK; long output was processed locally.

| Command/check | Result |
| --- | --- |
| `rtk proxy python3 scripts/testing/run_canva_phase1_sql.py` | Exit 0: migration/backfill, image CAS and Canva SQL PASS notices; ROLLBACK |
| Disposable post-rollback read-only schema query | Exit 0: image metadata column absent and Canva table absent (`f\|f`) |
| `DENO_DIR=/tmp/luckystore-canva-deno deno test --config supabase/functions/canva-connect/deno.json supabase/functions/canva-connect/core.test.ts` | Exit 0: **38 passed, 0 failed** |
| `node --test cloudflare/workers/images/tests/security.test.mjs` | Exit 0: **5 passed, 0 failed** |
| `npx vitest run src/lib/images.test.ts src/features/canva/CanvaConnectionPage.test.tsx` from `apps/admin_web` | Exit 0: **6 passed, 0 failed**, two files (2 existing image + 4 new UI tests) |
| `npx tsc -p tsconfig.app.json --noEmit` from `apps/admin_web` | Exit 0 |
| Deno check of `canva-connect/index.ts` with its local config/cache | Exit 0 |
| Deno lint of `canva-connect` with its local config/cache | Exit 0 |
| Scoped admin ESLint on both new UI files and `App.tsx` | Exit 0; no warnings |
| Full `npx eslint .` from `apps/admin_web` | Exit 0: **0 errors, 3 existing warnings** |
| `rtk npm run build` from `apps/admin_web` | Exit 0: TypeScript, Vite production build and service-worker build succeeded |
| `rtk git diff --check` | Exit 0; new task files additionally checked for trailing whitespace |

Existing lint warnings are in `InventoryCardFeed.tsx:94` and
`InventoryListTable.tsx:181` (TanStack Virtual/compiler compatibility), and
`usePurchaseDraft.ts:51` (effect dependency). These unrelated files were not edited.

The SQL proof covers pre-migration known/external/null/ambiguous URLs, source CAS
key/version, replay, unrelated edits, cross tenant/store, arbitrary versions,
checksum preservation, authenticated credential SELECT/INSERT/UPDATE/DELETE denial,
real authorized/foreign tenant/same-tenant-other-store/same-store-other-user/stock
role RLS, allowlist rejection, refresh claim/rotation, abandoned claims, unknown capabilities and generation fencing.
The 38 server tests additionally cover PKCE/provider failures, wrong callbacks,
capability states, concurrent mocked refresh, bounded contention, invalid lineage,
disconnect during callback/refresh, revocation failure, encrypted-row/purpose
binding, secret-free output/logging, optional scopes and reconnect.

Earlier failed checks were corrected or safely rerouted, then rerun:

- `rtk proxy which ctx`: exit 1; context-mode tools absent. User authorized the RTK/local-processing fallback.
- Initial discovery attempted to read nonexistent `cloudflare/workers/images/package.json`: `FileNotFoundError`; tests are standalone Node tests.
- Initial environment probes reported `No DATABASE_URL` / `BLOCKED: SUPABASE_DB_URL is unavailable`; the authorized URL is available as `TEST_DATABASE_URL`.
- `rtk read ... --start-line ... --end-line ...`: exit 1, `/usr/bin/read: ... not a valid identifier`; subsequent reads used scoped local processing.
- Initial Deno check: cache write `Operation not permitted (os error 1)`; the cache was moved to `/tmp`. Two typed-array type errors were then fixed.
- Initial Deno lint: 9 issues (`no-import-prefix`, `require-await`); function-local imports and async-mock annotations resolved them. Production code has no lint exclusions.
- Initial SQL proof rejected `DISPOSABLE_PROJECT_REQUIRED`: pooler did not retain the startup application name. The runner now explicitly sets the transaction-local marker only after validating the exact disposable host/username.
- Subsequent SQL fixture errors were `price_audit_log.store_id` NOT NULL, `users.id` NOT NULL, `users_auth_id_mirrors_id`, and `users.auth_id` NOT NULL. Fixtures now create proper auth users with mirrored IDs and the staff session context; no audit/security control was changed.
- An added SQL assertion initially reported `[FAIL] abandoned refresh lineage was reused`: it combined the mutating RPC and a credential-existence subquery in one expression. Separating the RPC from the post-mutation assertion corrected the snapshot/evaluation-order issue; the abandoned-claim and unknown-capability proofs then passed.

## Required portal and environment configuration

The supplied app reference is `AAHOGP8N-Fw`. Open that app's Outside Canva
configuration and confirm the actual OAuth client ID. Do not infer the OAuth
client ID from a demo or from a historical ID prefix.

Configure the scopes above and the exact redirect URL
`https://admin.luckystore1947.com/canva-connect/callback` (or the exact approved
test admin origin). The redirect origin must match `ADMIN_APP_ORIGIN`; the path
is validated as `/canva-connect/callback`.

Set these **server-only Edge Function secrets**, using the portal/secret manager:

- `CANVA_CONNECT_CLIENT_ID`
- `CANVA_CONNECT_CLIENT_SECRET`
- `CANVA_OAUTH_REDIRECT_URI`
- `ADMIN_APP_ORIGIN` (exact origin, no trailing slash)
- `CANVA_TOKEN_KEYS` (JSON version-to-base64-key map; each key is 32 cryptographically random bytes)
- `CANVA_TOKEN_KEY_VERSION` (active key version present in that map)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` use the existing Edge Function
runtime convention. No Canva secret belongs in a `VITE_*` variable. No cookie
signing key is introduced. Keep gateway authentication enabled; the function
also independently verifies the RetailOS session server-side.

## Limits, remaining risks and commits

Live Canva authorization, real account capability detection and live provider
refresh/revocation were **not executed**. Portal configuration and function
deployment remain prerequisites. HTTP provider calls are tested with injected
responses. Concurrent provider-refresh behavior is covered by parallel unit
callers and PostgreSQL claim/rotation checks; a multi-process live provider
concurrency test was not run.

No browser E2E against a deployed function was run. Frontend behavior is covered
by component tests and the production build. Storefront/mobile builds were not
run because those apps are unchanged. No deploy, push or PR was created.

Both migrations were exercised only within the disposable rollback transaction;
neither was permanently applied there or in production. Post-rollback inspection
confirmed no task schema remained. Production migration and real-provider
acceptance are still required before enabling this feature for staff.

The trusted image publisher's `postgres` ownership is part of its boundary and
must be preserved when deploying the repair. Future pipeline phases must resolve
templates from the approved registry, recheck authorization/capabilities and
review terminal session transitions. Phase 1 has no Canva code path that writes
`items.image_*`.

The reviewed implementation is recorded in the checkpoint commit
`feat(canva): add secure Connect OAuth and Phase 1 foundation`.
Its parent is `34fc07332181b43c02dabf483fe3610cc847f501`. No production migration
or deployment is included in this checkpoint. Foundation commits inspected:

- `a71f949d475df95e89366262682111c7183c50a5`
- `73a5c87fdfdbddfa51d75ee2f41c8ff573a75cba`
- `34fc07332181b43c02dabf483fe3610cc847f501`
