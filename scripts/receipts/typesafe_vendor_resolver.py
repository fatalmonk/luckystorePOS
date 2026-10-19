"""
Lucky Store — TypeSafe Vendor Discrepancy & Supplier Matching Resolver
Uses TypeSafe System One (Jev) 'choice' and 'noul' primitives to resolve
vendor name discrepancies between receipt images/OCR and ledger records.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.receipts.typesafe_client import TypeSafeClient

# Master list of primary suppliers for Lucky Store
KNOWN_SUPPLIERS = {
    "Unilever": "Unilever Bangladesh (Lux, Lifebuoy, Sunsilk, Wheel, Rin, Surf Excel, Closeup, Knorr, Horlicks)",
    "Nestle": "Nestlé Bangladesh (Maggi, Nescafé, Cerelac, Nido, KitKat, Munch)",
    "Square": "Square Toiletries & Consumer Products (Meril, Radhuni, Ruchi, Chashm, Jui, Kool, Supermom)",
    "Meghna": "Meghna Group of Industries / Fresh (Fresh flour, oil, sugar, drinking water, salt, spices)",
    "City_Group": "City Group / Teer (Teer soybean oil, mustard oil, atta, maida, suji, dal)",
    "Pran": "Pran-RFL Group (Pran juices, spices, confectionery, biscuits, noodles, dairy)",
    "Marico": "Marico Bangladesh (Parachute coconut oil, Saffola, Mediker, Studio X)",
    "Reckitt": "Reckitt Benckiser Bangladesh (Dettol, Harpic, Lizol, Mortein, Veet, Strepsils)",
    "ACI": "ACI Limited / ACI Pure (ACI salt, Pure spices, flour, Savlon, aerosol)",
    "Bashundhara": "Bashundhara Group (Bashundhara tissue, paper, atta, oil, noodles)",
    "Akij": "Akij Group / Akij Food & Beverage (Mojo, Frutika, Spa water, dairy, bakery)",
    "Kohinoor": "Kohinoor Chemical Company (Tibet soap, Sandal soap, Clean Master)",
    "Transcom": "Transcom Beverages (Pepsi, 7Up, Mirinda, Mountain Dew, Aquafina)",
    "Olympic": "Olympic Industries (Energy biscuit, Tip, Nutty, digestive, crackers)",
    "Local_Wholesale": "Local wholesale distributor or market trading shop (Chawkbazar, Moulvibazar, Karwan Bazar)",
    "Pending_Supplier": "Unidentifiable supplier, illegible header, or supplier not listed above",
}


class TypeSafeVendorResolver:
    def __init__(self, client: Optional[TypeSafeClient] = None):
        self.client = client or TypeSafeClient()

    def resolve_supplier(self, receipt_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate supplier identity using TypeSafe choice across known vendors,
        plus a noul check to confirm whether it matches the current ledger vendor.
        """
        state = {
            "receipt_id": receipt_data.get("receipt_id", ""),
            "ocr_supplier_text": receipt_data.get("ocr_supplier_text", ""),
            "ocr_raw_text": (receipt_data.get("ocr_raw_text") or "")[:600],
            "item_samples": receipt_data.get("line_items", [])[:8],
            "current_ledger_supplier": receipt_data.get("ledger_supplier", ""),
            "invoice_total": receipt_data.get("invoice_total"),
        }

        questions = {
            "matched_supplier": self.client.choice(
                instructions="Based on the supplier header and product items in the state, which supplier manufactured or distributed these goods?",
                criteria=KNOWN_SUPPLIERS,
            ),
            "matches_ledger": self.client.noul(
                instructions="Does the matched supplier correspond to the `current_ledger_supplier` recorded in state?",
                criteria={
                    "true": "The supplier clearly matches or is synonymous with `current_ledger_supplier`.",
                    "false": "There is a direct contradiction or mismatch with `current_ledger_supplier`.",
                },
            ),
        }

        res = self.client.evaluate(state=state, questions=questions)
        answers = res.get("answers", {})

        supplier_choice = answers.get("matched_supplier", {})
        ledger_match = answers.get("matches_ledger", {})

        chosen_supplier = supplier_choice.get("choice", "Pending_Supplier")
        confidence = supplier_choice.get("confidence", 0.0)
        prob_matches_ledger = ledger_match.get("noul", 0.0)

        return {
            "receipt_id": receipt_data.get("receipt_id"),
            "resolved_supplier": chosen_supplier,
            "confidence": round(confidence, 3),
            "probabilities": {k: round(v, 3) for k, v in supplier_choice.get("probabilities", {}).items() if v > 0.01},
            "ledger_supplier": receipt_data.get("ledger_supplier"),
            "matches_ledger_probability": round(prob_matches_ledger, 3),
            "has_contradiction": prob_matches_ledger < 0.3 if receipt_data.get("ledger_supplier") else False,
            "model": res.get("model"),
        }


def main():
    parser = argparse.ArgumentParser(description="Resolve supplier discrepancies using TypeSafe System One")
    parser.add_argument("--receipt-id", default="TEST")
    parser.add_argument("--ocr-text", required=True)
    parser.add_argument("--ledger-supplier", default="")
    args = parser.parse_args()

    resolver = TypeSafeVendorResolver()
    result = resolver.resolve_supplier({
        "receipt_id": args.receipt_id,
        "ocr_raw_text": args.ocr_text,
        "ledger_supplier": args.ledger_supplier,
    })
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
