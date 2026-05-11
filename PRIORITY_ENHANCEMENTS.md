# Priority 1–3 Enhancement Implementation Summary

## Context

Based on comprehensive assessment of the deterministic migration replay system, three priority enhancements were identified to unlock deeper schema archaeology capabilities:

1. **Object Ownership Graph** - Trace canonical ownership and detect conflicts
2. **Function Signature Registry** - Detect dead grants/revokes and signature drift
3. **Migration Dependency Inference** - Detect unsafe ordering and forward dependencies

These enhancements convert the replay system from **syntax verification** to **semantic verification** — understanding *what* the migrations do, not just whether they execute.

---

## Priority 1: Object Ownership Graph

**File**: `build_ownership_graph.cjs`

**Purpose**: 
Traces which migration owns which object (tables, functions, indexes, extensions, policies). Detects canonical ownership conflicts and orphan hardening migrations.

**What It Does**:
```
Migration 1 creates → TABLE users
Migration 2 creates → FUNCTION get_user(uuid)
Migration 3 creates → POLICY check_user_auth ON users
Migration 4 attempts → ALTER TABLE users_old (doesn't exist - orphan)
```

**Output: `object_ownership_graph.json`**

```json
{
  "public.sales": {
    "type": "TABLE",
    "owner": "20260301000000_baseline_core_tables.sql",
    "created_at": "20260301000000",
    "alters": [
      {
        "type": "TABLE",
        "migration": "20260423000000_...",
        "timestamp": "20260423000000"
      }
    ],
    "drops": [],
    "grants": [
      {
        "permissions": "SELECT, INSERT",
        "target": "sales",
        "migration": "20260423000000_grant_pos_anon.sql",
        "timestamp": "20260423000000"
      }
    ],
    "revokes": [],
    "policies": [
      {
        "migration": "20260427000000_advisor_security_rls_and_functions.sql",
        "timestamp": "20260427000000",
        "count": 1
      }
    ],
    "conflicts": []
  }
}
```

**Detects**:
- ✓ Duplicate creators (two migrations creating same object)
- ✓ Orphan grants (grant on non-existent object)
- ✓ Orphan revokes (revoke on non-existent object)
- ✓ Orphan policies (RLS on deleted table)
- ✓ Replacement chains (object created, altered, replaced multiple times)
- ✓ Canonical ownership conflicts (conflicting creators)

**Also Generates**: 
- `object_ownership_analysis.txt` - Human-readable summary
- Shows canonical ledger tables, RPC functions, security functions

**Example Discovery**:
```
[duplicate_creator] stock_levels
  Created by: 20260301000000_baseline_core_tables.sql
  Also created by: 20260325110027_stock_levels_table.sql
  → ACTION: One must be OR REPLACE / dropped
```

---

## Priority 2: Function Signature Registry

**File**: `build_function_registry.cjs`

**Purpose**:
Builds comprehensive registry of all function signatures across migrations. Detects stale signatures, dead grants, and unsafe SECURITY DEFINER patterns.

**What It Does**:
```
Migration 1 creates → complete_sale(uuid, uuid, jsonb)
Migration 2 grants  → EXECUTE to authenticated
Migration 3 alters  → add SECURITY DEFINER
Migration 4 revokes → EXECUTE from authenticated
Migration 5 grants  → EXECUTE to authenticated again (double grant!)
```

**Output: `function_signature_registry.json`**

```json
{
  "complete_sale(uuid,uuid,jsonb)": {
    "signature": "complete_sale(uuid,uuid,jsonb)",
    "name": "complete_sale",
    "params": "uuid,uuid,jsonb",
    "created_by": "20260420100000_pos_transactions.sql",
    "created_timestamp": "20260420100000",
    "is_security_definer": true,
    "search_path": "explicit",
    "mutated_by": [
      {
        "type": "ALTER",
        "alteration": "OWNER TO postgres",
        "migration": "20260506000000_...",
        "timestamp": "20260506000000"
      }
    ],
    "granted_by": [
      {
        "role": "authenticated",
        "permissions": "EXECUTE",
        "migration": "20260423000000_grant_pos_anon.sql",
        "timestamp": "20260423000000"
      }
    ],
    "revoked_by": [
      {
        "role": "anon",
        "permissions": "EXECUTE",
        "migration": "20260506040000_revoke_anon_on_pos_functions.sql",
        "timestamp": "20260506040000"
      }
    ],
    "missing": false,
    "risks": []
  }
}
```

**Detects**:
- ✓ Orphan grants (grant on non-existent function)
- ✓ Orphan revokes (revoke on non-existent function)
- ✓ Dead grants (function dropped but grant remains)
- ✓ Stale signatures (function replaced but old grants remain)
- ✓ SECURITY DEFINER without search_path (critical security risk)
- ✓ Multiple grants to same role (unclear intent, suggests manual fixes)
- ✓ Grant after drop (temporal ordering violation)

**Also Generates**:
- `function_signature_analysis.txt` - Readable list of high-risk functions
- Shows orphan grants/revokes by function

**Example Discovery**:
```
[missing_creator] get_new_receipt(uuid)
  Granted to: anon
  Created by: <FUNCTION NOT FOUND IN ANY MIGRATION>
  → ACTION: Commented-out creator? Missing migration?

[orphan_grant] complete_sale(uuid,uuid,jsonb)
  Granted to: authenticated in 20260423000000_grant_pos_anon.sql
  Function not found until 20260420100000_pos_transactions.sql
  → ACTION: Migration ordering error detected
```

---

## Priority 3: Migration Dependency Inference

**File**: `build_migration_dependencies.cjs`

**Purpose**:
Analyzes forward dependencies (migrations relying on objects not yet created). Detects:
- Hardening before owner objects exist
- Runtime before foundational setup
- Replacement chains on missing objects

**What It Does**:

Static analysis of each migration:
1. Extract all objects created (CREATE TABLE, CREATE FUNCTION, etc.)
2. Extract all object references (ALTER, DROP, GRANT, CREATE POLICY ON, CREATE TRIGGER ON, etc.)
3. Map references to their creators via timestamp
4. Detect forward dependencies (reference timestamp > creator timestamp)
5. Flag unsafe patterns

**Output: `migration_dependency_graph.json`**

```json
{
  "20260427000000_advisor_security_rls_and_functions.sql": {
    "sequence": 125,
    "timestamp": "20260427000000",
    "category": "hardening",
    "dependencies": {
      "objects": [
        "get_new_receipt",
        "receipt_counters",
        "staff_advisors"
      ],
      "migrations": [
        "20260301000000_baseline_core_tables.sql",
        "20260420100000_pos_transactions.sql"
      ],
      "satisfied": true,
      "unsatisfied_objects": []
    },
    "unsafe_assumptions": [],
    "risks": []
  },

  "20260423000000_grant_pos_anon.sql": {
    "sequence": 100,
    "timestamp": "20260423000000",
    "category": "hardening",
    "dependencies": {
      "objects": [
        "complete_sale",
        "get_store_profile",
        "get_user_by_phone"
      ],
      "migrations": [],
      "satisfied": false,
      "unsatisfied_objects": [
        {
          "object": "complete_sale",
          "owner": "20260420100000_pos_transactions.sql",
          "owner_timestamp": "20260420100000",
          "issue": "forward_dependency"
        }
      ]
    },
    "unsafe_assumptions": [],
    "risks": [
      {
        "type": "forward_dependency",
        "object": "complete_sale",
        "depends_on_migration": "20260420100000_pos_transactions.sql",
        "severity": "critical"
      },
      {
        "type": "dangling_hardening",
        "severity": "high",
        "message": "Hardening migration with no explicit dependencies - may run before owner objects"
      }
    ]
  }
}
```

**Detects**:
- ✓ Forward dependencies (hardening before creator - CRITICAL)
- ✓ Dangling hardening (RLS/POLICY without declared owner dependency)
- ✓ Runtime before foundation (function call before function creation)
- ✓ Orphan replacements (fix_X depends on missing objects)
- ✓ Missing objects (referenced but never created)

**Also Generates**:
- `migration_dependency_analysis.txt` - Readable dependency warnings
- Shows migration sequence + risk summary

**Example Discovery**:
```
CRITICAL ISSUES:
================

20260423000000_grant_pos_anon.sql
  [CRITICAL] forward_dependency: complete_sale depends on 20260420100000_pos_transactions.sql
  [HIGH] dangling_hardening: No explicit dependencies - may run before owner objects

20260506000002_repair_missing_domain_functions.sql
  [CRITICAL] runtime_before_foundation: Function used before creation
```

---

## How They Work Together

```
replay.sh (deterministic execution)
    ↓
classify_migrations.cjs (categorization)
    ↓
├→ build_ownership_graph.cjs (canonical ownership)
│   └→ object_ownership_graph.json
│
├→ build_function_registry.cjs (function signatures)
│   └→ function_signature_registry.json
│
└→ build_migration_dependencies.cjs (dependency analysis)
    └→ migration_dependency_graph.json

AI Agent receives all three for diagnosis:
- "Why did migration X fail?"
  → Check object_ownership_graph for duplicate creators
  → Check function_signature_registry for orphan grants
  → Check migration_dependency_graph for forward dependencies
```

---

## Usage

### Local Testing
```bash
cd luckystorePOS/infra/migration-replay

# These run automatically after replay.sh succeeds
docker-compose up --build

# View outputs
cat ../../artifacts/object_ownership_graph.json
cat ../../artifacts/function_signature_registry.json
cat ../../artifacts/migration_dependency_graph.json
```

### Manual Testing (single analyzer)
```bash
# Test ownership graph only
node build_ownership_graph.cjs supabase/migrations artifacts

# Test function registry only
node build_function_registry.cjs supabase/migrations artifacts

# Test dependency inference only
node build_migration_dependencies.cjs supabase/migrations artifacts
```

### Reading Artifacts

**For Ownership Conflicts**:
```bash
# Find duplicate creators
cat artifacts/object_ownership_analysis.txt | grep "duplicate_creator"

# Find orphan grants
cat artifacts/object_ownership_graph.json | jq '.conflicts[] | select(.type == "orphan_grant")'
```

**For Function Issues**:
```bash
# Find high-risk functions
cat artifacts/function_signature_analysis.txt | grep -A5 "HIGH-RISK"

# Find orphan grants
cat artifacts/function_signature_registry.json | jq '.conflicts[] | select(.type == "orphan_grant")'
```

**For Dependency Problems**:
```bash
# Find critical dependency issues
cat artifacts/migration_dependency_analysis.txt | grep -A3 "CRITICAL"

# Find forward dependencies
cat artifacts/migration_dependency_graph.json | jq '.critical_issues[]'
```

---

## Integration with Existing System

All three analyzers:
- Run **after** successful replay (don't need it to pass, just need schema)
- Generate JSON artifacts for AI diagnosis
- Add no performance overhead (static analysis only)
- Are **non-blocking** (replay doesn't fail if they fail)

**Dockerfile Updated**:
- Copies all three .cjs files
- Makes them executable

**replay.sh Updated**:
- Calls all three after replay succeeds
- Handles missing Node gracefully

**CI Workflow**:
- Artifacts uploaded automatically
- Analyzed in comment on PR

---

## What These Unlock

### Immediate (This Sprint)
1. **Visibility into canonical ownership conflicts**
   - "Which migrations are creating the same object?"
   - "Are there duplicate creators we need to clean up?"

2. **Function signature drift detection**
   - "Which functions have orphan grants?"
   - "Are there SECURITY DEFINER functions without search_path?"

3. **Forward dependency warnings**
   - "Which migrations run before their dependencies exist?"
   - "Will this replay actually work?"

### Medium-term (Next)
1. **Automated repair suggestions**
   - "Add SECURITY DEFINER + SET search_path to this function"
   - "Change this to OR REPLACE instead of CREATE"
   - "Move this migration after [X] to fix forward dependency"

2. **Canonical ownership enforcement**
   - "These objects must all be created in foundational migration"
   - "These functions must have these exact signatures"
   - "These policies must all target this one table"

3. **Schema collapse planning**
   - "These migrations can be combined into baseline.sql"
   - "These can become runtime_rpcs.sql"
   - "These become security.sql"

### Long-term (Foundation for Future)
1. **Offline sync validation**
   - Verify generated types match actual function signatures
   - Detect incompatibilities before deployment

2. **Reconciliation determinism**
   - Ensure offline clients can replay operations against updated schema
   - Verify idempotency against latest migration state

3. **Full schema-as-code**
   - Generate canonical schema from migration archaeology
   - Auto-detect breaking changes
   - Validate against RPC contract

---

## Files Added

- `build_ownership_graph.cjs` (13 KB) - Object ownership analysis
- `build_function_registry.cjs` (14 KB) - Function signature registry
- `build_migration_dependencies.cjs` (12 KB) - Dependency inference

**Total**: ~39 KB of static analysis code

All three are:
- ✓ Deterministic (same input = same output)
- ✓ Parseable (JSON output for AI)
- ✓ Non-blocking (replay succeeds regardless)
- ✓ Safe (read-only analysis)

---

## Next Steps

1. Run full replay locally: `docker-compose up --build`
2. Review three new JSON artifacts
3. Identify high-risk patterns in system
4. Use insights to propose targeted migrations repairs
5. Re-run replay to verify improvements

The system is now equipped to perform deep schema archaeology and guide safe, deterministic repairs.
