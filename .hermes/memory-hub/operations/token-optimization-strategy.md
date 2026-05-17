# LuckyStorePOS Token Optimization Strategy

## DO NOT STORE

- Full chat transcripts
- Full terminal logs (capture only relevant lines)
- Analyzer output spam (tsconfig errors, lint noise)
- Repetitive build logs (keep only final pass/fail)
- Generated code (keep source, not output)
- Transient stack traces (keep only root cause)
- package-lock.json churn
- node_modules contents
- `.dart_tool` generated files
- dist/ build artifacts

## STORE ONLY

High-signal compressed cognition.

## GOOD MEMORY Examples

```
Replay drift caused by timestamp hashing
  -> Governance baseline normalizes timestamps before hashing
  -> Without normalization: every rebuild produces different hash

Supabase local port mismatch caused replay failure
  -> Replay defaults to 5432, Supabase local uses 54322
  -> Two failures logged 2026-05-11: port 5432 (no postgres), port 54322 (script expects 5432)

psql absence required docker fallback
  -> replay.sh requires psql CLI
  -> Docker container provides isolated PostgreSQL + psql
  -> Entry point: infra/migration-replay/Dockerfile

Dual replay architecture unresolved
  -> Transaction queue (file-based, canonical sales)
  -> Event queue (Drift-based, generic events)
  -> Different semantics, no unified state machine

Governance baseline strategy chosen
  -> Baseline captures known issues as accepted facts
  -> 6 search_path, 85 orphan grants, 60 orphan revokes, 47 legacy fields
  -> Risk: baseline becomes technical debt accumulator

SECURITY DEFINER enforcement stabilized
  -> 2026050601* through 2026050604* migrations revoke anon broadly
  -> 2026050605 fixes search_path on remaining functions
  -> 20260506040100 addresses final 6 missing search_path instances
```

## BAD MEMORY Examples

```
"Build passed" (no context, no what-changed)
"TypeScript error in file X line Y" (transient, already fixed)
"npm install output" (dependency noise)
"Flutter hot reload log" (development transient)
```

## Compression Rules

1. **One line per fact** when possible
2. **Causal chain** over chronological dump
3. **Current state** over historical progression
4. **Actionable insight** over raw observation
5. **Cross-reference** to runbook or SOP where applicable
