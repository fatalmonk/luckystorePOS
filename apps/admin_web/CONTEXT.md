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

No context-specific terms or invariants are recorded yet.

## Decisions

Context decisions belong in `apps/admin_web/docs/adr/`, created when the first
decision is recorded. System-wide decisions belong in `docs/adr/`.
