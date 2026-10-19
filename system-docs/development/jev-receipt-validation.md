# Lucky Store — JEV Receipt Validation Architecture

## Overview
This document specifies the integration of TypeSafe / JEV as an independent AI advisory verification layer for the Lucky Store Receipt Intelligence pipeline.

## 1. Multi-Layer Production Architecture

| Layer | Responsibility | Authority |
|---|---|---|
| **Databricks** | Receipt parsing, OCR extraction, and streaming transformation | Advisory |
| **JEV (TypeSafe)** | Evidence assessment, source grounding, and contradiction detection | Advisory |
| **Deterministic Validator** | Decimal financial arithmetic, BDT 0.05 tolerance checks, and business rules | Validation |
| **Lucky Store Admin** | Human review, duplicate resolution, and manual approval | Authorized Approval |
| **Supabase / PostgreSQL** | Controlled purchase posting, ledger insertion, and stock updates | Transaction Execution |

### Critical Distinction
- **JEV** determines whether the available evidence supports the extraction claim, highlights contradictions, detects hallucinated line items, and flags risks.
- **Deterministic Validator** independently establishes mathematical correctness, non-negative constraints, and header-to-line reconciliation.
- **Posting Authority** is strictly reserved for authenticated managers/admins with verified tenant boundaries. JEV is never permitted to post purchases or mutate inventory.

---

## 2. Recommendation Matrix

| Recommendation | Condition | Required Human Action | Posting Authorized? |
|---|---|---|---|
| **PASS** | Exact arithmetic match (diff ≤ BDT 0.05), valid line items, complete metadata, source image verified (`source_image_verified: true`), no contradictions. | Ready for authorized manual manager/admin approval. | **No** (Manual approval required) |
| **REVIEW** | Arithmetic passes or is within tolerance, but source image is unverified (`source_image_verified: false`), or potential duplicate invoice flagged, or low extraction confidence. | Inspect source receipt image in Lucky Store Admin to confirm item details. | **No** |
| **FAIL** | Arithmetic mismatch (> BDT 0.05), invalid quantities (≤ 0), negative prices (< 0), missing mandatory fields, hallucinated items, or non-purchase document. | Quarantine receipt. Resolve mismatches or re-scan document before re-submission. | **No** |

---

## 3. Configuration & Deployment

### Prerequisites
- Node.js 22+
- npm 10+
- TypeSafe API key (for live online evaluations)

### JEV CLI Installation & Setup
```bash
# 1. Install global CLI
npm install -g @jtsang/jev-cli

# 2. Initialize configuration
jev-cli config init

# 3. Configure TypeSafe API key
jev-cli config set providers.jev.apiKey <YOUR_TYPESAFE_API_KEY>

# 4. Verify installation
jev-cli doctor
# For offline verification:
jev-cli doctor --offline
```

> [!CAUTION]
> **Secret Protection**: Never paste TypeSafe production API keys into agent conversations or commit them to Git. Set keys locally via `jev-cli config set` or export the environment variable `JEV_CLI_API_KEY`.

### Agent Skill
The agent skill is configured under `.agents/skills/luckystore-receipt-verification/SKILL.md` and provides guidance for Antigravity AI agents.

---

## 4. Verification Execution & CLI Runner

### Running Receipt Verification via CLI
```bash
# Human-readable format
npx tsx scripts/receipts/verify_receipt.ts tests/jev/sample-receipt.json

# JSON output for automated ingestion
npx tsx scripts/receipts/verify_receipt.ts --json tests/jev/sample-receipt.json
```

### Running Test Suites
```bash
# Run JEV Vitest suite (16 tests covering positive, negative, adversarial, and tenant isolation)
npx vitest run tests/jev/receipt_verification.spec.ts

# Run Databricks reconciliation SQL unit tests (9 tests)
python3 -m unittest databricks/bundles/receipt_intelligence/tests/test_receipt_reconciliation.py
```

---

## 5. Security & Isolation Controls
- **Tenant Isolation**: Caller tenant ID must match receipt `tenant_id`. Any cross-tenant attempt throws a `SecurityAuthorizationViolationError`.
- **Posting Boundary**: The helper function `preventUnauthorizedPosting()` unconditionally blocks automated transaction execution. Output payloads immutably enforce `safety.posting_authorized = false` and `safety.inventory_mutation_authorized = false`.
- **Decimal Math**: Strict 2-decimal rounding prevents floating-point drift when checking the BDT 0.05 tolerance.
