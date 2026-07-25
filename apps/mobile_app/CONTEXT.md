# Mobile POS context

## Responsibility

Owns staff point-of-sale workflows, local persistence, device integrations, and
offline synchronization.

## Sources and boundaries

- Source: `apps/mobile_app/`
- Runtime: Flutter
- Uses backend data contracts owned by the Supabase context.
- Owns mobile-local persistence and synchronization behavior, not database
  authorization policy.

## Terms and invariants

No context-specific terms or invariants are recorded yet.

## Decisions

Context decisions belong in `apps/mobile_app/docs/adr/`, created when the first
decision is recorded. System-wide decisions belong in `docs/adr/`.
