# Domain documentation

Lucky Store uses a multi-context domain layout.

## Read order

1. Read root `CONTEXT.md` for the system overview and current handoff.
2. Read `CONTEXT-MAP.md` to select the affected context.
3. Read that context's `CONTEXT.md`.
4. Read system ADRs in `docs/adr/` and context ADRs in the context's
   `docs/adr/`, when present.

Missing ADR directories are normal and are created only when the first decision
is recorded.

## Rules

- Use terminology already defined in the relevant context.
- Do not introduce a cross-context model or change data ownership silently.
- Record system-wide decisions in `docs/adr/`; record context-only decisions in
  the context's `docs/adr/`.
- When sources conflict, flag the conflict and obtain a decision; do not silently
  choose one.
- Treat schema, RLS, auth, payment, inventory, sale, and synchronization
  semantics as contract changes requiring explicit review.
- Update the relevant context documentation when a domain term, invariant,
  boundary, or ownership rule changes.
