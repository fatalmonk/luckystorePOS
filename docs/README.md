# Lucky Store documentation

This directory is the home for cross-cutting, durable documentation shared across the Lucky Store monorepo. Application- and package-specific setup or domain guidance stays beside the code it governs.

## Current status

This is an inherited documentation corpus undergoing an incremental reorganization. The first phase is report-only: it inventories structural and local-link defects without blocking existing work. Files will be moved only in later, separately verified increments.

Run the baseline audit:

```bash
npm run docs:check -- --report-only
```

Run the audit's unit tests:

```bash
npm run docs:check:test
```

The baseline currently includes tracked Markdown plus visible untracked Markdown. Generated, vendored, cached, archived-copy, and worktree directories are excluded by the checker.

## Documentation map

### Start here

- [`../README.md`](../README.md) — repository introduction and setup
- [`../CONTEXT-MAP.md`](../CONTEXT-MAP.md) — domain-context routing
- [`../AGENTS.md`](../AGENTS.md) — repository rules for coding agents
- [`../CLAUDE.md`](../CLAUDE.md) — provider-specific agent guidance

### Existing collections

- [`adr/`](adr/) — architectural decision records (ADRs)
- [`audit/`](audit/) — cross-cutting database and infrastructure audits
- [`archive/`](archive/) — retired or superseded evidence retained for history
- [`SEO Optimization/`](SEO%20Optimization/) — historical SEO remediation and catalog-enrichment evidence
- [`AI_HANDOFF.md`](AI_HANDOFF.md) — durable-context and Notion synchronization policy pending consolidation
- [`dns-aid-setup.md`](dns-aid-setup.md) — DNS operations guidance pending placement under operations

### Documentation stored beside code

- `apps/*/README.md` — app setup and commands
- `apps/*/CONTEXT.md` — app boundaries and invariants
- `supabase/README.md` and `supabase/CONTEXT.md` — database-local guidance
- `cloudflare/workers/**/README.md` — worker-local operations
- `apps/customer_storefront/public/**/*.md` — deployed, runtime-facing agent resources

### Automation workspaces

- [`../seo/`](../seo/) — live SEO Autopilot state, policy, runbooks, templates, and dated reports
- `../.hermes/` — local agent plans and skills; not a product-documentation source

## Placement policy

- Keep the repository root limited to onboarding, agent policy, and context routing.
- Put cross-cutting architecture, operations, plans, product guidance, reports, and ADRs under `docs/`.
- Keep implementation-specific guidance beside the relevant app, package, worker, or database code.
- Keep runtime-facing public Markdown at its deployed path.
- Preserve historical evidence in an archive or report collection with status and supersession notes; do not silently delete it.
- Use `YYYY-MM-DD-topic.md` for dated plans and reports and `NNNN-kebab-case.md` for ADRs.

## Planned target structure

```text
docs/
├── README.md
├── architecture/
├── adr/
├── operations/
├── plans/
├── product/
├── reports/
└── archive/
```

The migration is intentionally incremental. Each move must use Git-aware renaming, update all consumers and links in the same increment, and pass the documentation audit before proceeding.
