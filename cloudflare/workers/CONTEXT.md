# Cloudflare workers context

## Responsibility

Owns the agent, image, and webhook worker boundaries.

## Sources and boundaries

- Source: `cloudflare/workers/`
- Runtime: Cloudflare Workers
- Integrates external requests and media delivery with application and backend
  contexts.
- Does not own Supabase schema, RLS, or application state.

## Terms and invariants

No context-specific terms or invariants are recorded yet.

## Decisions

Context decisions belong in `cloudflare/workers/docs/adr/`, created when the
first decision is recorded. System-wide decisions belong in `docs/adr/`.
