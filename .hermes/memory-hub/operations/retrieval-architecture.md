# LuckyStorePOS Retrieval Architecture

## Retrieval Priority

1. **Runbooks** - Immediate operational procedure lookup
2. **Debugging lineage** - Failure taxonomy, root causes, mitigations
3. **Replay lineage** - Migration replay architecture, risk classification
4. **Migration lineage** - Dependency chains, forward dependencies, evolution
5. **Architecture summaries** - System overview, boundaries, topology
6. **Governance state** - Baseline, known issues, policy
7. **Operational decisions** - Recorded choices, tradeoffs
8. **Topology maps** - Relationship graphs, failure paths

## Retrieval Strategy

### Metadata-First

Use file path and namespace to locate relevant memory:

```
Need: How to run migration replay?
Path: .hermes/memory-hub/runbooks/migration-replay.md

Need: What caused replay failures?
Path: .hermes/memory-hub/debugging/failure-taxonomy.md

Need: What's the current governance state?
Path: .hermes/memory-hub/governance/governance-enforcement-architecture.md
```

### Topology-Aware

Navigate by system relationship:

```
Need: Mobile sync behavior
  -> sync/sync-reconciliation-architecture.md
    -> references: offline/manager.dart, offline/sync_engine.dart
      -> references: runbooks/offline-replay-validation.md

Need: RPC function stability
  -> architecture/supabase-topology.md
    -> references: governance/governance-enforcement-architecture.md
      -> references: scripts/governance/baseline.json
```

### Avoid Semantic Retrieval

Do NOT:
- Embed all memory into a vector database
- Use similarity search as primary lookup
- Dump transcripts into searchable pool

DO:
- Use deterministic file paths
- Use structured markdown with clear headings
- Cross-reference between memory files

## Memory Namespace Quick Reference

| Namespace | Content | When to Use |
|---|---|---|
| `architecture/` | System maps, boundaries, topology | Understanding system structure |
| `debugging/` | Failure taxonomy, root causes, mitigations | Investigating problems |
| `operations/` | Deployment, runtime, token strategy | Running or configuring system |
| `migrations/` | Migration history, replay | Schema evolution questions |
| `replay/` | Replay architecture, determinism | Replay issues |
| `sync/` | Sync/reconciliation architecture | Mobile sync questions |
| `governance/` | Rules, protected zones, policy | Compliance and safety |
| `evals/` | Eval harness, testing | Validation questions |
| `runbooks/` | Step-by-step procedures | Operational execution |
| `decisions/` | Recorded choices | Context for past decisions |
| `topology/` | Relationship graphs | Dependency analysis |
| `lineage/` | Evolution chains | Historical understanding |
| `quarantine/` | Known bad/deprecated | What NOT to do |
