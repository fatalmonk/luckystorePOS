# LuckyStorePOS Migration System: Strategic Architecture Overview

## Current Architecture Position

The LuckyStorePOS migration system has evolved from **reactive debugging** to **deterministic infrastructure verification with deep schema archaeology**.

### Phase Achieved: System Migration Operating System

This is no longer a deployment tool. It is becoming a **migration operating system** for a historically drifted Supabase monorepo.

---

## Current Capability Matrix

| Capability | Status | Maturity | Value |
|-----------|--------|----------|-------|
| **Deterministic Replay** | ✓ Complete | Production | High |
| **Failure Extraction** | ✓ Complete | Production | High |
| **Schema Drift Detection** | ✓ Complete | Production | High |
| **Migration Classification** | ✓ Complete | Production | Medium |
| **Object Ownership Tracking** | ✓ Complete | New | High |
| **Function Signature Registry** | ✓ Complete | New | High |
| **Dependency Inference** | ✓ Complete | New | High |
| **CI Integration** | ✓ Complete | Production | High |
| **Runtime Validation** | ✗ Not started | N/A | Planned |
| **Canonical Enforcement** | ✗ Not started | N/A | Planned |
| **Schema Consolidation** | ✗ Not started | N/A | Planned |

---

## Architecture Layers

### Layer 1: Execution (Deterministic)
```
Isolated Postgres 15 container
    ↓
Deterministic migration iteration (filename-sorted)
    ↓
Stop on first error (immediate diagnosis)
    ↓
Comprehensive logging + exit codes
```

**Responsibility**: Execute migrations reliably  
**Achieves**: Reproducible baseline  
**Prevents**: Developer-local drift

### Layer 2: Failure Capture (Structured)
```
Migration error → Parse psql output
    ↓
Extract line number + SQL context
    ↓
Generate failure.json (AI-parseable)
    ↓
Available for diagnosis loop
```

**Responsibility**: Make failures debuggable  
**Achieves**: Instant root cause visibility  
**Prevents**: Cascade failures

### Layer 3: Schema Verification (Determinism)
```
Before-replay schema snapshot
    ↓
After-replay schema snapshot
    ↓
Byte-for-byte comparison
    ↓
Drift report (drift-report.json)
```

**Responsibility**: Verify replay stability  
**Achieves**: Determinism guarantee  
**Prevents**: Hidden schema drift

### Layer 4: Classification (Archaeology)
```
80 migrations analyzed
    ↓
Categorized by type (foundational, extension, runtime, hardening, replacement, dead, unsafe)
    ↓
Scored by risk (critical, high, medium, low)
    ↓
Migration graph generated
```

**Responsibility**: Understand migration history  
**Achieves**: Strategic visibility  
**Prevents**: Blind spots in schema

### Layer 5: Ownership Analysis (Canonical)
```
Trace object creators
    ↓
Map ownership chains
    ↓
Detect duplicate creators
    ↓
Identify orphan hardening
    ↓
Object ownership graph
```

**Responsibility**: Track canonical ownership  
**Achieves**: Conflict detection  
**Prevents**: Ownership fragmentation

### Layer 6: Function Registry (Signatures)
```
Extract all function signatures
    ↓
Track grants/revokes per function
    ↓
Detect stale signatures
    ↓
Flag dead grants/revokes
    ↓
Function registry generated
```

**Responsibility**: Maintain function contract  
**Achieves**: Signature consistency  
**Prevents**: Dead permissions

### Layer 7: Dependency Inference (Ordering)
```
Build object-creator map
    ↓
Analyze each migration's dependencies
    ↓
Detect forward dependencies
    ↓
Flag dangling hardening
    ↓
Dependency graph generated
```

**Responsibility**: Verify replay ordering  
**Achieves**: Explicit dependency awareness  
**Prevents**: Forward dependency bugs

### Layer 8: AI Integration (Diagnosis)
```
JSON artifacts generated
    ↓
Available for AI analysis
    ↓
Supports closed-loop repair
    ↓
replay → diagnose → patch → verify → merge
```

**Responsibility**: Enable AI-assisted repair  
**Achieves**: Scalable problem-solving  
**Prevents**: Manual debugging fatigue

---

## Data Flow: Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Developer: "Run replay to check if migrations work"        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  docker-compose up                                          │
│  ├─ Boot isolated Postgres 15                              │
│  └─ Start replay-engine                                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  replay.sh (Deterministic Execution)                       │
│  ├─ verify_postgres_connectivity()                         │
│  ├─ generate_baseline_schema()                             │
│  └─ replay_migrations()                                    │
│     └─ for each migration (sorted filename):               │
│        ├─ Execute psql                                     │
│        ├─ Measure timing                                   │
│        └─ Stop on error → write failure.json               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
                 [Success Path]
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  generate_final_schema()                                    │
│  ├─ schema-baseline.sql                                    │
│  └─ schema-after.sql                                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  compare_schema.sh (Drift Detection)                       │
│  ├─ diff-report.txt                                        │
│  └─ drift-report.json                                      │
│     ├─ Object counts (tables, functions, policies)         │
│     ├─ Indicators (duplicates, unsafe comments, search_path)
│     └─ Stability verdict                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  classify_migrations.cjs (Classification)                  │
│  ├─ Analyze 80 migrations                                  │
│  ├─ migration-graph.json                                   │
│  │  ├─ Counts per category                                 │
│  │  ├─ Risk scoring                                        │
│  │  ├─ Dependency inferences                               │
│  │  └─ Unsafe patterns                                     │
│  └─ migration-classification.txt                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  build_ownership_graph.cjs (Canonical Ownership)           │
│  ├─ Trace creators per object                              │
│  ├─ object_ownership_graph.json                            │
│  │  ├─ Who owns what                                       │
│  │  ├─ Duplicate creators                                  │
│  │  ├─ Orphan hardening                                    │
│  │  └─ Replacement chains                                  │
│  └─ object_ownership_analysis.txt                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  build_function_registry.cjs (Signature Registry)          │
│  ├─ Extract all function signatures                        │
│  ├─ function_signature_registry.json                       │
│  │  ├─ Grants per function                                 │
│  │  ├─ Revokes per function                                │
│  │  ├─ Dead grants/revokes                                 │
│  │  └─ SECURITY DEFINER risks                              │
│  └─ function_signature_analysis.txt                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  build_migration_dependencies.cjs (Dependency Graph)       │
│  ├─ Analyze dependencies per migration                     │
│  ├─ migration_dependency_graph.json                        │
│  │  ├─ Forward dependencies (CRITICAL)                     │
│  │  ├─ Dangling hardening (HIGH)                           │
│  │  ├─ Orphan replacements (HIGH)                          │
│  │  └─ Missing objects (HIGH)                              │
│  └─ migration_dependency_analysis.txt                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  replay_report.cjs (Aggregation)                           │
│  ├─ replay-report.json (metrics + recommendations)         │
│  └─ replay-report.md (human-readable)                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  artifacts/ directory (Complete Analysis Package)          │
│  ├─ replay-report.json                                     │
│  ├─ replay-report.md                                       │
│  ├─ failure.json (if failed)                               │
│  ├─ migration-graph.json                                   │
│  ├─ drift-report.json                                      │
│  ├─ object_ownership_graph.json (NEW)                      │
│  ├─ function_signature_registry.json (NEW)                 │
│  ├─ migration_dependency_graph.json (NEW)                  │
│  ├─ schema-baseline.sql                                    │
│  ├─ schema-after.sql                                       │
│  └─ ... logs and text summaries ...                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  AI Agent Consumption (Diagnosis Loop)                     │
│  ├─ Parse replay-report.json → success/failure verdict    │
│  ├─ Check failure.json → if failed, understand why        │
│  ├─ Read object_ownership_graph.json → canonical conflicts│
│  ├─ Read function_signature_registry.json → stale sigs   │
│  ├─ Read migration_dependency_graph.json → ordering issues│
│  └─ Propose targeted, safe repairs                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Developer Review                                           │
│  ├─ Accept AI proposal OR                                  │
│  ├─ Provide feedback for refinement OR                     │
│  └─ Manually craft repair                                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Repair Merged to Main                                     │
│  └─ CI runs full replay validation                         │
│     ├─ All 80 migrations execute                           │
│     ├─ Schema verified deterministic                       │
│     ├─ Ownership checked                                   │
│     ├─ Dependencies validated                              │
│     └─ Merge approved if all green                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Files in System

### Core Execution (7 KB)
- `replay.sh` - Main deterministic engine

### Schema Inspection (7 KB)
- `schema_snapshot.sh` - Capture before/after
- `compare_schema.sh` - Drift detection

### Classification & Analysis (39 KB) ← NEW
- `classify_migrations.cjs` - Categorize by type/risk
- `build_ownership_graph.cjs` - Trace canonical ownership
- `build_function_registry.cjs` - Function signatures
- `build_migration_dependencies.cjs` - Dependency graph

### Reporting (11 KB)
- `replay_report.cjs` - Aggregate + recommend

### Testing (1 KB)
- `replay_single.sh` - Single migration debugging
- `extract_failure.sh` - Error context

### Infrastructure (8 KB)
- `Dockerfile` - Container spec
- `docker-compose.yml` - Service orchestration
- `entrypoint.sh` - Workflow coordinator

### Documentation (20 KB)
- `README.md` - System guide
- `PRIORITY_ENHANCEMENTS.md` - This architecture

---

## Critical Safety Guarantees

The system enforces:

1. **Determinism**: Same input → identical output (verified twice in CI)
2. **Isolated**: Fresh container per run (no local state pollution)
3. **Safe**: Read-only analysis (no auto-mutations)
4. **Traceable**: Complete artifact audit trail
5. **Debuggable**: Machine-readable failures
6. **Non-blocking**: AI-friendly, doesn't block on analysis

---

## Warning Signs (Convergence Threshold)

Watch for these signals that consolidated baseline is needed:

| Signal | Meaning | Action |
|--------|---------|--------|
| >25 replay guards added | Chain entropy too high | Plan consolidation |
| Duplicate ownership across generations | Canonical drift severe | Consolidate owners |
| Commented-out runtime bodies | Migration history corrupted | Archive + collapse |
| Repeated optional hardening | Replay semantics degraded | Establish canonical |
| Dead grants/revokes dominate | Security history detached | Clean grants |

**Current State**: Early phase (safe to continue with repairs)

---

## Roadmap: Next Phases

### Phase 2 (Next Sprint)
- ✓ Identify high-risk migrations from ownership graph
- ✓ Propose targeted repairs (add guards, fix ordering)
- ✓ Validate with replay
- Merge improvements to main

### Phase 3 (2-3 Weeks)
- ✓ Build canonical schema assertion layer (`--verify-canonical`)
- ✓ Enforce field constraints (no removed columns, etc.)
- ✓ Prevent legacy aliases
- Validate against RPC contract

### Phase 4 (1-2 Months)
- ✓ Stabilize replay (green for 30 days)
- ✓ Validate offline sync against output
- ✓ Reconciliation determinism tests
- ✓ Pilot deployment

### Phase 5 (3-4 Months)
- ✓ Extract baseline.sql (consolidated foundational)
- ✓ Create runtime_rpcs.sql (consolidated runtime)
- ✓ Create security.sql (consolidated hardening)
- ✓ Validate equivalence
- ✓ Archive historical migrations
- ✓ Deploy consolidated baseline

---

## Success Metrics

**System is successful when**:

1. ✓ All 80 migrations replay deterministically (identical schemas across runs)
2. ✓ Zero forward dependencies (all ordering correct)
3. ✓ Zero orphan grants/revokes (all permissions valid)
4. ✓ Canonical ownership clear (no conflicts)
5. ✓ CI validates on every PR (baseline enforced)
6. ✓ AI diagnosis closes repair loops (faster than manual)

**Current Progress**:
- Metric 1: Testing
- Metric 2: Testable (detection built)
- Metric 3: Testable (detection built)
- Metric 4: Testable (detection built)
- Metric 5: Ready (CI integrated)
- Metric 6: Ready (JSON artifacts)

---

## Conclusion

LuckyStorePOS now has a **migration operating system** capable of:
- Executing reliably (deterministic replay)
- Diagnosing intelligently (structured artifacts)
- Repairing safely (AI-assisted with verification)
- Consolidating strategically (archaeology foundation)

The system has evolved from **"does this run?"** to **"is this safe and correct and canonical?"**

This is the correct architectural response to the historical schema drift problem.

**Next**: Run full replay, identify high-risk migrations, propose targeted repairs.
