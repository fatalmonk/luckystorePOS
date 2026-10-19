"""
Lucky Store — TypeSafe Intake Gatekeeper
Uses TypeSafe System One (Jev) to automatically screen document intake:
1. Classify document type (purchase receipt vs screenshot vs stock photo vs packaging).
2. Measure validity probability (noul).
3. Score document legibility tier (score).

Quarantines non-receipts (bKash/Nagad transfers, shelf photos, product packaging)
to prevent sequence collisions and ledger pollution.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import sys
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.receipts.typesafe_client import TypeSafeClient

# Standard rubric criteria for TypeSafe primitives
DOC_CLASS_CRITERIA = {
    "purchase_receipt": "Printed or handwritten physical cash memo, supplier bill, delivery challan, or VAT invoice with line items and BDT amounts for store procurement.",
    "payment_screenshot": "Digital screenshot of mobile banking or transfer app (e.g., bKash, Nagad, Rocket, bank SMS, or internet banking screen).",
    "stocktaking_photo": "Photo of store shelves, warehouse racks, cardboard cartons, inventory count, or shop interior without an invoice slip.",
    "product_packaging": "Close-up photo of product packaging, toothpaste tube, shampoo bottle, bar soap, barcode, or retail box without bill metadata.",
    "other_anomalous": "Unrelated personal photo, sticker, screenshot of chat messages, blank image, or non-procurement scrap.",
}

LEGIBILITY_LEVELS = [
    "Completely unreadable, extremely blurry, completely dark, or occluded text",
    "Partially readable; major fields (supplier, total, or items) are cut off, faint, or distorted",
    "Fairly clear and readable; main totals and line items can be recognized with reasonable certainty",
    "Crystal clear, high-contrast, fully sharp printed or handwritten text with zero ambiguity",
]


class TypeSafeIntakeGatekeeper:
    def __init__(self, client: Optional[TypeSafeClient] = None):
        self.client = client or TypeSafeClient()

    def build_intake_questions(self, has_image: bool = False) -> Dict[str, Any]:
        """Compose parallel TypeSafe System One questions."""
        target_ref = "the attached `receipt_image`" if has_image else "this record"
        return {
            "document_class": self.client.choice(
                instructions=f"Classify what kind of document or photo {target_ref} shows.",
                criteria=DOC_CLASS_CRITERIA,
            ),
            "is_valid_procurement_invoice": self.client.noul(
                instructions=f"Is {target_ref} an authentic supplier invoice or purchase receipt that should be booked to store accounts?",
                criteria={
                    "true": "Authentic purchase receipt or supplier delivery challan with goods and costs.",
                    "false": "Not a purchase receipt (e.g. money transfer screenshot, shelf photo, product packaging, or irrelevant picture).",
                },
            ),
            "legibility_tier": self.client.score(
                instructions=f"Rate the visual clarity and legibility of the document text in {target_ref}.",
                criteria=LEGIBILITY_LEVELS,
            ),
        }

    def evaluate_document(self, document_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a single document state via TypeSafe.
        Supports both text/metadata extraction and direct visual image evaluation.
        """
        state: Dict[str, Any] = {
            "file_name": document_info.get("file_name", ""),
            "file_size_kb": round(document_info.get("file_size_bytes", 0) / 1024, 1),
            "ocr_text": (document_info.get("ocr_raw_text") or document_info.get("ocr_text") or "")[:800],
            "detected_keywords": document_info.get("detected_keywords", []),
            "dimensions": document_info.get("dimensions", {}),
        }

        assets: Optional[Dict[str, Any]] = None
        has_image = False
        img_path = document_info.get("image_path")
        if img_path and Path(img_path).is_file():
            try:
                ref_id, asset = self.client.create_image_asset(img_path)
                state["receipt_image"] = ref_id
                assets = {ref_id: asset}
                has_image = True
            except Exception as e:
                pass

        questions = self.build_intake_questions(has_image=has_image)
        res = self.client.evaluate(state=state, questions=questions, assets=assets)
        answers = res.get("answers", {})

        doc_class_ans = answers.get("document_class", {})
        doc_class = doc_class_ans.get("choice", "other_anomalous")
        doc_class_conf = doc_class_ans.get("confidence", 0.0)

        noul_ans = answers.get("is_valid_procurement_invoice", {})
        is_valid_prob = noul_ans.get("noul", 0.0)

        score_ans = answers.get("legibility_tier", {})
        legibility_score = score_ans.get("score", 0.0)

        # Action judgment
        is_admissible = (doc_class == "purchase_receipt") and (is_valid_prob >= 0.5)
        quarantine_reason = None
        target_quarantine_folder = None

        if not is_admissible:
            if doc_class == "payment_screenshot":
                target_quarantine_folder = "data/product_photos/storefront_screenshots"
                quarantine_reason = "Mobile banking / transfer screenshot (bKash/Nagad)"
            elif doc_class == "stocktaking_photo":
                target_quarantine_folder = "data/product_photos/store_stocktaking"
                quarantine_reason = "Store shelf / inventory stocktaking photo"
            elif doc_class == "product_packaging":
                target_quarantine_folder = "data/product_photos/store_stocktaking"
                quarantine_reason = "Product packaging / retail unit photo"
            else:
                target_quarantine_folder = "data/product_photos/storefront_screenshots"
                quarantine_reason = f"Non-invoice artifact ({doc_class})"

        return {
            "file_name": document_info.get("file_name"),
            "document_class": doc_class,
            "document_class_confidence": round(doc_class_conf, 3),
            "valid_invoice_probability": round(is_valid_prob, 3),
            "legibility_score": round(legibility_score, 2),
            "is_admissible": is_admissible,
            "target_quarantine_folder": target_quarantine_folder,
            "quarantine_reason": quarantine_reason,
            "model": res.get("model"),
        }


def main():
    parser = argparse.ArgumentParser(description="TypeSafe Intake Gatekeeper for Lucky Store")
    parser.add_argument("--file", help="Path to a receipt file to evaluate")
    parser.add_argument("--ocr-text", help="Optional OCR text extracted from file", default="")
    parser.add_argument("--quarantine", action="store_true", help="Automatically move file if inadmissible")
    args = parser.parse_args()

    gatekeeper = TypeSafeIntakeGatekeeper()

    if args.file:
        p = Path(args.file)
        if not p.is_file():
            print(f"File not found: {args.file}")
            sys.exit(1)

        doc_info = {
            "file_name": p.name,
            "file_size_bytes": p.stat().st_size,
            "ocr_raw_text": args.ocr_text,
            "image_path": str(p) if p.suffix.lower() in (".jpg", ".jpeg", ".png") else None,
        }
        res = gatekeeper.evaluate_document(doc_info)
        print(json.dumps(res, indent=2))

        if args.quarantine and not res["is_admissible"] and res["target_quarantine_folder"]:
            dest_dir = Path(res["target_quarantine_folder"])
            dest_dir.mkdir(parents=True, exist_ok=True)
            target = dest_dir / p.name
            shutil.move(str(p), str(target))
            print(f"Quarantined to: {target}")


if __name__ == "__main__":
    main()
