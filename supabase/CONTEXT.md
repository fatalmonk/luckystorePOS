# Supabase backend context

## Responsibility

Owns the Postgres schema, row-level security, authentication integration,
storage, RPCs, and Supabase Edge Functions.

## Sources and boundaries

- Sources: `supabase/migrations/`, `supabase/functions/`, and Supabase
  configuration and tests.
- Publishes data and authorization contracts consumed by application contexts.
- Database, RLS, auth, and RPC changes require explicit review and applicable
  approval gates.

## Terms and invariants

No context-specific terms or invariants are recorded yet.

## Decisions

Context decisions belong in `supabase/docs/adr/`, created when the first
decision is recorded. System-wide decisions belong in `docs/adr/`.
