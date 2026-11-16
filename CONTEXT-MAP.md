# Context map

Project-level handoff and completed-task history live in `~/Desktop/Projects/Project-Memory/projects/luckystore/context.md` and `journal/YYYY-MM.md`, respectively. This repository's root `context.md` is a compatibility pointer, not an active task journal. Read repository `AGENTS.md`, then the domain `CONTEXT.md` relevant to the task.

For cloud/CI agents without local Project-Memory access, use `AGENTS.md` and the domain documents below, verify live source/provider facts, and report that the memory update was not possible. Never invent a successful write or create a competing journal in this repository.

| Context | Documentation | Responsibility |
|---|---|---|
| Customer storefront | `apps/customer_storefront/CONTEXT.md` | Customer catalog, cart, checkout, and storefront delivery |
| Admin web | `apps/admin_web/CONTEXT.md` | Store administration, inventory, orders, and reporting UI |
| Mobile POS | `apps/mobile_app/CONTEXT.md` | Staff POS, local persistence, hardware, and offline synchronization |
| Scraper | `apps/scraper/CONTEXT.md` | Competitor catalog collection and price mapping |
| Supabase backend | `supabase/CONTEXT.md` | Postgres schema, RLS, auth, storage, RPCs, and Edge Functions |
| Cloudflare workers | `cloudflare/workers/CONTEXT.md` | Agent, image, and webhook worker boundaries |
| Notion migration archive | `docs/notion-migration/2026-07-25/README.md` | Historical Notion exports, migration sources, and tooling; not runtime documentation |
