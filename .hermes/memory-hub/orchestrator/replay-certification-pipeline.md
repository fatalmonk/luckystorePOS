# Replay Certification Pipeline: P5

This pipeline contains the absolute verification vector required to promote the repository from `UNVERIFIED_MUTATED` to `CERTIFIED_STEADY`.

## Pipeline Nodes

### Node 1: Lexicographical Ordering & Drift
- **Trigger**: Every commit sealing event.
- **Command**: `cd infra/migration-replay && ./replay.sh`
- **Metric**: `FAIL_ON_ERROR=1`.
- **Assurance**: Confirms the Supabase schema is perfectly reproducible.

### Node 2: Type Safety Integrity
- **Trigger**: Post-migration success.
- **Command**: 
  1. `supabase gen types typescript --local > apps/admin_web/src/lib/database.types.ts`
  2. `cd apps/admin_web && npm run typecheck`
- **Assurance**: Guarantees backend RPC contracts match frontend API consumption.

### Node 3: Mobile Model Coherence
- **Trigger**: `apps/mobile_app/` files changed.
- **Command**: `cd apps/mobile_app && dart run build_runner build --delete-conflicting-outputs && flutter analyze`
- **Assurance**: Verifies `drift` generated code aligns with manually edited schema definitions.

### Node 4: Distributed Invariant Eval
- **Trigger**: Full Pipeline Terminal Phase.
- **Command**: `cd scripts/evals && npx ts-node eval-runner.ts`
- **Assurance**: Dynamically verifies:
  - Replay idempotency
  - Serializability under contention
  - Conflict detection logic

## Certification Artifact
To generate the **Certification Seal**, the agent must produce a timestamped `CERTIFICATION_PROOF.md` verifying that EVERY Node completed successfully without human interaction or override.

**Signature Mandatory**: `md5` or `sha256` checksums of the artifacts MUST be preserved.
