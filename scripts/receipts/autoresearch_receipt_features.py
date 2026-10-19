"""
Lucky Store — Autoresearch Feature Discovery for Receipt Reconciliation
Discovers TypeSafe System One (Jev) Score & Noul questions that predict
ledger reconcilability and procurement audit risk from receipt metadata/OCR.

Inspired by TypeSafe Autoresearch Cookbook:
- Free text & receipt OCR metadata -> Discovered TypeSafe questions
- Intensity questions (Score, 5 levels) -> Expected level + spread
- Presence questions (Noul, yes/no) -> Probability true
- Evaluates feature correlation against actual ledger reconciliation ground truth
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.receipts.typesafe_client import TypeSafeClient

MANIFEST_PATH = REPO_ROOT / "data" / "standardized_receipts" / "receipts_manifest.json"
LEDGER_CSV_PATH = REPO_ROOT / "data" / "Accounts" / "reconciled_expenses_for_google_sheet.csv"
OUTPUT_FEATURES_JSON = REPO_ROOT / "data" / "Accounts" / "discovered_receipt_features.json"

# Fixed 5-level rubric for intensity questions (per TypeSafe cookbook standard)
INTENSITY_LEVELS = [
    "Not present in this receipt at all",
    "Barely present - mentioned once, in passing or barely readable",
    "Present at a moderate level",
    "Present strongly - detailed breakdown or prominent header",
    "Dominant - the receipt is largely structured around this",
]

PRESENCE_CRITERIA = {
    "true": "The receipt clearly shows, states, or implies this.",
    "false": "The receipt gives no indication of this.",
}

# Seed feature questions proposed for receipt audit intelligence
DEFAULT_CANDIDATE_QUESTIONS = [
    {
        "name": "supplier_branding_formality",
        "kind": "intensity",
        "question": "How formal and professionally branded is the supplier header (printed logo, VAT/BIN registration, registered commercial address vs casual blank memo)?",
    },
    {
        "name": "line_item_granularity",
        "kind": "intensity",
        "question": "How detailed is the line-item breakdown (individual product SKUs, exact unit rates, pack quantities, sub-totals vs lump sum)?",
    },
    {
        "name": "payment_settlement_clarity",
        "kind": "presence",
        "question": "Does the document clearly state the payment method or settlement status (e.g., 'Paid in Cash', 'Paid via bKash', 'Due', or 'COD')?",
    },
    {
        "name": "handwritten_alterations_present",
        "kind": "presence",
        "question": "Are there handwritten pen scribbles, crossed-out numbers, or manual alterations over printed totals?",
    },
    {
        "name": "vat_tax_breakdown_present",
        "kind": "presence",
        "question": "Is there an explicit VAT, Mushak, tax rate, or challan number separate from the net total?",
    },
    {
        "name": "cash_discount_deducted",
        "kind": "presence",
        "question": "Is a supplier trade discount, percentage off, or cash concession explicitly deducted from the gross subtotal?",
    },
    {
        "name": "authorized_signature_present",
        "kind": "presence",
        "question": "Is there a physical signature, delivery receiver stamp, or store seal?",
    },
    {
        "name": "arithmetic_breakdown_consistency",
        "kind": "intensity",
        "question": "How transparent and verifiable is the math from item rates to total payable amount?",
    },
]


def load_reconciliation_dataset(sample_size: int = 100, seed: int = 42) -> Tuple[List[Dict[str, Any]], np.ndarray]:
    """
    Load standardized receipts joined with ledger matching labels.
    Returns: (receipt_rows, labels_array where 1 = ledger_matched, 0 = unledgered/discrepancy)
    """
    if not MANIFEST_PATH.is_file():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")

    manifest_data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    
    # Filter valid purchase invoices
    valid_items = [
        item for item in manifest_data
        if item.get("doc_type") == "purchase_invoice" and not item.get("is_anomalous")
    ]

    # Deterministic sampling
    rng = np.random.default_rng(seed)
    indices = rng.permutation(len(valid_items))[:sample_size]
    sampled = [valid_items[i] for i in indices]

    rows = []
    labels = []
    for item in sampled:
        matched = bool(item.get("ledger_matched", False))
        summary_text = (
            f"Supplier: {item.get('supplier_name') or 'UNKNOWN'}. "
            f"Invoice Total: {item.get('invoice_total_bdt') or 0} BDT. "
            f"Date: {item.get('invoice_date_formatted') or 'UNKNOWN'}. "
            f"File: {item.get('file_name')}."
        )
        rows.append({
            "receipt_id": item.get("invoice_number") or item.get("file_name", "UNKNOWN"),
            "file_name": item.get("file_name"),
            "summary_text": summary_text,
            "raw_total": item.get("invoice_total_bdt") or 0.0,
            "ledger_matched": matched,
        })
        labels.append(1 if matched else 0)

    return rows, np.array(labels, dtype=int)


class ReceiptAutoresearchEngine:
    def __init__(self, client: Optional[TypeSafeClient] = None):
        self.client = client or TypeSafeClient()

    def build_question_map(self, questions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Convert question specifications into TypeSafe System One questions dict."""
        q_map = {}
        for q in questions:
            if q["kind"] == "intensity":
                q_map[q["name"]] = self.client.score(
                    instructions=q["question"],
                    criteria=INTENSITY_LEVELS,
                )
            else:
                q_map[q["name"]] = self.client.noul(
                    instructions=q["question"],
                    criteria=PRESENCE_CRITERIA,
                )
        return q_map

    def featurize_batch(
        self,
        rows: List[Dict[str, Any]],
        questions: List[Dict[str, Any]],
    ) -> Dict[str, np.ndarray]:
        """
        Evaluate all candidate questions for each row in single parallel requests.
        Returns: { feature_name: np.ndarray(num_rows) }
        """
        q_map = self.build_question_map(questions)
        feature_columns: Dict[str, List[float]] = {q["name"]: [] for q in questions}

        for row in rows:
            state = {
                "receipt_id": row["receipt_id"],
                "text": row["summary_text"],
                "total_bdt": row["raw_total"],
            }
            res = self.client.evaluate(state=state, questions=q_map)
            answers = res.get("answers", {})

            for q in questions:
                ans = answers.get(q["name"], {})
                if q["kind"] == "intensity":
                    score_val = ans.get("score", 0.0)
                    feature_columns[q["name"]].append(float(score_val))
                else:
                    noul_val = ans.get("noul", 0.0)
                    feature_columns[q["name"]].append(float(noul_val))

        return {k: np.array(v, dtype=float) for k, v in feature_columns.items()}

    def evaluate_feature_correlations(
        self,
        feature_matrix: Dict[str, np.ndarray],
        labels: np.ndarray,
    ) -> List[Dict[str, Any]]:
        """
        Rank features by statistical correlation (point-biserial / Pearson) with ledger reconciliation status.
        """
        rankings = []
        for name, col in feature_matrix.items():
            std = float(col.std())
            if std < 0.001:
                corr = 0.0
            else:
                corr = float(np.corrcoef(col, labels)[0, 1])
                if np.isnan(corr):
                    corr = 0.0

            rankings.append({
                "name": name,
                "correlation": round(corr, 3),
                "abs_correlation": round(abs(corr), 3),
                "spread_std": round(std, 3),
                "mean_value": round(float(col.mean()), 3),
            })

        rankings.sort(key=lambda x: x["abs_correlation"], reverse=True)
        return rankings


def main():
    parser = argparse.ArgumentParser(description="Autoresearch feature discovery for Lucky Store receipts")
    parser.add_argument("--sample-size", type=int, default=20, help="Number of receipts to evaluate in discovery round")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    print(f"[*] Loading {args.sample_size} receipts from manifest joined with accounts ledger...")
    rows, labels = load_reconciliation_dataset(sample_size=args.sample_size, seed=args.seed)
    print(f"[*] Loaded {len(rows)} items (Matched: {sum(labels)}, Unmatched/Pending: {len(labels) - sum(labels)})")

    engine = ReceiptAutoresearchEngine()
    print(f"[*] Featurizing {len(rows)} items across {len(DEFAULT_CANDIDATE_QUESTIONS)} candidate TypeSafe questions...")
    features = engine.featurize_batch(rows, DEFAULT_CANDIDATE_QUESTIONS)

    print(f"[*] Computing correlation with ledger reconciliation ground truth...")
    rankings = engine.evaluate_feature_correlations(features, labels)

    print("\n" + "=" * 70)
    print("DISCOVERED FEATURE CORRELATIONS (Top Predictive Signals for Reconciliation)")
    print("=" * 70)
    print(f"{'Feature Name':<35}{'Correlation':>12}{'Spread (SD)':>14}")
    print("-" * 70)
    for r in rankings:
        print(f"{r['name']:<35}{r['correlation']:>+12.3f}{r['spread_std']:>14.3f}")
    print("=" * 70)

    # Save to JSON
    output_payload = {
        "sample_size": len(rows),
        "target_label": "ledger_matched",
        "rankings": rankings,
        "questions": DEFAULT_CANDIDATE_QUESTIONS,
    }
    OUTPUT_FEATURES_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FEATURES_JSON.write_text(json.dumps(output_payload, indent=2), encoding="utf-8")
    print(f"\n[+] Saved discovered feature rankings to {OUTPUT_FEATURES_JSON}")


if __name__ == "__main__":
    main()
