# Inventory Sheet Reconciliation Implementation Plan

> **For agentic workers:** Use the approved design below and execute the checked steps in order.

**Goal:** Provide a repeatable, read-only field-level audit of the two inventory sheets against a Supabase snapshot, with optional TypeSafe review of ambiguous candidate matches.

**Architecture:** A dependency-free Python CLI reads normalized JSON snapshots exported through the connected Sheets and Supabase integrations. Deterministic ID and unique-SKU joins produce observed comparisons; optional TypeSafe scores bounded fuzzy candidates and never authorizes a correction.

**Tech Stack:** Python 3.11+, standard library, existing `scripts/receipts/typesafe_client.py` for opt-in TypeSafe judgments.

**Spec:** `INVENTORY-SHEET-RECONCILIATION-DESIGN.md`

## Global Constraints

- Read-only: no Sheets or Supabase writes, imports, uploads, or automatic corrections.
- Supabase is the comparison reference, not proof of catalog fact.
- Exact ID/SKU matching is deterministic; normalized-name matching remains a candidate until reviewed.
- TypeSafe runs only with explicit opt-in; its result is labeled inferred and never changes records.
- Do not claim row-level freshness when a source lacks row timestamps.
- No new dependency.

## Review Focus

- Malformed or incomplete snapshot shapes must fail with an actionable message and no partial report.
- Duplicate IDs or SKUs must be reported as ambiguous rather than resolved by row order.
- Missing or unparsable timestamps must be counted as unknown, not current or stale.
- Numeric price strings and numeric JSON values must compare consistently without rounding away meaningful differences.
- TypeSafe transport, parsing, or low-confidence results must remain review-only and must not break deterministic reporting.

---

### Task 1: Deterministic reconciliation core and CLI

**Files:**
- Create `scripts/catalog/reconcile_inventory_snapshots.py`
- Create `scripts/catalog/test_reconcile_inventory_snapshots.py`

**Interfaces:**
- `load_snapshot(path) -> object`
- `reconcile(master_rows, copy_rows, supabase_rows) -> dict`
- CLI: `--master`, `--copy`, `--supabase`, `--output`; emit JSON only to the requested local output.

- [x] Write tests first for exact ID/SKU matches, duplicates, field disagreements, malformed input, numeric prices, and timestamp status.
- [x] Run those tests and confirm they fail before implementation.
- [x] Implement the pure reconciliation functions and report-only CLI.
- [x] Run the unit tests and a synthetic end-to-end CLI invocation.

### Task 2: Optional TypeSafe candidate review and usage guide

**Files:**
- Modify `scripts/catalog/reconcile_inventory_snapshots.py`
- Create `scripts/catalog/README.md`
- Extend `scripts/catalog/test_reconcile_inventory_snapshots.py`

**Interfaces:**
- Optional `--typesafe-candidates` and bounded `--typesafe-limit` flags.
- Candidate results include pair identifiers, typed result, and `inferred` provenance; no write interface exists.

- [x] Add mocked tests proving the flag gates TypeSafe calls and all results remain review-only.
- [x] Integrate the existing TypeSafe client; send only candidate product fields, never full snapshots or credentials.
- [x] Document the connector snapshot shapes, report schema, TypeSafe opt-in/privacy boundary, and exact read-only commands.
- [x] Run the unit suite, synthetic CLI check, `git diff --check`, and review the final diff.
