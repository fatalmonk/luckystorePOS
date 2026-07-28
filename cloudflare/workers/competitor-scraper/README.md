# Competitor scraper Worker

Disabled-by-default Cloudflare Workflow for collecting Chaldal and Shwapno
catalog observations, conservatively matching them to each explicitly
allowlisted store, and ingesting batches through
`ingest_competitor_scrape_batch`.

There is no `fetch` handler, route, or `workers.dev` endpoint. The weekly
`0 21 * * SUN` schedule is attached directly to the Workflow binding. Both the
global automation gate and each source approval gate must be enabled before a
browser can launch.

## Configuration

- `AUTOMATION_ENABLED`: must be exactly `true`; committed as `false`.
- `STORE_ALLOWLIST`: JSON array of store UUIDs; committed empty.
- `SUPABASE_URL`: Supabase project URL; committed to a non-routable example.
- `SUPABASE_SERVICE_ROLE_KEY`: Wrangler secret, never a plain variable.
- `CHALDAL_SOURCE_APPROVED` / `SHWAPNO_SOURCE_APPROVED`: legal/robots approval
  gates; both committed as `false`.
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
