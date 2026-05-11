# LuckyStorePOS Mutation Boundary Policy

## Policy

Hermes will NEVER automatically mutate protected zones.

## Required Before Mutation

1. **Explicit approval** from user (not implied by task description)
2. **Replay verification** - migration replay passes
3. **Deterministic validation** - `npm run check` and/or `flutter analyze`
4. **Governance verification** - `npm run governance:check` passes

## Approval Workflow

```
User requests change to protected zone
  -> Hermes identifies zone as PROTECTED_CRITICAL
    -> STOP and ask for explicit confirmation
      -> User confirms with context
        -> Hermes proceeds with change
          -> Hermes runs verification after change
            -> Reports results transparently
```

## What Counts as Explicit Approval

- "Yes, proceed with the migration"
- "Approve change to [specific file]"
- "Go ahead with the protected zone edit"

## What Does NOT Count as Approval

- General task description mentioning protected zone
- Previous approval for different change
- Silence after Hermes asks for confirmation

## Verification After Mutation

| Zone | Verification |
|---|---|
| Migration | `npm run governance:check && replay.sh` |
| Mobile offline | `flutter analyze` + SOP on device |
| Mobile sales | `flutter analyze` + duplicate replay test |
| Auth provider | `flutter analyze` + login flow test |
| Replay tooling | `replay.sh` full test |
| Eval runner | Run against staging |
| Reconciliation | Physical count SOP |
| Ledger | Inventory math SQL check |
