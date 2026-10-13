# Canva Design Editor acceptance

Date: 2026-10-13. App `AAHOGP8N-Fw`, Developer Portal version 2.

Only the disposable Supabase project `grxxenvdhfwzafzyykgo` was changed. `canva-social` version 4 is active. The handler verifies Canva's signed user token and scopes reads through the approved staff identity. Supabase's platform JWT gate is disabled because these are Canva tokens, not Supabase Auth tokens. Publishing is disabled by server configuration and remains unenrolled in the portal. No production schema, secrets or deployment changed.

Existing identity table and catalog RPC were reused; no migration was applied. The human explicitly approved mapping the currently signed-in Canva identity to the single manager in the isolated `Canva OAuth acceptance test` tenant/store. No production staff mapping was created. A temporary response containing only the caller's verified app-scoped identity IDs was used to identify that account, then removed before final deployment.

## Live evidence

- Missing and invalid bearer tokens: 401. CORS preflight: 200 with the exact Canva app origin.
- Valid but unmapped Canva caller: 403; product insertion remained disabled.
- After the authorized mapping: five isolated products loaded; searching `135g` returned only the Bellame product.
- Name/price insertion displayed `Bellame Chocolate Digestive Biscuits 135g` and `BDT 50.00` in the test design.
- Initial image upload failed because the thumbnail was a WebP without Canva-compatible CORS. Canva requires PNG/JPEG/SVG thumbnails with CORS, or data URLs: https://www.canva.dev/docs/apps/api/latest/asset-upload/.
- Fixed by an authenticated image endpoint keyed by catalog item ID, restricted to active items in the linked store and HTTPS product images on `images.luckystore1947.com`, with redirects denied and a 4.5 MB streamed size limit. The browser generates a PNG thumbnail from returned image bytes.
- Final live image upload succeeded. Canva displayed the actual product image and the product name/price in test design `DAHX6NJZ8yg`.
- Developer-docs button is absent from the uploaded bundle. Bundle includes the disposable backend URL; the first missing-backend preview failure is resolved.

## Local validation and limits

Admin-facing Canva app lint, TypeScript, formatting, two UI tests, backend TypeScript and three image-source/size/redirect tests passed. Build passed (1.34 MB app bundle; two extracted translation messages). Missing backend configuration now fails the npm prebuild guard.

Identity table has RLS enabled and no anon/authenticated read grants. Catalog RPC execution is restricted to service_role. Advisors report the identity table has no RLS policies, consistent with its deliberate service-only design. This is not a claim that every project advisory is resolved.

Runtime dependency audit: zero advisories. Development dependencies retain 50 advisories (37 high, 13 moderate); both previously critical advisories were patched. Developer-tool risk remains to be assessed before release.

Testing-instructions fields, video link and login fields are populated. Credentials were not printed or copied. Their actual login validity, video's content/accessibility and whether the reviewer Canva account matches the authorized test mapping remain unverified. Only the current signed-in account has passed live acceptance. Portal submission was not performed.

## PR #453 review follow-up

Confirmed and corrected six findings: verifier/configuration outages were masked as 401; the denied-catalog UI test asserted only an inert click; README preview setup enabled a future publisher intent; the build guard allowed paths/empty query or fragment delimiters; the Node engine range admitted versions before the env-file flag existed; and compressed image limits did not cap decoded pixel allocation.

Verifier failures now distinguish invalid tokens (401), absent app configuration (500), and transient/unexpected JWKS failures (503), with safe response messages. Backend image headers are checked before returning data URLs, capped at 4096 pixels per axis and four million total pixels; unsupported, mismatched or animated PNG/WebP containers are denied. Original supported image bytes still form the Canva asset, while the browser creates its PNG thumbnail. There is no central server feature-flag layer or duplicate publisher flag in this repository; the existing server-only publisher switch remains fail-closed.

The build and runtime URL guards require a root HTTPS URL and reject credentials and query/fragment delimiters. Node 22 support now begins at 22.9.0. Validation passed: 11 build-guard cases, two UI tests, ten backend tests, lint, TypeScript, formatting, build, diff checks and secret scanning. Three real catalog WebP images passed dimension parsing (480x234, 385x480, 225x225). This follow-up is a source/PR change; it has not yet been deployed to the disposable backend or uploaded to Canva, so the live evidence above continues to describe version 4.
