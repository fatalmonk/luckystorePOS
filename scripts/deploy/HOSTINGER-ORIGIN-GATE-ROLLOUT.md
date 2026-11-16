# Hostinger Origin Gate — Deployment and Rollback

Status: CODE PREPARED; LIVE ENFORCEMENT DISABLED. Do not claim that the origin is locked until staging and production tests pass.

## Threat and limitations

Cloudflare-proxied DNS does not stop a direct-origin request to a known Hostinger IP. The Hostinger A-record origin responded to direct HTTPS on November 17, 2026.

Next.js middleware.ts explicitly excludes /api/*, /_next/static, /_next/image, images and others. This gate is installed before Next.js in the actual packaged Hostinger Node.js server.js entrypoint. It intercepts Node HTTP request events, including all Node-served API routes and pages.

IMPORTANT: This is a compensating app-level control. It does NOT secure Hostinger webserver-served static files, other vhosts, management interfaces, SSH, DNS-only blog or admin, or traffic that does not enter the Node process. It does not replace endpoint authentication, RLS, WAF, or host-layer firewall.

## Configuration

- Hostinger runtime setting LUCKY_ORIGIN_GATE_ENABLED=1 turns enforcement on. Missing/other value means OFF.
- Hostinger runtime setting LUCKY_ORIGIN_GATE_SECRET must be a 43–512 character base64url high-entropy secret. Use at least 32 random bytes, separate for production and staging.
- Cloudflare Request Header Transform Rule, matching exact host, sets and OVERWRITES request header x-lucky-origin-auth to the matching secret. It is sent from Cloudflare to Hostinger, never returned to the client.
- Unauthenticated direct-origin Node HTTP traffic receives HTTP 403 with no-store.
- Enabled without valid secret fails startup closed, not open.
- Never use NEXT_PUBLIC_ for this secret. Never put a secret in git, logs, workflow output, published notes, or email.

## Staging first — required rollout

1. Back up existing Cloudflare transform rules and document Hostinger variable keys and rollback route. Confirm hPanel login access and a known-good build.
2. Deploy this code to staging with enforcement OFF via the normal staging-only release pipeline. Confirm baseline home, health, product search, mobile catalog, image and checkout navigation.
3. In Cloudflare Request Header Transform Rules create one rule matching only next.luckystore1947.com, action SET x-lucky-origin-auth to a unique staging secret. Ensure the rule OVERWRITES any incoming client-provided header. Do not disable existing WAF checks.
4. Configure Hostinger staging runtime variable LUCKY_ORIGIN_GATE_SECRET with that same value. Verify it is present without ever displaying it.
5. Set LUCKY_ORIGIN_GATE_ENABLED=1 on staging LAST and restart staging.
6. Via Cloudflare staging host, check homepage, /api/health, /api/products?limit=1, /api/mobile/v1/catalog, product images, static files and checkout navigation; run smoke suite.
7. Independently test direct-origin HTTPS to the A-record IP (preserving the Host/SNI with curl --resolve). Expect 403 for Node routes, while the normal Cloudflare path remains 200. Test Node API and both static and public image paths to identify Hostinger-webserver bypasses. Do NOT perform checkout mutations.
8. Test a client-sent arbitrary x-lucky-origin-auth to Cloudflare; it must be overwritten, not passed through. Investigate origin and managed health checks that may bypass the public hostname.

ROLLBACK: turn LUCKY_ORIGIN_GATE_ENABLED=0 in Hostinger staging first and restart, confirm app recovers, then optionally disable the Cloudflare staging header rule. Removing the secret before disabling the gate can cause a failed startup.

## Production promotion

Only after staging endpoint and direct-origin verification passes:

1. Promote the EXACT tested immutable release through the normal GitHub/Hostinger workflow. Never merge an unreviewed build directly to production.
2. Generate a DIFFERENT production secret. Install Cloudflare overwrite header rule on actual production hostnames luckystore1947.com and www.luckystore1947.com only. Exclude ops and admin.
3. Configure Hostinger production runtime secret; set ENABLED=1 last and restart.
4. Verify production homepage, health, cart/checkout navigation, product search, mobile catalog, canonical redirects, WebMCP browser shopping and CI smoke; then test direct origin.
5. Monitor user-facing failures, 403 volume, and origin request patterns; roll back by disabling the Hostinger gate first.

## Known risks

- Hostinger may serve static files directly via Apache/LiteSpeed, outside Node. These resources may remain reachable directly. Avoid describing this as full origin firewall protection.
- Shared-secret auth only controls the hop to Node. An adversary who learns the shared secret can connect directly. Restrict administrator access and rotate secrets.
- Hostinger internal health checks may fail if they do not pass through Cloudflare. Confirm platform behavior on staging before production.
- Account-level blocking or client-certificate validation would provide stronger protection, but only if Hostinger supports it.
- Cloudflare Free request-header transform rules are supported; check the zone's applicable rule quota and syntax before writing.
