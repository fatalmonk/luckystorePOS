# Competitor scraper Worker

Disabled-by-default Cloudflare Workflow for collecting Chaldal and Shwapno
catalog observations, conservatively matching them to each explicitly
allowlisted store, and ingesting batches through
`ingest_competitor_scrape_batch`.

There is no `fetch` handler, route, or `workers.dev` endpoint. No Cron Trigger
is configured (`triggers.crons` is empty), and the global automation gate is
committed as disabled. Both the global automation gate and source approval
gates must be enabled before a browser can launch. Restoring a schedule or
enabling automation requires a separate, reviewed production change.

## Configuration

- `AUTOMATION_ENABLED`: must be exactly `true`; committed as `false`.
- `STORE_ALLOWLIST`: JSON array of store UUIDs; an explicit allowlist is configured, but does not override the disabled automation gate.
- `SUPABASE_URL`: Supabase project URL; a production URL is configured.
- `SUPABASE_SERVICE_ROLE_KEY`: Wrangler secret, never a plain variable.
- `CHALDAL_SOURCE_APPROVED` / `SHWAPNO_SOURCE_APPROVED` and other source flags:
  legal/robots approval gates; some are currently configured as `true`, but
  they do not override the disabled automation gate.
- `WORKFLOW_VERSION`: included in deterministic run and observation keys.

Changing a source approval flag requires a recorded legal/robots review for
that adapter. Enabling automation, deploying, setting a real allowlist, or
adding the service-role secret are separate production approvals.

## Local validation

```sh
npm ci
npm run check
npm run dry-run
```

Tests use fixtures and fakes only. They do not contact competitor sites,
Cloudflare Browser Run, or Supabase.
