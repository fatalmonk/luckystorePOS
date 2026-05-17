# Runbook: Deterministic Validation

## Validation Pipeline

```
1. npm run typecheck     # TypeScript correctness
2. npm run lint          # Lint rules
3. npm run build         # Production build
4. npm run governance:check  # Migration governance
5. replay.sh             # Migration replay
6. flutter analyze       # Dart correctness
```

## Commands

```bash
cd /Users/ioriimasu/dev/luckystorePOS

# Web validation
npm run check

# Flutter validation
cd apps/mobile_app && flutter analyze

# Combined
npm run check && cd apps/mobile_app && flutter analyze
```

## Acceptance Criteria

| Check | Must Pass | Optional |
|---|---|---|
| TypeScript typecheck | Yes | |
| Build | Yes | |
| Lint | Yes | |
| Governance | Yes | |
| Migration replay | Yes | |
| Flutter analyze | Yes | |

## After Every Change

Run relevant validation based on what changed:
- Admin web code: `npm run typecheck && npm run build`
- Mobile code: `flutter analyze`
- Migrations: `npm run governance:check && replay.sh`
- Governance scripts: `npm run governance:check`
