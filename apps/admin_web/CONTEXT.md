# Admin web context

## Responsibility

Owns the web interface for store administration, inventory, orders, and
reporting.

## Sources and boundaries

- Source: `apps/admin_web/`
- Runtime: React and Vite
- Uses backend data contracts owned by the Supabase context.
- Does not own mobile point-of-sale state or offline synchronization.

## Terms and invariants

- OCR and AI-derived receipt fields and reconciliation results are advisory evidence only; they must not authorize purchase posting or inventory mutations. The owning application must apply deterministic validation before any financial or inventory change.

## Decisions

Context decisions belong in `apps/admin_web/docs/adr/`, created when the first
decision is recorded. System-wide decisions belong in `docs/adr/`.
