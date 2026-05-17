# Safety Gate Tests

Read-only guardrails for migration, Docker, Supabase, and governance drift.

Run:

```bash
npm run safety:test
```

Optional Supabase runtime checks:

```bash
CHECK_LOCAL_SUPABASE=1 npm run safety:test
CHECK_LINKED_SUPABASE=1 npm run safety:test
```

These tests do not run migrations, reset databases, repair migration metadata, delete Docker volumes, or print environment values.
